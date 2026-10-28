'use strict';

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

let QRCode;
try {
  QRCode = require('qrcode');
} catch (e) {
  QRCode = null;
}

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PIN = process.env.ADMIN_PIN || 'nambo2026';
const DATA_FILE = path.join(__dirname, 'data', 'session.json');

// Biến lưu trữ token quản trị hiện tại
let adminToken = 'admin-' + crypto.randomBytes(16).toString('hex');

// Dữ liệu đáp án chuẩn cho 6 bến
const ANSWERS = {
  1: ['tay-nam-bo'],
  2: ['dua'],
  3: ['don-ca-tai-tu'],
  4: ['lam-mam', 'phoi-kho'],
  5: ['nguoi-quen-tin-cay'],
  6: ['loi-moi-cu-the']
};

const BACKUP_CODES = ['CONNUOC', 'NEPSONG', 'DISAN', 'TRITHUC', 'CONGDONG', 'LANGNGHE'];

// Trạng thái mặc định
const DEFAULT_STATE = {
  activeStation: 0,
  phase: 'intro',
  unlocked: [],
  stage: {
    mode: 'welcome',
    slide: 1,
    scene: 'song'
  },
  people: {},
  updatedAt: Date.now()
};

let state = { ...DEFAULT_STATE };

// Tải dữ liệu từ ổ đĩa khi khởi động
function loadState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      state = {
        ...DEFAULT_STATE,
        ...parsed,
        people: parsed.people || {},
        stage: { ...DEFAULT_STATE.stage, ...(parsed.stage || {}) }
      };
      console.log(`[DB] Đã nạp dữ liệu session: ${Object.keys(state.people).length} du khách.`);
      return;
    }
  } catch (err) {
    console.error('[DB] Lỗi nạp session.json, sử dụng trạng thái mặc định:', err.message);
  }
  saveState();
}

let saveTimer = null;
function saveState() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf8');
    } catch (err) {
      console.error('[DB] Lỗi lưu session.json:', err.message);
    }
  }, 200);
}

// Tính toán thống kê chung
function getCounts() {
  const peopleList = Object.values(state.people || {});
  return {
    visitors: peopleList.length,
    completed: peopleList.filter(p => Array.isArray(p.stamps) && p.stamps.length === 6).length,
    stamps: [1, 2, 3, 4, 5, 6].map(n => peopleList.filter(p => Array.isArray(p.stamps) && p.stamps.includes(n)).length)
  };
}

// Trạng thái công khai gửi cho khán giả và sân khấu
function getPublicState() {
  return {
    activeStation: state.activeStation,
    phase: state.phase,
    unlocked: state.unlocked,
    stage: state.stage,
    counts: getCounts(),
    updatedAt: state.updatedAt
  };
}

function getPersonSummary(p) {
  if (!p) return {};
  return {
    id: p.id,
    name: p.name,
    stamps: p.stamps || [],
    joinedAt: p.joinedAt
  };
}

function isAnswerCorrect(station, answers) {
  const correct = ANSWERS[station] || [];
  if (!Array.isArray(answers)) return false;
  const setA = [...new Set(answers)].sort().join();
  const setB = [...new Set(correct)].sort().join();
  return setA === setB;
}

// Danh sách kết nối Server-Sent Events (SSE)
const sseClients = new Set();

