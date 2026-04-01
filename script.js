// ============================================================
// VILLAGE WATER MANAGEMENT SYSTEM - script.js v3.0
// ระบบน้ำประปาหมู่บ้าน มาตรฐานเทศบาลตำบล / อบต.
// ============================================================

// ===== CONFIG =====
const CONFIG = {
  GAS_URL:     localStorage.getItem('gasUrl') || 'https://script.google.com/macros/s/AKfycbzlvWTOAyu8bgQph0iKH97tcGRvkVPeOw60vjmP_Y3a1WAtIgP69YQFsyY39bfj1tl4Dg/exec',
  VILLAGE_NAME: localStorage.getItem('villageName') || 'บ้านสวนสวย',
  SERVICE_FEE:  parseFloat(localStorage.getItem('serviceFee') || '30'),
  MIN_UNITS:    parseInt(localStorage.getItem('minUnits') || '0'),
  VAT_RATE:     parseFloat(localStorage.getItem('vatRate') || '0'),
  TIERS: JSON.parse(localStorage.getItem('tiers') || JSON.stringify([
    { limit: 10, rate: 5 },
    { limit: 30, rate: 8 },
    { limit: Infinity, rate: 12 }
  ])),
};

// ===== STATE =====
let state = {
  users: [],
  bills: [],
  meters: [],
  currentPage: 'dashboard',
  charts: {},
  filterPayment: 'all',
  gasConnected: false,
};

// ===== DEMO DATA (ใช้เมื่อยังไม่เชื่อมต่อ GAS) =====
const DEMO_USERS = [
  { id: 'U001', name: 'นายสมชาย ใจดี',       house: '12/1', phone: '081-234-5678', meter: 'MTR-001' },
  { id: 'U002', name: 'นางสาวมาลี สวยงาม',    house: '15/3', phone: '082-345-6789', meter: 'MTR-002' },
  { id: 'U003', name: 'นายประสิทธิ์ มั่งมี',  house: '8/2',  phone: '083-456-7890', meter: 'MTR-003' },
  { id: 'U004', name: 'นางรัตนา แก้วใส',       house: '22',   phone: '084-567-8901', meter: 'MTR-004' },
  { id: 'U005', name: 'นายอนุชา พรหมดี',       house: '5/4',  phone: '085-678-9012', meter: 'MTR-005' },
  { id: 'U006', name: 'นางสาวพิมพ์ใจ เย็นใจ', house: '33/1', phone: '086-789-0123', meter: 'MTR-006' },
  { id: 'U007', name: 'นายวิชัย รักไทย',       house: '44',   phone: '087-890-1234', meter: 'MTR-007' },
  { id: 'U008', name: 'นางลำดวน ขยันดี',       house: '9',    phone: '088-901-2345', meter: 'MTR-008' },
];
const DEMO_METERS = [
  { id: 'M001', userId: 'U001', month: '2025-03', prev: 120, curr: 145, units: 25 },
  { id: 'M002', userId: 'U002', month: '2025-03', prev:  80, curr:  92, units: 12 },
  { id: 'M003', userId: 'U003', month: '2025-03', prev: 200, curr: 235, units: 35 },
  { id: 'M004', userId: 'U004', month: '2025-03', prev:  50, curr:  58, units:  8 },
  { id: 'M005', userId: 'U005', month: '2025-03', prev: 300, curr: 328, units: 28 },
  { id: 'M006', userId: 'U006', month: '2025-03', prev: 160, curr: 172, units: 12 },
  { id: 'M007', userId: 'U007', month: '2025-03', prev:  90, curr: 107, units: 17 },
  { id: 'M008', userId: 'U008', month: '2025-03', prev: 430, curr: 452, units: 22 },
];
const DEMO_BILLS = DEMO_METERS.map(m => {
  const wf = calcWaterFee(m.units);
  const sf = CONFIG.SERVICE_FEE;
  return {
    id: 'B00' + m.id.slice(-1), userId: m.userId, month: m.month,
    prevMeter: m.prev, currMeter: m.curr, units: m.units,
    waterFee: wf, serviceFee: sf, total: wf + sf,
    status: parseInt(m.id.slice(-1)) % 3 !== 0 ? 'paid' : 'unpaid',
    paidDate: parseInt(m.id.slice(-1)) % 3 !== 0 ? '2025-03-10' : '',
  };
});

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  const session = sessionStorage.getItem('wms_user');
  if (session) startApp(session);

  const d = new Date();
  const el = document.getElementById('currentDate');
  if (el) el.textContent = d.toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric' });

  const monthStr = d.toISOString().slice(0, 7);
  ['meterMonth','billMonth','invoiceMonth'].forEach(id => {
    const e = document.getElementById(id);
    if (e) e.value = monthStr;
  });
});

// ===== AUTH =====
async function doLogin() {
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value.trim();
  if (!user || !pass) { showLoginError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'); return; }

  // ถ้ามี GAS URL → ตรวจสอบกับ backend
  if (CONFIG.GAS_URL) {
    showLoginError('กำลังตรวจสอบ...');
    const r = await callGAS('login', { user, pass });
    if (r.success) {
      sessionStorage.setItem('wms_user', user);
      document.getElementById('loginError').classList.add('hidden');
      startApp(user);
      return;
    }
  }

  // fallback: ตรวจสอบ local config
  const localUsers = { admin: 'admin1234', staff: 'staff1234' };
  if (localUsers[user] === pass) {
    sessionStorage.setItem('wms_user', user);
    startApp(user);
  } else {
    showLoginError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  }
}

function showLoginError(msg) {
  const el = document.getElementById('loginError');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function doLogout() {
  sessionStorage.removeItem('wms_user');
  document.getElementById('loginPage').classList.remove('hidden');
  document.getElementById('mainApp').classList.add('hidden');
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !document.getElementById('loginPage').classList.contains('hidden')) {
    doLogin();
  }
});

function startApp(user) {
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');
  document.getElementById('sidebarUsername').textContent = user;
  document.getElementById('avatarText').textContent = user.charAt(0).toUpperCase();

  // โหลด demo data ก่อน แล้ว sync GAS ทับ
  state.users  = [...DEMO_USERS];
  state.meters = [...DEMO_METERS];
  state.bills  = [...DEMO_BILLS];

  loadFromGAS();
  showPage('dashboard');
  loadUserDropdowns();
  updateNotifyBadge();
}

// ===== GAS COMMUNICATION =====
// ใช้ GET เสมอ เพื่อหลีกเลี่ยง CORS preflight
// URL: ?action=xxx&data={"key":"val"}
async function callGAS(action, data = {}, callback) {
  const result = await _callGASInternal(action, data);
  if (callback) callback(result);
  return result;
}

async function _callGASInternal(action, data) {
  if (!CONFIG.GAS_URL) return { success: false, error: 'ยังไม่ได้ตั้งค่า GAS URL' };
  try {
    const encoded = encodeURIComponent(JSON.stringify(data));
    const url = `${CONFIG.GAS_URL}?action=${encodeURIComponent(action)}&data=${encoded}`;
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn(`GAS [${action}] failed:`, e.message);
    return { success: false, error: e.message };
  }
}

// โหลดข้อมูลทั้งหมดจาก GAS
async function loadFromGAS() {
  if (!CONFIG.GAS_URL) return;

  // โหลดพร้อมกัน
  const [usersRes, billsRes, metersRes, settingsRes] = await Promise.all([
    callGAS('getUsers'),
    callGAS('getBills'),
    callGAS('getMeters'),
    callGAS('getSettings'),
  ]);

  if (usersRes.success && usersRes.data?.length) {
    state.users = usersRes.data;
    state.gasConnected = true;
  }
  if (billsRes.success && billsRes.data) {
    state.bills = billsRes.data;
  }
  if (metersRes.success && metersRes.data) {
    state.meters = metersRes.data;
  }
  if (settingsRes.success && settingsRes.map) {
    applySettingsFromGAS(settingsRes.map);
  }

  loadUserDropdowns();
  refreshCurrentPage();
  updateNotifyBadge();

  // แสดงสถานะ GAS
  const dot = document.querySelector('.animate-pulse');
  if (dot) {
    dot.closest('div').querySelector('span').textContent = state.gasConnected ? 'เชื่อมต่อแล้ว' : 'ออฟไลน์';
    dot.classList.toggle('bg-emerald-500', state.gasConnected);
    dot.classList.toggle('bg-amber-500', !state.gasConnected);
  }
}

// Apply settings จาก GAS มาใช้ใน CONFIG
function applySettingsFromGAS(map) {
  if (map.village_name)  { CONFIG.VILLAGE_NAME  = map.village_name; localStorage.setItem('villageName', map.village_name); }
  if (map.service_fee)   { CONFIG.SERVICE_FEE   = parseFloat(map.service_fee) || 30; localStorage.setItem('serviceFee', CONFIG.SERVICE_FEE); }
  if (map.min_units)     { CONFIG.MIN_UNITS      = parseInt(map.min_units) || 0;     localStorage.setItem('minUnits', CONFIG.MIN_UNITS); }
  if (map.vat_rate)      { CONFIG.VAT_RATE       = parseFloat(map.vat_rate) || 0;    localStorage.setItem('vatRate', CONFIG.VAT_RATE); }
  if (map.tier1_limit && map.tier1_rate && map.tier2_limit && map.tier2_rate && map.tier3_rate) {
    CONFIG.TIERS = [
      { limit: parseInt(map.tier1_limit)  || 10, rate: parseFloat(map.tier1_rate) || 5  },
      { limit: parseInt(map.tier2_limit)  || 30, rate: parseFloat(map.tier2_rate) || 8  },
      { limit: Infinity,                          rate: parseFloat(map.tier3_rate) || 12 },
    ];
    localStorage.setItem('tiers', JSON.stringify(CONFIG.TIERS));
  }
  // ป้ายชื่อหมู่บ้านใน sidebar
  const sb = document.querySelector('#sidebar .text-water-400');
  if (sb) sb.textContent = CONFIG.VILLAGE_NAME;
}

function syncData() {
  showToast('🔄 กำลังรีเฟรชข้อมูล...', 'info');
  loadFromGAS().then(() => {
    refreshCurrentPage();
    showToast('✅ รีเฟรชข้อมูลสำเร็จ', 'success');
  });
}

// ===== PAGE NAVIGATION =====
const PAGE_TITLES = {
  dashboard: ['แดชบอร์ด',        'ภาพรวมระบบน้ำประปาหมู่บ้าน'],
  users:     ['ผู้ใช้น้ำ',        'จัดการข้อมูลผู้ใช้น้ำทั้งหมด'],
  meter:     ['บันทึกมิเตอร์',    'บันทึกค่ามิเตอร์น้ำประจำเดือน'],
  billing:   ['คำนวณค่าน้ำ',     'คำนวณค่าน้ำตามอัตราขั้นบันได'],
  invoice:   ['ใบแจ้งหนี้',       'สร้างและพิมพ์ใบแจ้งหนี้'],
  payment:   ['สถานะชำระเงิน',   'ตรวจสอบและอัปเดตสถานะการชำระเงิน'],
  notify:    ['ระบบแจ้งเตือน',   'แจ้งเตือนผ่าน LINE / Telegram'],
  reports:   ['รายงาน',           'ออกรายงานและส่งออกข้อมูล'],
  settings:  ['ตั้งค่าระบบ',      'ตั้งค่าระบบและอัตราค่าน้ำ'],
};

function showPage(page) {
  document.querySelectorAll('.page-content').forEach(el => el.classList.add('hidden'));
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });

  const [title, subtitle] = PAGE_TITLES[page] || ['', ''];
  document.getElementById('pageTitle').textContent    = title;
  document.getElementById('pageSubtitle').textContent = subtitle;

  state.currentPage = page;
  refreshCurrentPage();
  if (window.innerWidth < 1024) closeSidebar();
}

function refreshCurrentPage() {
  const p = state.currentPage;
  if (p === 'dashboard') renderDashboard();
  else if (p === 'users')    renderUsersTable();
  else if (p === 'meter')    { renderMeterHistory(); }
  else if (p === 'billing')  { calcBill(); renderBillingRateTable(); }
  else if (p === 'invoice')  loadInvoices();
  else if (p === 'payment')  renderPaymentTable();
  else if (p === 'notify')   renderDebtList();
  else if (p === 'reports')  generateReport('monthly');
  else if (p === 'settings') loadSettingsForm();
}

// ===== SIDEBAR TOGGLE =====
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  if (sb.classList.contains('-translate-x-full')) {
    sb.classList.remove('-translate-x-full');
    ov.classList.remove('hidden');
  } else {
    closeSidebar();
  }
}
function closeSidebar() {
  document.getElementById('sidebar').classList.add('-translate-x-full');
  document.getElementById('sidebarOverlay').classList.add('hidden');
}

// ===== DASHBOARD =====
function renderDashboard() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthBills = state.bills.filter(b => b.month === currentMonth);
  const totalUnits = monthBills.reduce((s, b) => s + Number(b.units), 0);
  const totalRev   = monthBills.reduce((s, b) => s + Number(b.total), 0);
  const debtCount  = monthBills.filter(b => b.status === 'unpaid').length;

  animateNumber('kpiUsers',   state.users.length);
  animateNumber('kpiUsage',   totalUnits);
  animateNumber('kpiRevenue', totalRev);
  animateNumber('kpiDebt',    debtCount);

  renderRecentBills(monthBills);
  renderCharts(monthBills);
}

function animateNumber(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0, count = 0;
  const step = Math.max(1, target / 30);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = Math.round(current).toLocaleString('th-TH');
    if (current >= target || ++count > 50) { el.textContent = target.toLocaleString('th-TH'); clearInterval(timer); }
  }, 20);
}