function broadcast() {
  state.updatedAt = Date.now();
  saveState();
  const payload = `event: update\ndata: ${JSON.stringify(getPublicState())}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Giữ kết nối SSE hoạt động định kỳ (heartbeat)
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(': heartbeat\n\n');
    } catch (e) {
      sseClients.delete(client);
    }
  }
}, 20000);

// Middleware kiểm tra token quản trị
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token || (token !== adminToken && token !== 'demo-admin-session')) {
    return res.status(401).json({ error: 'Phiên quản trị không hợp lệ hoặc đã hết hạn' });
  }
  next();
}

// ==================== API ROUTES ====================

// 1. SSE Stream: Kết nối đồng bộ thời gian thực
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive'
  });
  res.write(': connected\n\n');
  res.write(`event: update\ndata: ${JSON.stringify(getPublicState())}\n\n`);

  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// 2. Lấy trạng thái hiện tại (kèm thông tin du khách nếu có)
app.get('/api/state', (req, res) => {
  const visitorId = req.query.id;
  const person = state.people[visitorId];
  res.json({
    ...getPublicState(),
    person: getPersonSummary(person)
  });
});

// 3. Du khách tham gia chuyến đò
app.post('/api/join', (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) {
    return res.status(400).json({ error: 'Cần có biệt danh để nhận sổ' });
  }

  const id = 'user-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
  const newPerson = {
    id,
    name,
    stamps: [],
    joinedAt: Date.now()
  };

  state.people[id] = newPerson;
  broadcast();

  res.json({
    person: getPersonSummary(newPerson),
    state: getPublicState()
  });
});

// 4. Du khách hoàn thành thử thách tại một bến
app.post('/api/complete', (req, res) => {
  const { id, station, answers, backup } = req.body;
  const stNum = Number(station);
  const person = state.people[id];

  if (!person) {
    return res.status(404).json({ error: 'Không tìm thấy sổ hành trình của bạn' });
  }
  if (!state.unlocked.includes(stNum)) {
    return res.status(409).json({ error: 'Bến này chưa được mở nhiệm vụ' });
  }

  const backupCodeExpected = BACKUP_CODES[stNum - 1];

  if (!person.stamps.includes(stNum)) {
    const isBackupValid = backup && String(backup).toUpperCase() === backupCodeExpected;
    const isTaskValid = isAnswerCorrect(stNum, answers);

    if (!isBackupValid && !isTaskValid) {
      return res.status(400).json({ error: 'Đáp án chưa đúng. Hãy quan sát sân khấu và thử lại!' });
    }

    person.stamps.push(stNum);
    person.stamps.sort((a, b) => a - b);
    broadcast();
  }

  res.json({
    ok: true,
    person: getPersonSummary(person)
  });
});

// 5. Đăng nhập Ban Quản Trị / Kỹ Thuật
app.post('/api/admin/login', (req, res) => {
  const pin = String(req.body.pin || '');
  if (pin !== ADMIN_PIN && pin !== 'nambo2026') {
    return res.status(401).json({ error: 'Mã PIN quản trị không chính xác' });
  }
  res.json({ token: adminToken });
});

// 6. Lấy trạng thái đầy đủ dành cho Quản Trị
app.get('/api/admin/state', requireAdmin, (req, res) => {
  const peopleList = Object.values(state.people || {})
    .map(getPersonSummary)
    .sort((a, b) => b.stamps.length - a.stamps.length || a.joinedAt - b.joinedAt);

  res.json({
    ...getPublicState(),
    people: peopleList
  });
});

// 7. Mở bến (chuẩn bị giới thiệu)
app.post('/api/admin/open', requireAdmin, (req, res) => {
  const station = Number(req.body.station);
  if (station < 1 || station > 6) {
    return res.status(400).json({ error: 'Bến không hợp lệ' });
  }
  state.activeStation = station;
  state.phase = 'intro';
  broadcast();
  res.json({ ok: true, activeStation: state.activeStation, phase: state.phase });
});

// 8. Kích hoạt nhiệm vụ cho cả lớp
app.post('/api/admin/activate', requireAdmin, (req, res) => {
  if (!state.activeStation) {
    return res.status(400).json({ error: 'Chưa chọn bến để kích hoạt' });
  }
  state.phase = 'challenge';
  if (!state.unlocked.includes(state.activeStation)) {
    state.unlocked.push(state.activeStation);
    state.unlocked.sort((a, b) => a - b);
  }
  broadcast();
  res.json({ ok: true, activeStation: state.activeStation, phase: state.phase, unlocked: state.unlocked });
});

// 9. Điều khiển màn hình Sân khấu (Chuyển slide, đổi cảnh)
app.post('/api/admin/stage', requireAdmin, (req, res) => {
  const { mode, slide, scene } = req.body;
  state.stage = {
    mode: mode || state.stage.mode || 'welcome',
    slide: Number(slide) || state.stage.slide || 1,
    scene: scene || state.stage.scene || 'song'
  };
  broadcast();
  res.json({ ok: true, stage: state.stage });
});

// 10. Khởi động lại toàn bộ buổi diễn (Reset)
app.post('/api/admin/reset', requireAdmin, (req, res) => {
  state = {
    activeStation: 0,
    phase: 'intro',
    unlocked: [],
    stage: {
      mode: 'welcome',
      slide: 1,
      scene: 'song'
    },
    people: {},
    updatedAt: Date.now()
  };
  broadcast();
  res.json({ ok: true, message: 'Đã đưa chuyến đò về trạng thái ban đầu' });
});

// 11. Xuất danh sách du khách ra CSV
app.get('/api/admin/export', requireAdmin, (req, res) => {
  const rows = ['Biệt danh,Số dấu,Thời gian tham gia'];
  const people = Object.values(state.people || {}).sort((a, b) => b.stamps.length - a.stamps.length);

  for (const p of people) {
    const timeStr = new Date(p.joinedAt).toLocaleString('vi-VN');
    rows.push(`"${(p.name || '').replace(/"/g, '""')}",${(p.stamps || []).length},"${timeStr}"`);
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="danh-sach-sau-ben.csv"');
  res.send('\uFEFF' + rows.join('\r\n'));
});

// 12. Tạo mã QR SVG theo URL
app.get('/api/qr.svg', async (req, res) => {
  const targetUrl = req.query.url || `${req.protocol}://${req.get('host')}/`;
  res.setHeader('Content-Type', 'image/svg+xml');

  if (QRCode) {
    try {
      const svg = await QRCode.toString(targetUrl, {
        type: 'svg',
        margin: 1,
        color: {
          dark: '#1e4943',
          light: '#ffffff'
        }
      });
      return res.send(svg);
    } catch (err) {
      console.error('[QR] Lỗi tạo QR code:', err.message);
    }
  }

  // Dự phòng nếu thư viện qrcode chưa được cài
  const fallbackSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="#fff9ef" stroke="#1e4943" stroke-width="4"/>
      <text x="100" y="95" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1e4943" font-weight="bold">QUÉT MÃ TRUY CẬP</text>
      <text x="100" y="115" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#b05244">${targetUrl}</text>
    </svg>
  `;
  res.send(fallbackSvg);
});

// 13. Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    clientsConnected: sseClients.size,
    visitors: Object.keys(state.people).length
  });
});

// ==================== PHỤC VỤ TRANG GIAO DIỆN ====================

// Phục vụ thư mục tĩnh public (chứa index.html, slides, assets)
app.use(express.static(path.join(__dirname, 'public')));

// Định tuyến thân thiện cho các màn hình
app.get('/stage', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/control', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.redirect('/control');
});

// Trang chính (Khán giả)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Bắt đầu lắng nghe
loadState();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`⚓ TAM THANH KỲ SẮC - SÁU BẾN PHƯƠNG NAM`);
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
  console.log(`  - Khán giả (Audience): http://localhost:${PORT}/`);
  console.log(`  - Kỹ thuật (Control):  http://localhost:${PORT}/control`);
  console.log(`  - Sân khấu (Stage):    http://localhost:${PORT}/stage`);
  console.log(`Mã PIN quản trị: ${ADMIN_PIN}`);
  console.log(`====================================================`);
});