function renderRecentBills(bills) {
  const tbody = document.getElementById('recentBillsTable');
  if (!tbody) return;
  const recent = bills.slice(0, 8);
  if (!recent.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-slate-400 text-sm">ยังไม่มีข้อมูล</td></tr>';
    return;
  }
  tbody.innerHTML = recent.map(bill => {
    const user = getUserById(bill.userId);
    return `<tr>
      <td class="px-4 py-3 font-medium text-slate-800">${user?.name || '-'}</td>
      <td class="px-4 py-3 text-slate-600 hidden sm:table-cell">${user?.house || '-'}</td>
      <td class="px-4 py-3 text-right font-mono text-slate-700">${bill.units}</td>
      <td class="px-4 py-3 text-right font-mono font-semibold text-slate-800">฿${Number(bill.total).toLocaleString()}</td>
      <td class="px-4 py-3 text-center">
        <span class="${bill.status==='paid'?'badge-paid':'badge-unpaid'}">${bill.status==='paid'?'ชำระแล้ว':'ค้างชำระ'}</span>
      </td>
    </tr>`;
  }).join('');
}

// ===== CHARTS =====
function renderCharts(bills) {
  renderBarChart(bills);
  renderDoughnutChart(bills);
  renderLineChart();
}

function renderBarChart(bills) {
  const ctx = document.getElementById('barChart');
  if (!ctx) return;
  if (state.charts.bar) state.charts.bar.destroy();
  const labels = bills.map(b => { const u = getUserById(b.userId); return u ? u.name.split(' ')[0] : b.userId; });
  const data   = bills.map(b => b.units);
  const colors = bills.map(b => b.status==='paid' ? 'rgba(16,185,129,0.8)' : 'rgba(239,68,68,0.8)');
  state.charts.bar = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label:'หน่วยน้ำ', data, backgroundColor: colors, borderRadius: 6, borderSkipped: false }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.raw} หน่วย` } } },
      scales: {
        y: { beginAtZero: true, grid: { color:'#f1f5f9' }, ticks: { font: { family:'Noto Sans Thai' } } },
        x: { grid: { display: false }, ticks: { font: { size:11, family:'Noto Sans Thai' }, maxRotation:45 } }
      }
    }
  });
}

function renderDoughnutChart(bills) {
  const ctx = document.getElementById('doughnutChart');
  if (!ctx) return;
  if (state.charts.doughnut) state.charts.doughnut.destroy();
  const paidRev   = bills.filter(b=>b.status==='paid')  .reduce((s,b)=>s+Number(b.total),0);
  const unpaidRev = bills.filter(b=>b.status==='unpaid').reduce((s,b)=>s+Number(b.total),0);
  state.charts.doughnut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['ชำระแล้ว','ค้างชำระ'],
      datasets: [{ data:[paidRev||1, unpaidRev], backgroundColor:['#10b981','#f43f5e'], borderWidth:0, hoverOffset:8 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout:'65%',
      plugins: { legend:{display:false}, tooltip:{ callbacks:{ label:c=>`฿${c.raw.toLocaleString()}` } } }
    }
  });
}

function renderLineChart() {
  const ctx = document.getElementById('lineChart');
  if (!ctx) return;
  if (state.charts.line) state.charts.line.destroy();
  const months = [], data = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0,7);
    months.push(d.toLocaleDateString('th-TH',{month:'short',year:'2-digit'}));
    data.push(state.bills.filter(b=>b.month===key).reduce((s,b)=>s+Number(b.units),0));
  }
  state.charts.line = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{ label:'หน่วยน้ำรวม', data, borderColor:'#0891b2', backgroundColor:'rgba(8,145,178,0.08)',
        tension:0.4, fill:true, pointBackgroundColor:'#0891b2', pointRadius:4, pointHoverRadius:6 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend:{ display:false } },
      scales: {
        y: { beginAtZero:true, grid:{color:'#f1f5f9'}, ticks:{font:{family:'Noto Sans Thai'}} },
        x: { grid:{display:false}, ticks:{font:{size:11,family:'Noto Sans Thai'}} }
      }
    }
  });
}

// ===== USERS =====
function renderUsersTable() {
  const tbody = document.getElementById('usersTable');
  const empty = document.getElementById('usersEmpty');
  if (!tbody) return;
  const search = document.getElementById('userSearch')?.value?.toLowerCase() || '';
  const filtered = state.users.filter(u =>
    (u.name||'').toLowerCase().includes(search) ||
    (u.house||'').toLowerCase().includes(search) ||
    (u.phone||'').includes(search) ||
    (u.meter||'').toLowerCase().includes(search)
  );
  if (!filtered.length) { tbody.innerHTML = ''; empty?.classList.remove('hidden'); return; }
  empty?.classList.add('hidden');
  tbody.innerHTML = filtered.map((u, i) => `
    <tr>
      <td class="px-4 py-3 text-slate-500 text-xs font-mono">${i+1}</td>
      <td class="px-4 py-3">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-full bg-water-100 text-water-700 flex items-center justify-center text-sm font-bold flex-shrink-0">${(u.name||'?').charAt(2)||'?'}</div>
          <div class="font-medium text-slate-800">${u.name}</div>
        </div>
      </td>
      <td class="px-4 py-3 text-slate-600 hidden md:table-cell">${u.house}</td>
      <td class="px-4 py-3 text-slate-600 hidden lg:table-cell font-mono text-sm">${u.phone}</td>
      <td class="px-4 py-3 font-mono text-sm text-slate-600 hidden md:table-cell">${u.meter}</td>
      <td class="px-4 py-3">
        <div class="flex items-center justify-center gap-2">
          <button onclick="openUserModal('${u.id}')" class="p-1.5 text-water-600 hover:bg-water-50 rounded-lg transition-all" title="แก้ไข">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button onclick="deleteUser('${u.id}')" class="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="ลบ">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </td>
    </tr>`).join('');
}

function filterUsers() { renderUsersTable(); }

function openUserModal(id = null) {
  document.getElementById('editUserId').value = id || '';
  document.getElementById('userModalTitle').textContent = id ? 'แก้ไขผู้ใช้น้ำ' : 'เพิ่มผู้ใช้น้ำ';
  if (id) {
    const u = getUserById(id);
    if (u) {
      document.getElementById('uName').value  = u.name;
      document.getElementById('uHouse').value = u.house;
      document.getElementById('uPhone').value = u.phone;
      document.getElementById('uMeter').value = u.meter;
    }
  } else {
    ['uName','uHouse','uPhone','uMeter'].forEach(f => document.getElementById(f).value = '');
  }
  document.getElementById('userModal').classList.remove('hidden');
}

async function saveUser() {
  const name  = document.getElementById('uName').value.trim();
  const house = document.getElementById('uHouse').value.trim();
  const phone = document.getElementById('uPhone').value.trim();
  const meter = document.getElementById('uMeter').value.trim();
  const editId = document.getElementById('editUserId').value;
  if (!name || !house) { showToast('⚠️ กรุณากรอกชื่อและบ้านเลขที่', 'warning'); return; }
  const userData = { name, house, phone, meter };
  if (editId) {
    const idx = state.users.findIndex(u => u.id === editId);
    if (idx > -1) state.users[idx] = { ...state.users[idx], ...userData };
    callGAS('updateUser', { id: editId, ...userData });
    showToast('✅ อัปเดตข้อมูลสำเร็จ', 'success');
  } else {
    const newUser = { id: 'U' + Date.now(), ...userData };
    state.users.push(newUser);
    callGAS('addUser', newUser);
    showToast('✅ เพิ่มผู้ใช้น้ำสำเร็จ', 'success');
  }
  closeModal('userModal');
  renderUsersTable();
  loadUserDropdowns();
}

async function deleteUser(id) {
  if (!confirm('ยืนยันการลบผู้ใช้น้ำรายนี้?')) return;
  state.users = state.users.filter(u => u.id !== id);
  callGAS('deleteUser', { id });
  renderUsersTable();
  loadUserDropdowns();
  showToast('🗑️ ลบผู้ใช้น้ำสำเร็จ', 'info');
}

// ===== METER =====
async function loadPrevMeter() {
  const userId = document.getElementById('meterUser').value;
  const month  = document.getElementById('meterMonth').value;
  if (!userId || !month) return;

  const prevMonth = getPrevMonth(month);
  let prevVal = 0;

  // ค้นหาจาก state.meters ก่อน
  const prevMeterRecord = state.meters.find(m => m.userId === userId && m.month === prevMonth);
  if (prevMeterRecord) {
    prevVal = Number(prevMeterRecord.curr) || 0;
  } else {
    // ลองหาจาก bills
    const prevBill = state.bills.find(b => b.userId === userId && b.month === prevMonth);
    if (prevBill) {
      prevVal = Number(prevBill.currMeter) || 0;
    } else if (CONFIG.GAS_URL) {
      // โหลดจาก GAS
      const r = await callGAS('getMeters', { userId, month: prevMonth });
      if (r.success && r.data?.length) {
        prevVal = Number(r.data[0].curr) || 0;
      }
    }
  }

  document.getElementById('meterPrev').value    = prevVal;
  document.getElementById('meterCurrent').value = '';
  document.getElementById('meterUnits').textContent = '0 หน่วย';
}

function calcUsage() {
  const prev  = parseFloat(document.getElementById('meterPrev').value) || 0;
  const curr  = parseFloat(document.getElementById('meterCurrent').value) || 0;
  const units = Math.max(0, curr - prev);
  document.getElementById('meterUnits').textContent = `${units} หน่วย`;
}

async function saveMeterReading() {
  const userId = document.getElementById('meterUser').value;
  const month  = document.getElementById('meterMonth').value;
  const prev   = parseFloat(document.getElementById('meterPrev').value) || 0;
  const curr   = parseFloat(document.getElementById('meterCurrent').value) || 0;

  if (!userId) { showToast('⚠️ กรุณาเลือกผู้ใช้น้ำ', 'warning'); return; }
  if (!curr)   { showToast('⚠️ กรุณากรอกค่ามิเตอร์ปัจจุบัน', 'warning'); return; }
  if (curr < prev) { showToast('⚠️ ค่ามิเตอร์ปัจจุบันต้องมากกว่าครั้งก่อน', 'warning'); return; }

  const units = curr - prev;
  const reading = { id: 'M' + Date.now(), userId, month, prev, curr, units };

  // แทนที่ record เดิม
  state.meters = state.meters.filter(m => !(m.userId === userId && m.month === month));
  state.meters.push(reading);

  const r = await callGAS('addMeter', reading);
  if (r.success || !CONFIG.GAS_URL) {
    renderMeterHistory();
    showToast('✅ บันทึกค่ามิเตอร์สำเร็จ', 'success');
    // อัปเดต dropdown ค่ามิเตอร์ใน billing
    if (state.currentPage === 'billing') calcBill();
  } else {
    showToast('❌ บันทึกไม่สำเร็จ: ' + r.error, 'error');
  }
}

function renderMeterHistory() {
  const el = document.getElementById('meterHistory');
  if (!el) return;
  const recent = [...state.meters].sort((a,b) => (b.month||'').localeCompare(a.month||'')).slice(0, 20);
  if (!recent.length) { el.innerHTML = '<div class="text-center py-8 text-slate-400 text-sm">ยังไม่มีประวัติ</div>'; return; }
  el.innerHTML = recent.map(m => {
    const u = getUserById(m.userId);
    return `<div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
      <div>
        <div class="text-sm font-medium text-slate-800">${u?.name||m.userId}</div>
        <div class="text-xs text-slate-500 font-mono">${formatMonth(m.month)} | ${m.prev} → ${m.curr}</div>
      </div>
      <div class="text-right">
        <div class="font-bold font-mono text-water-700">${m.units}</div>
        <div class="text-xs text-slate-500">หน่วย</div>
      </div>
    </div>`;
  }).join('');
}

// ===== BILLING =====
function calcBill() {
  const userId = document.getElementById('billUser')?.value;
  const month  = document.getElementById('billMonth')?.value;
  if (!userId || !month) { clearBillDisplay(); return; }

  const meterReading = state.meters.find(m => m.userId === userId && m.month === month);
  const units = meterReading ? Number(meterReading.units) : 0;

  const { waterFee, breakdown } = calcWaterFeeWithBreakdown(units);
  const serviceFee = CONFIG.SERVICE_FEE;
  const total = waterFee + serviceFee;

  document.getElementById('billUnitsDisplay').textContent = `${units} หน่วย${CONFIG.MIN_UNITS > 0 && units < CONFIG.MIN_UNITS ? ` (คิดขั้นต่ำ ${CONFIG.MIN_UNITS} หน่วย)` : ''}`;
  document.getElementById('billWaterFee').textContent     = `฿${waterFee.toFixed(2)}`;
  document.getElementById('billServiceFee').textContent   = serviceFee.toFixed(2);
  document.getElementById('billTotal').textContent        = `฿${total.toFixed(2)}`;

  // แสดง breakdown ขั้นบันได
  const bdEl = document.getElementById('billBreakdown');
  if (bdEl && breakdown.length) {
    bdEl.innerHTML = breakdown.map(t =>
      `<div class="flex justify-between text-xs text-slate-500">
        <span>${t.label}</span>
        <span class="font-mono">${t.units} × ${t.rate} = ฿${t.fee.toFixed(2)}</span>
      </div>`
    ).join('');
    bdEl.classList.remove('hidden');
  }
}

function clearBillDisplay() {
  ['billUnitsDisplay','billWaterFee','billTotal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = id === 'billWaterFee' || id === 'billTotal' ? '฿0.00' : '0 หน่วย';
  });
}

// ===== การคำนวณค่าน้ำมาตรฐานเทศบาลตำบล =====
//
// สูตรขั้นบันไดสะสม (Progressive Block Rate):
//   Tier 1: หน่วยที่ 1 ถึง tier1Limit     → rate1 บาท/หน่วย
//   Tier 2: หน่วยที่ tier1Limit+1 ถึง tier2Limit → rate2 บาท/หน่วย
//   Tier 3: หน่วยที่ tier2Limit+1 ขึ้นไป → rate3 บาท/หน่วย
//
// ตัวอย่าง: tier1=10@5฿, tier2=30@8฿, tier3=∞@12฿
//   ใช้น้ำ 35 หน่วย:
//   → 10 × 5฿ = ฿50
//   → 20 × 8฿ = ฿160  (11-30)
//   →  5 × 12฿ = ฿60  (31-35)
//   ค่าน้ำ = ฿270 + ค่าบริการ = ฿300
//
function calcWaterFee(units) {
  return calcWaterFeeWithBreakdown(units).waterFee;
}

function calcWaterFeeWithBreakdown(units) {
  const tiers   = CONFIG.TIERS;
  const minU    = CONFIG.MIN_UNITS || 0;
  const vatRate = CONFIG.VAT_RATE  || 0;

  // หน่วยที่ใช้คิดเงิน (ไม่น้อยกว่า min_units)
  const billable = Math.max(Number(units) || 0, minU);

  let fee = 0, remaining = billable, prevLimit = 0;
  const breakdown = [];

  for (const tier of tiers) {
    const bandWidth = tier.limit === Infinity ? remaining : (tier.limit - prevLimit);
    const tierUnits = Math.min(remaining, bandWidth);
    if (tierUnits <= 0) break;

    const tierFee = tierUnits * tier.rate;
    fee += tierFee;

    const rangeLabel = tier.limit === Infinity
      ? `${prevLimit + 1}+ หน่วย`
      : `${prevLimit + 1}-${tier.limit} หน่วย`;
    breakdown.push({ label: rangeLabel, units: tierUnits, rate: tier.rate, fee: tierFee });

    remaining -= tierUnits;
    prevLimit = tier.limit === Infinity ? prevLimit : tier.limit;
    if (remaining <= 0) break;
  }

  // บวก VAT
  if (vatRate > 0) {
    const vatAmt = fee * (vatRate / 100);
    breakdown.push({ label: `VAT ${vatRate}%`, units: 0, rate: 0, fee: vatAmt });
    fee += vatAmt;
  }

  return { waterFee: Math.round(fee * 100) / 100, breakdown };
}

async function createBill() {
  const userId = document.getElementById('billUser').value;
  const month  = document.getElementById('billMonth').value;
  if (!userId) { showToast('⚠️ กรุณาเลือกผู้ใช้น้ำ', 'warning'); return; }

  const meterReading = state.meters.find(m => m.userId === userId && m.month === month);
  if (!meterReading) { showToast('⚠️ ยังไม่ได้บันทึกมิเตอร์เดือนนี้', 'warning'); return; }

  const existing = state.bills.find(b => b.userId === userId && b.month === month);
  if (existing) { showToast('ℹ️ มีใบแจ้งหนี้เดือนนี้แล้ว', 'info'); return; }

  const units      = Number(meterReading.units);
  const waterFee   = calcWaterFee(units);
  const serviceFee = CONFIG.SERVICE_FEE;
  const total      = waterFee + serviceFee;

  const bill = {
    id: 'B' + Date.now(), userId, month,
    prevMeter: meterReading.prev, currMeter: meterReading.curr,
    units, waterFee, serviceFee, total, status: 'unpaid', paidDate: ''
  };

  state.bills.push(bill);
  const r = await callGAS('addBill', bill);
  if (r.success || !CONFIG.GAS_URL) {
    showToast('✅ สร้างใบแจ้งหนี้สำเร็จ', 'success');
  } else {
    showToast('⚠️ สร้างบิลในเครื่องแล้ว แต่ sync GAS ไม่สำเร็จ', 'warning');
  }
  updateNotifyBadge();
}

// สร้างบิลทั้งหมดพร้อมกัน (มาตรฐานเทศบาลตำบล)
async function createAllBills() {
  const month = document.getElementById('billMonth')?.value;
  if (!month) { showToast('⚠️ กรุณาเลือกเดือน', 'warning'); return; }

  if (!CONFIG.GAS_URL) {
    // ทำ local เมื่อไม่มี GAS
    let created = 0;
    state.meters.filter(m => m.month === month).forEach(m => {
      const existing = state.bills.find(b => b.userId === m.userId && b.month === month);
      if (existing) return;
      const units = Number(m.units);
      const waterFee = calcWaterFee(units);
      const serviceFee = CONFIG.SERVICE_FEE;
      state.bills.push({
        id: 'B' + Date.now() + Math.random().toString(36).substr(2,3),
        userId: m.userId, month,
        prevMeter: m.prev, currMeter: m.curr, units,
        waterFee, serviceFee, total: waterFee + serviceFee,
        status: 'unpaid', paidDate: ''
      });
      created++;
    });
    showToast(`✅ สร้างบิลแล้ว ${created} ราย (ไม่มี GAS)`, 'success');
    updateNotifyBadge();
    return;
  }

  showToast('⏳ กำลังสร้างบิลทั้งหมด...', 'info');
  const r = await callGAS('generateMonthlyBills', { month });
  if (r.success) {
    showToast(`✅ สร้างบิล ${r.created} ราย | มีแล้ว ${r.existing} ราย | ไม่มีมิเตอร์ ${r.noMeter} ราย`, 'success');
    // โหลดข้อมูลใหม่
    const billsRes = await callGAS('getBills');
    if (billsRes.success && billsRes.data) {
      state.bills = billsRes.data;
      updateNotifyBadge();
    }
  } else {
    showToast('❌ สร้างบิลไม่สำเร็จ: ' + r.error, 'error');
  }
}

// อัปเดตตารางแสดงอัตราค่าน้ำ (dynamic จาก CONFIG)
function renderBillingRateTable() {
  const el = document.getElementById('rateTableDynamic');
  if (!el) return;
  const tiers = CONFIG.TIERS;
  const t1 = tiers[0], t2 = tiers[1], t3 = tiers[2];
  el.innerHTML = `
    <div class="flex items-center justify-between p-3 bg-water-50 rounded-xl border border-water-100">
      <div><div class="text-sm font-semibold text-water-800">1 - ${t1.limit} หน่วย</div><div class="text-xs text-water-600">อัตราพื้นฐาน</div></div>
      <div class="font-mono font-bold text-water-700">${t1.rate} บาท/หน่วย</div>
    </div>
    <div class="flex items-center justify-between p-3 bg-sky-50 rounded-xl border border-sky-100">
      <div><div class="text-sm font-semibold text-sky-800">${t1.limit+1} - ${t2.limit} หน่วย</div><div class="text-xs text-sky-600">อัตราปกติ</div></div>
      <div class="font-mono font-bold text-sky-700">${t2.rate} บาท/หน่วย</div>
    </div>
    <div class="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
      <div><div class="text-sm font-semibold text-amber-800">${t2.limit+1} หน่วยขึ้นไป</div><div class="text-xs text-amber-600">อัตราสูง</div></div>
      <div class="font-mono font-bold text-amber-700">${t3.rate} บาท/หน่วย</div>
    </div>
    <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
      <div><div class="text-sm font-semibold text-slate-700">ค่าบริการรายเดือน</div><div class="text-xs text-slate-500">คงที่ทุกหลังคาเรือน</div></div>
      <div class="font-mono font-bold text-slate-700">${CONFIG.SERVICE_FEE} บาท/เดือน</div>
    </div>
    ${CONFIG.MIN_UNITS > 0 ? `
    <div class="flex items-center justify-between p-3 bg-violet-50 rounded-xl border border-violet-100">
      <div><div class="text-sm font-semibold text-violet-800">หน่วยขั้นต่ำ</div><div class="text-xs text-violet-600">เรียกเก็บอย่างน้อย</div></div>
      <div class="font-mono font-bold text-violet-700">${CONFIG.MIN_UNITS} หน่วย</div>
    </div>` : ''}
    ${CONFIG.VAT_RATE > 0 ? `
    <div class="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-100">
      <div><div class="text-sm font-semibold text-orange-800">VAT</div><div class="text-xs text-orange-600">ภาษีมูลค่าเพิ่ม</div></div>
      <div class="font-mono font-bold text-orange-700">${CONFIG.VAT_RATE}%</div>
    </div>` : ''}
  `;
}

// ===== INVOICE =====
function loadInvoices() {
  const month = document.getElementById('invoiceMonth')?.value;
  const grid  = document.getElementById('invoiceGrid');
  const empty = document.getElementById('invoiceEmpty');
  if (!grid) return;
  const bills = state.bills.filter(b => !month || b.month === month);
  if (!bills.length) { grid.innerHTML = ''; empty?.classList.remove('hidden'); return; }
  empty?.classList.add('hidden');
  grid.innerHTML = bills.map(bill => {
    const user = getUserById(bill.userId);
    return `<div class="invoice-card bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div class="bg-gradient-to-r from-water-600 to-water-800 p-4 text-white">
        <div class="flex justify-between items-start">
          <div>
            <div class="font-bold text-sm">${user?.name||'-'}</div>
            <div class="text-water-200 text-xs">${user?.house||'-'} | ${user?.meter||'-'}</div>
          </div>
          <span class="text-xs bg-white/20 px-2 py-1 rounded-full font-mono">${formatMonth(bill.month)}</span>
        </div>
      </div>
      <div class="p-4 space-y-2">
        <div class="flex justify-between text-sm"><span class="text-slate-500">หน่วยที่ใช้</span><span class="font-mono font-semibold">${bill.units} หน่วย</span></div>
        <div class="flex justify-between text-sm"><span class="text-slate-500">ค่าน้ำ</span><span class="font-mono">฿${Number(bill.waterFee).toFixed(2)}</span></div>
        <div class="flex justify-between text-sm"><span class="text-slate-500">ค่าบริการ</span><span class="font-mono">฿${Number(bill.serviceFee).toFixed(2)}</span></div>
        <div class="flex justify-between font-bold border-t border-slate-100 pt-2"><span>ยอดรวม</span><span class="text-water-700 font-mono text-lg">฿${Number(bill.total).toLocaleString()}</span></div>
        <div class="flex items-center justify-between">
          <span class="${bill.status==='paid'?'badge-paid':'badge-unpaid'}">${bill.status==='paid'?'ชำระแล้ว':'ค้างชำระ'}</span>
          <button onclick="showInvoiceModal('${bill.id}')" class="text-xs text-water-600 hover:text-water-800 font-medium flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            พิมพ์
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function showInvoiceModal(billId) {
  const bill = state.bills.find(b => b.id === billId);
  if (!bill) return;
  const user = getUserById(bill.userId);
  document.getElementById('invBillNo').textContent    = bill.id;
  document.getElementById('invName').textContent      = user?.name||'-';
  document.getElementById('invHouse').textContent     = user?.house||'-';
  document.getElementById('invMeter').textContent     = user?.meter||'-';
  document.getElementById('invMonth').textContent     = formatMonth(bill.month);
  document.getElementById('invPrevMeter').textContent = bill.prevMeter;
  document.getElementById('invCurrMeter').textContent = bill.currMeter;
  document.getElementById('invUnits').textContent     = `${bill.units} หน่วย`;
  document.getElementById('invWaterFee').textContent  = `฿${Number(bill.waterFee).toFixed(2)}`;
  document.getElementById('invServiceFee').textContent= `฿${Number(bill.serviceFee).toFixed(2)}`;
  document.getElementById('invTotal').textContent     = `฿${Number(bill.total).toLocaleString()}`;
  document.getElementById('invVillageName').textContent = CONFIG.VILLAGE_NAME;
  const statusEl = document.getElementById('invStatusBadge');
  statusEl.className  = bill.status === 'paid' ? 'badge-paid' : 'badge-unpaid';
  statusEl.textContent = bill.status === 'paid' ? '✓ ชำระแล้ว' : '⚠ ค้างชำระ';
  document.getElementById('invoiceModal').classList.remove('hidden');
}

function printInvoice()    { window.print(); }
function printAllInvoices(){ window.print(); }

// ===== PAYMENT =====
function renderPaymentTable() {
  const tbody = document.getElementById('paymentTable');
  if (!tbody) return;
  let bills = [...state.bills].sort((a,b) => (b.month||'').localeCompare(a.month||''));
  if (state.filterPayment === 'paid')   bills = bills.filter(b => b.status === 'paid');
  if (state.filterPayment === 'unpaid') bills = bills.filter(b => b.status === 'unpaid');
  tbody.innerHTML = bills.map(bill => {
    const user = getUserById(bill.userId);
    return `<tr>
      <td class="px-4 py-3">
        <div class="font-medium text-slate-800">${user?.name||'-'}</div>
        <div class="text-xs text-slate-400">${user?.house||''}</div>
      </td>
      <td class="px-4 py-3 text-slate-600 hidden sm:table-cell">${formatMonth(bill.month)}</td>
      <td class="px-4 py-3 text-right font-mono text-slate-700">${bill.units}</td>
      <td class="px-4 py-3 text-right font-mono font-semibold text-slate-800">฿${Number(bill.total).toLocaleString()}</td>
      <td class="px-4 py-3 text-center">
        <div class="flex flex-col items-center gap-1">
          <span class="${bill.status==='paid'?'badge-paid':'badge-unpaid'}">${bill.status==='paid'?'ชำระแล้ว':'ค้างชำระ'}</span>
          ${bill.paidDate ? `<span class="text-xs text-slate-400 font-mono">${bill.paidDate}</span>` : ''}
        </div>
      </td>
      <td class="px-4 py-3 text-center">
        <div class="flex justify-center gap-2">
          ${bill.status === 'unpaid'
            ? `<button onclick="updatePayment('${bill.id}','paid')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg font-medium transition-all">รับชำระ</button>`
            : `<button onclick="updatePayment('${bill.id}','unpaid')" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs rounded-lg font-medium transition-all">ยกเลิก</button>`
          }
          <button onclick="showInvoiceModal('${bill.id}')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-lg font-medium transition-all">ใบแจ้งหนี้</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function filterPayment(filter) {
  state.filterPayment = filter;
  document.querySelectorAll('.pay-filter').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  renderPaymentTable();
}

async function updatePayment(billId, status) {
  const idx = state.bills.findIndex(b => b.id === billId);
  if (idx === -1) return;
  state.bills[idx].status   = status;
  state.bills[idx].paidDate = status === 'paid' ? new Date().toISOString().slice(0,10) : '';
  callGAS('updatePaymentStatus', { id: billId, status, paidDate: state.bills[idx].paidDate });
  renderPaymentTable();
  updateNotifyBadge();
  showToast(status==='paid' ? '✅ บันทึกการชำระเงินสำเร็จ' : '↩️ ยกเลิกการชำระแล้ว', 'success');
}

// ===== NOTIFY =====
function renderDebtList() {
  const el = document.getElementById('debtList');
  if (!el) return;
  const debtors = state.bills.filter(b => b.status === 'unpaid');
  if (!debtors.length) { el.innerHTML = '<div class="text-center py-8 text-emerald-600 text-sm font-medium">🎉 ไม่มีลูกหนี้ค้างชำระ</div>'; return; }
  el.innerHTML = debtors.map(bill => {
    const user = getUserById(bill.userId);
    return `<div class="flex items-center justify-between p-3 bg-rose-50 rounded-xl border border-rose-100">
      <div>
        <div class="text-sm font-medium text-slate-800">${user?.name||'-'}</div>
        <div class="text-xs text-slate-500">${formatMonth(bill.month)} | ${user?.phone||'-'}</div>
      </div>
      <div class="font-bold font-mono text-rose-600">฿${Number(bill.total).toLocaleString()}</div>
    </div>`;
  }).join('');
}

function updateNotifyBadge() {
  const count = state.bills.filter(b => b.status === 'unpaid').length;
  const badge = document.getElementById('notifyBadge');
  if (!badge) return;
  if (count > 0) { badge.textContent = count; badge.classList.remove('hidden'); }
  else badge.classList.add('hidden');
}

function sendLineNotify() {
  const token = document.getElementById('lineToken').value.trim();
  if (!token) { showToast('⚠️ กรุณาใส่ LINE Token', 'warning'); return; }
  const debtors = state.bills.filter(b => b.status === 'unpaid');
  const msg = buildNotifyMessage(debtors);
  callGAS('sendLine', { token, message: msg }, r => {
    showToast(r.success ? '✅ ส่ง LINE สำเร็จ' : '❌ ส่ง LINE ไม่สำเร็จ: ' + r.error, r.success ? 'success' : 'error');
  });
  showToast('📤 กำลังส่ง LINE...', 'info');
}

function sendTelegramNotify() {
  const token  = document.getElementById('telegramToken').value.trim();
  const chatId = document.getElementById('telegramChatId').value.trim();
  if (!token || !chatId) { showToast('⚠️ กรุณาใส่ Telegram Token และ Chat ID', 'warning'); return; }
  const debtors = state.bills.filter(b => b.status === 'unpaid');
  const msg = buildNotifyMessage(debtors);
  callGAS('sendTelegram', { token, chatId, message: msg }, r => {
    showToast(r.success ? '✅ ส่ง Telegram สำเร็จ' : '❌ ส่ง Telegram ไม่สำเร็จ: ' + r.error, r.success ? 'success' : 'error');
  });
  showToast('📤 กำลังส่ง Telegram...', 'info');
}

function buildNotifyMessage(debtors) {
  const lines = [
    '💧 แจ้งเตือนค่าน้ำประปา',
    CONFIG.VILLAGE_NAME,
    '━━━━━━━━━━━━━━━━━━'
  ];
  debtors.forEach(b => {
    const u = getUserById(b.userId);
    lines.push(`👤 ${u?.name||b.userId} (บ้าน ${u?.house||'-'})`);
    lines.push(`   เดือน: ${formatMonth(b.month)} | ยอด: ฿${Number(b.total).toLocaleString()}`);
  });
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push('กรุณาชำระเงินภายในกำหนด ขอบคุณครับ/ค่ะ');
  return lines.join('\n');
}

// ===== REPORTS =====
function generateReport(type) {
  const year  = document.getElementById('reportYear')?.value || new Date().getFullYear().toString();
  const tbody = document.getElementById('reportTableBody');
  const title = document.getElementById('reportTitle');
  if (!tbody) return;
  title.textContent = type === 'monthly'
    ? `รายงานรายเดือน ปี ${parseInt(year) + 543}`
    : `รายงานรายปี`;
  if (type === 'monthly') {
    const rows = [];
    for (let m = 1; m <= 12; m++) {
      const key   = `${year}-${String(m).padStart(2,'0')}`;
      const bills = state.bills.filter(b => b.month === key);
      rows.push({
        key, count: bills.length,
        totalUnits:  bills.reduce((s,b)=>s+Number(b.units),0),
        totalRev:    bills.reduce((s,b)=>s+Number(b.total),0),
        paidRev:     bills.filter(b=>b.status==='paid')  .reduce((s,b)=>s+Number(b.total),0),
        unpaidRev:   bills.filter(b=>b.status==='unpaid').reduce((s,b)=>s+Number(b.total),0),
      });
    }
    tbody.innerHTML = rows.map(r => `<tr>
      <td class="px-4 py-3 font-medium text-slate-800">${formatMonth(r.key)}</td>
      <td class="px-4 py-3 text-right font-mono">${r.count}</td>
      <td class="px-4 py-3 text-right font-mono">${r.totalUnits.toLocaleString()}</td>
      <td class="px-4 py-3 text-right font-mono font-semibold">฿${r.totalRev.toLocaleString()}</td>
      <td class="px-4 py-3 text-right font-mono text-emerald-600">฿${r.paidRev.toLocaleString()}</td>
      <td class="px-4 py-3 text-right font-mono text-rose-500">฿${r.unpaidRev.toLocaleString()}</td>
    </tr>`).join('');
  }
}

function exportPDF() {
  showToast('📄 กำลังสร้าง PDF...', 'info');
  setTimeout(() => { window.print(); showToast('✅ พิมพ์/บันทึก PDF แล้ว', 'success'); }, 500);
}

function exportExcel() {
  const year = document.getElementById('reportYear')?.value || new Date().getFullYear().toString();
  const rows = [['เดือน','จำนวนบิล','รวมหน่วย','รายได้รวม','ชำระแล้ว','ค้างชำระ']];
  for (let m = 1; m <= 12; m++) {
    const key   = `${year}-${String(m).padStart(2,'0')}`;
    const bills = state.bills.filter(b => b.month === key);
    rows.push([
      formatMonth(key), bills.length,
      bills.reduce((s,b)=>s+Number(b.units),0),
      bills.reduce((s,b)=>s+Number(b.total),0),
      bills.filter(b=>b.status==='paid')  .reduce((s,b)=>s+Number(b.total),0),
      bills.filter(b=>b.status==='unpaid').reduce((s,b)=>s+Number(b.total),0),
    ]);
  }
  const csv  = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `รายงานน้ำประปา_${year}.csv`; a.click();
  URL.revokeObjectURL(url);
  showToast('✅ ดาวน์โหลด CSV สำเร็จ', 'success');
}

// ===== SETTINGS =====
function loadSettingsForm() {
  document.getElementById('settingVillage').value    = CONFIG.VILLAGE_NAME;
  document.getElementById('settingServiceFee').value = CONFIG.SERVICE_FEE;
  document.getElementById('settingMinUnits').value   = CONFIG.MIN_UNITS;
  document.getElementById('settingVatRate').value    = CONFIG.VAT_RATE;
  const gasUrl = localStorage.getItem('gasUrl') || '';
  document.getElementById('settingGasUrl').value = gasUrl;
  if (CONFIG.TIERS.length >= 3) {
    document.getElementById('tier1Units').value = CONFIG.TIERS[0].limit;
    document.getElementById('tier1Rate').value  = CONFIG.TIERS[0].rate;
    document.getElementById('tier2Units').value = CONFIG.TIERS[1].limit;
    document.getElementById('tier2Rate').value  = CONFIG.TIERS[1].rate;
    document.getElementById('tier3Rate').value  = CONFIG.TIERS[2].rate;
  }
}

async function saveSettings() {
  const newVillage    = document.getElementById('settingVillage').value.trim();
  const newServiceFee = parseFloat(document.getElementById('settingServiceFee').value) || 30;
  const newMinUnits   = parseInt(document.getElementById('settingMinUnits').value) || 0;
  const newVatRate    = parseFloat(document.getElementById('settingVatRate').value) || 0;
  const newGasUrl     = document.getElementById('settingGasUrl').value.trim();
  const t1u = parseInt(document.getElementById('tier1Units').value) || 10;
  const t1r = parseFloat(document.getElementById('tier1Rate').value)  || 5;
  const t2u = parseInt(document.getElementById('tier2Units').value) || 30;
  const t2r = parseFloat(document.getElementById('tier2Rate').value)  || 8;
  const t3r = parseFloat(document.getElementById('tier3Rate').value)  || 12;

  // Validate tier limits
  if (t1u >= t2u) { showToast('⚠️ หน่วยขั้นที่ 1 ต้องน้อยกว่าขั้นที่ 2', 'warning'); return; }

  CONFIG.VILLAGE_NAME = newVillage;
  CONFIG.SERVICE_FEE  = newServiceFee;
  CONFIG.MIN_UNITS    = newMinUnits;
  CONFIG.VAT_RATE     = newVatRate;
  CONFIG.GAS_URL      = newGasUrl;
  CONFIG.TIERS = [
    { limit: t1u, rate: t1r },
    { limit: t2u, rate: t2r },
    { limit: Infinity, rate: t3r },
  ];

  localStorage.setItem('villageName', CONFIG.VILLAGE_NAME);
  localStorage.setItem('serviceFee',  CONFIG.SERVICE_FEE);
  localStorage.setItem('minUnits',    CONFIG.MIN_UNITS);
  localStorage.setItem('vatRate',     CONFIG.VAT_RATE);
  localStorage.setItem('gasUrl',      CONFIG.GAS_URL);
  localStorage.setItem('tiers',       JSON.stringify(CONFIG.TIERS));

  // Sync กลับไปยัง GAS
  if (CONFIG.GAS_URL) {
    const settingsToSave = [
      ['village_name', CONFIG.VILLAGE_NAME],
      ['service_fee',  CONFIG.SERVICE_FEE],
      ['min_units',    CONFIG.MIN_UNITS],
      ['vat_rate',     CONFIG.VAT_RATE],
      ['tier1_limit',  t1u], ['tier1_rate', t1r],
      ['tier2_limit',  t2u], ['tier2_rate', t2r],
      ['tier3_rate',   t3r],
    ];
    await Promise.all(settingsToSave.map(([key, value]) => callGAS('saveSettings', { key, value })));
  }

  showToast('✅ บันทึกการตั้งค่าสำเร็จ', 'success');
}

async function initializeSheets() {
  if (!CONFIG.GAS_URL) { showToast('⚠️ กรุณาตั้งค่า GAS URL ก่อน', 'warning'); return; }
  showToast('⏳ กำลังสร้าง Google Sheets...', 'info');
  const r = await callGAS('initSheets');
  showToast(r.success ? '✅ สร้าง Sheets สำเร็จ' : '❌ ผิดพลาด: ' + r.error, r.success ? 'success' : 'error');
}

// ===== HELPERS =====
function getUserById(id) { return state.users.find(u => String(u.id) === String(id)); }

function getPrevMonth(month) {
  const [y, m] = month.split('-').map(Number);
  const prev = new Date(y, m-2, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,'0')}`;
}

function formatMonth(monthStr) {
  if (!monthStr) return '-';
  const [y, m] = monthStr.split('-').map(Number);
  const names = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  return `${names[m-1]} ${y+543}`;
}

function loadUserDropdowns() {
  ['meterUser','billUser'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const val = el.value;
    el.innerHTML = `<option value="">-- เลือกผู้ใช้น้ำ --</option>` +
      state.users.map(u => `<option value="${u.id}" ${u.id===val?'selected':''}>${u.name} (${u.house})</option>`).join('');
  });
}

function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

function showToast(msg, type = 'info') {
  const colors = { success:'bg-emerald-600', warning:'bg-amber-500', error:'bg-rose-600', info:'bg-water-600' };
  const toast = document.getElementById('toast');
  const inner = document.getElementById('toastInner');
  inner.textContent = msg;
  inner.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${colors[type]||colors.info}`;
  toast.classList.remove('hidden');
  toast.classList.add('show');
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.classList.add('hidden'), 300); }, 3500);
}

// ===== EVENT LISTENERS =====
document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', e => { if (e.target === el) closeModal(el.id); });
});

window.addEventListener('load', () => {
  // โหลด settings จาก localStorage ก่อน (เผื่อไม่มี GAS)
  const gasUrl = localStorage.getItem('gasUrl') || '';
  const el = document.getElementById('settingGasUrl');
  if (el) el.value = gasUrl;
  if (gasUrl) CONFIG.GAS_URL = gasUrl;
});
