// ============================================================
// VILLAGE WATER MANAGEMENT SYSTEM - FRONTEND SCRIPT
// ============================================================

// ===== CONFIG =====
const CONFIG = {
  GAS_URL: localStorage.getItem('gasUrl') || '',
  VILLAGE_NAME: localStorage.getItem('villageName') || 'บ้านสวนสวย',
  SERVICE_FEE: parseFloat(localStorage.getItem('serviceFee') || '30'),
  TIERS: JSON.parse(localStorage.getItem('tiers') || JSON.stringify([
    { limit: 10, rate: 5 },
    { limit: 30, rate: 8 },
    { limit: Infinity, rate: 12 }
  ])),
  USERS: { admin: 'admin1234', staff: 'staff1234' }
};

// ===== STATE =====
let state = {
  users: [],
  bills: [],
  meters: [],
  currentPage: 'dashboard',
  charts: {},
  filterPayment: 'all'
};

// ===== DEMO DATA =====
const DEMO_USERS = [
  { id: 'U001', name: 'นายสมชาย ใจดี', house: '12/1', phone: '081-234-5678', meter: 'MTR-001' },
  { id: 'U002', name: 'นางสาวมาลี สวยงาม', house: '15/3', phone: '082-345-6789', meter: 'MTR-002' },
  { id: 'U003', name: 'นายประสิทธิ์ มั่งมี', house: '8/2', phone: '083-456-7890', meter: 'MTR-003' },
  { id: 'U004', name: 'นางรัตนา แก้วใส', house: '22', phone: '084-567-8901', meter: 'MTR-004' },
  { id: 'U005', name: 'นายอนุชา พรหมดี', house: '5/4', phone: '085-678-9012', meter: 'MTR-005' },
  { id: 'U006', name: 'นางสาวพิมพ์ใจ เย็นใจ', house: '33/1', phone: '086-789-0123', meter: 'MTR-006' },
  { id: 'U007', name: 'นายวิชัย รักไทย', house: '44', phone: '087-890-1234', meter: 'MTR-007' },
  { id: 'U008', name: 'นางลำดวน ขยันดี', house: '9', phone: '088-901-2345', meter: 'MTR-008' },
];

const DEMO_BILLS = [
  { id: 'B001', userId: 'U001', month: '2025-03', prevMeter: 120, currMeter: 145, units: 25, waterFee: 170, serviceFee: 30, total: 200, status: 'paid', paidDate: '2025-03-05' },
  { id: 'B002', userId: 'U002', month: '2025-03', prevMeter: 80, currMeter: 92, units: 12, waterFee: 66, serviceFee: 30, total: 96, status: 'paid', paidDate: '2025-03-07' },
  { id: 'B003', userId: 'U003', month: '2025-03', prevMeter: 200, currMeter: 235, units: 35, waterFee: 290, serviceFee: 30, total: 320, status: 'unpaid', paidDate: '' },
  { id: 'B004', userId: 'U004', month: '2025-03', prevMeter: 50, currMeter: 58, units: 8, waterFee: 40, serviceFee: 30, total: 70, status: 'paid', paidDate: '2025-03-08' },
  { id: 'B005', userId: 'U005', month: '2025-03', prevMeter: 300, currMeter: 328, units: 28, waterFee: 214, serviceFee: 30, total: 244, status: 'unpaid', paidDate: '' },
  { id: 'B006', userId: 'U006', month: '2025-03', prevMeter: 160, currMeter: 172, units: 12, waterFee: 66, serviceFee: 30, total: 96, status: 'paid', paidDate: '2025-03-10' },
  { id: 'B007', userId: 'U007', month: '2025-03', prevMeter: 90, currMeter: 107, units: 17, waterFee: 106, serviceFee: 30, total: 136, status: 'unpaid', paidDate: '' },
  { id: 'B008', userId: 'U008', month: '2025-03', prevMeter: 430, currMeter: 452, units: 22, waterFee: 146, serviceFee: 30, total: 176, status: 'paid', paidDate: '2025-03-12' },
  // Previous months
  { id: 'B009', userId: 'U001', month: '2025-02', prevMeter: 98, currMeter: 120, units: 22, waterFee: 146, serviceFee: 30, total: 176, status: 'paid', paidDate: '2025-02-05' },
  { id: 'B010', userId: 'U002', month: '2025-02', prevMeter: 65, currMeter: 80, units: 15, waterFee: 90, serviceFee: 30, total: 120, status: 'paid', paidDate: '2025-02-07' },
  { id: 'B011', userId: 'U003', month: '2025-02', prevMeter: 175, currMeter: 200, units: 25, waterFee: 170, serviceFee: 30, total: 200, status: 'paid', paidDate: '2025-02-09' },
  { id: 'B012', userId: 'U004', month: '2025-02', prevMeter: 42, currMeter: 50, units: 8, waterFee: 40, serviceFee: 30, total: 70, status: 'paid', paidDate: '2025-02-10' },
];

const DEMO_METERS = [
  { id: 'M001', userId: 'U001', month: '2025-03', prev: 120, curr: 145, units: 25 },
  { id: 'M002', userId: 'U002', month: '2025-03', prev: 80, curr: 92, units: 12 },
  { id: 'M003', userId: 'U003', month: '2025-03', prev: 200, curr: 235, units: 35 },
];

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  // Check session
  const session = sessionStorage.getItem('wms_user');
  if (session) {
    startApp(session);
  }
  // Set current date
  const d = new Date();
  const el = document.getElementById('currentDate');
  if (el) el.textContent = d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  // Set default months
  const monthStr = d.toISOString().slice(0, 7);
  ['meterMonth', 'billMonth', 'invoiceMonth'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = monthStr;
  });
});

// ===== AUTH =====
function doLogin() {
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value.trim();
  const errEl = document.getElementById('loginError');

  if (!user || !pass) { showLoginError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'); return; }

  const validPass = CONFIG.USERS[user];
  if (validPass && validPass === pass) {
    sessionStorage.setItem('wms_user', user);
    errEl.classList.add('hidden');
    startApp(user);
  } else {
    // Try GAS
    if (CONFIG.GAS_URL) {
      callGAS('login', { user, pass }, r => {
        if (r.success) { sessionStorage.setItem('wms_user', user); startApp(user); }
        else showLoginError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      });
    } else {
      showLoginError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
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

// Allow Enter key on login
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
  state.users = [...DEMO_USERS];
  state.bills = [...DEMO_BILLS];
  state.meters = [...DEMO_METERS];
  loadFromGAS();
  showPage('dashboard');
  loadUserDropdowns();
  updateNotifyBadge();
}

// ===== GAS COMMUNICATION =====
async function callGAS(action, data = {}, callback) {
  if (!CONFIG.GAS_URL) { if (callback) callback({ success: false, error: 'No GAS URL' }); return; }
  try {
    const url = `${CONFIG.GAS_URL}?action=${action}`;
    const res = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    });
    const json = await res.json();
    if (callback) callback(json);
  } catch (e) {
    console.warn('GAS call failed:', e);
    if (callback) callback({ success: false, error: e.message });
  }
}

function loadFromGAS() {
  if (!CONFIG.GAS_URL) return;
  callGAS('getUsers', {}, r => { if (r.success && r.data) { state.users = r.data; loadUserDropdowns(); renderUsersTable(); } });
  callGAS('getBills', {}, r => { if (r.success && r.data) { state.bills = r.data; } });
}

function syncData() {
  showToast('🔄 กำลังรีเฟรชข้อมูล...', 'info');
  loadFromGAS();
  setTimeout(() => {
    refreshCurrentPage();
    showToast('✅ รีเฟรชข้อมูลสำเร็จ', 'success');
  }, 800);
}

// ===== PAGE NAVIGATION =====
const PAGE_TITLES = {
  dashboard: ['แดชบอร์ด', 'ภาพรวมระบบน้ำประปาหมู่บ้าน'],
  users: ['ผู้ใช้น้ำ', 'จัดการข้อมูลผู้ใช้น้ำทั้งหมด'],
  meter: ['บันทึกมิเตอร์', 'บันทึกค่ามิเตอร์น้ำประจำเดือน'],
  billing: ['คำนวณค่าน้ำ', 'คำนวณค่าน้ำตามอัตราขั้นบันได'],
  invoice: ['ใบแจ้งหนี้', 'สร้างและพิมพ์ใบแจ้งหนี้'],
  payment: ['สถานะชำระเงิน', 'ตรวจสอบและอัปเดตสถานะการชำระเงิน'],
  notify: ['ระบบแจ้งเตือน', 'แจ้งเตือนผ่าน LINE / Telegram'],
  reports: ['รายงาน', 'ออกรายงานและส่งออกข้อมูล'],
  settings: ['ตั้งค่าระบบ', 'ตั้งค่าระบบและอัตราค่าน้ำ'],
};

function showPage(page) {
  document.querySelectorAll('.page-content').forEach(el => el.classList.add('hidden'));
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });

  const [title, subtitle] = PAGE_TITLES[page] || ['', ''];
  document.getElementById('pageTitle').textContent = title;
  document.getElementById('pageSubtitle').textContent = subtitle;

  state.currentPage = page;
  refreshCurrentPage();

  // Close sidebar on mobile
  if (window.innerWidth < 1024) closeSidebar();
}

function refreshCurrentPage() {
  const p = state.currentPage;
  if (p === 'dashboard') renderDashboard();
  else if (p === 'users') renderUsersTable();
  else if (p === 'meter') { renderMeterHistory(); }
  else if (p === 'invoice') loadInvoices();
  else if (p === 'payment') renderPaymentTable();
  else if (p === 'notify') renderDebtList();
  else if (p === 'reports') generateReport('monthly');
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
  const totalUnits = monthBills.reduce((s, b) => s + b.units, 0);
  const totalRev = monthBills.reduce((s, b) => s + b.total, 0);
  const debtCount = monthBills.filter(b => b.status === 'unpaid').length;

  animateNumber('kpiUsers', state.users.length);
  animateNumber('kpiUsage', totalUnits);
  animateNumber('kpiRevenue', totalRev);
  animateNumber('kpiDebt', debtCount);

  renderRecentBills(monthBills);
  renderCharts(monthBills);
}

function animateNumber(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step = target / 30;
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = Math.round(current).toLocaleString('th-TH');
    if (current >= target) clearInterval(timer);
  }, 20);
}

function renderRecentBills(bills) {
  const tbody = document.getElementById('recentBillsTable');
  if (!tbody) return;
  const recent = bills.slice(0, 8);
  if (!recent.length) { tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-slate-400 text-sm">ยังไม่มีข้อมูล</td></tr>'; return; }
  tbody.innerHTML = recent.map(bill => {
    const user = getUserById(bill.userId);
    return `<tr>
      <td class="px-4 py-3 font-medium text-slate-800">${user?.name || '-'}</td>
      <td class="px-4 py-3 text-slate-600 hidden sm:table-cell">${user?.house || '-'}</td>
      <td class="px-4 py-3 text-right font-mono text-slate-700">${bill.units}</td>
      <td class="px-4 py-3 text-right font-mono font-semibold text-slate-800">฿${bill.total.toLocaleString()}</td>
      <td class="px-4 py-3 text-center">
        <span class="${bill.status === 'paid' ? 'badge-paid' : 'badge-unpaid'}">${bill.status === 'paid' ? 'ชำระแล้ว' : 'ค้างชำระ'}</span>
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

  const labels = bills.map(b => {
    const u = getUserById(b.userId);
    return u ? u.name.split(' ')[0] : b.userId;
  });
  const data = bills.map(b => b.units);
  const colors = bills.map(b => b.status === 'paid' ? 'rgba(16,185,129,0.8)' : 'rgba(239,68,68,0.8)');

  state.charts.bar = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'หน่วยน้ำ', data, backgroundColor: colors, borderRadius: 6, borderSkipped: false }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.raw} หน่วย` } } },
      scales: {
        y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Noto Sans Thai' } } },
        x: { grid: { display: false }, ticks: { font: { size: 11, family: 'Noto Sans Thai' }, maxRotation: 45 } }
      }
    }
  });
}

function renderDoughnutChart(bills) {
  const ctx = document.getElementById('doughnutChart');
  if (!ctx) return;
  if (state.charts.doughnut) state.charts.doughnut.destroy();

  const paidRev = bills.filter(b => b.status === 'paid').reduce((s, b) => s + b.total, 0);
  const unpaidRev = bills.filter(b => b.status === 'unpaid').reduce((s, b) => s + b.total, 0);

  state.charts.doughnut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['ชำระแล้ว', 'ค้างชำระ'],
      datasets: [{ data: [paidRev || 1, unpaidRev], backgroundColor: ['#10b981', '#f43f5e'], borderWidth: 0, hoverOffset: 8 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '65%',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `฿${ctx.raw.toLocaleString()}` } } }
    }
  });
}

function renderLineChart() {
  const ctx = document.getElementById('lineChart');
  if (!ctx) return;
  if (state.charts.line) state.charts.line.destroy();

  const months = [];
  const data = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
    months.push(label);
    const total = state.bills.filter(b => b.month === key).reduce((s, b) => s + b.units, 0);
    data.push(total || Math.floor(Math.random() * 200 + 150));
  }

  state.charts.line = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'หน่วยน้ำรวม',
        data,
        borderColor: '#0891b2',
        backgroundColor: 'rgba(8,145,178,0.08)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#0891b2',
        pointRadius: 4,
        pointHoverRadius: 6,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Noto Sans Thai' } } },
        x: { grid: { display: false }, ticks: { font: { size: 11, family: 'Noto Sans Thai' } } }
      }
    }
  });
}

// ===== USER MANAGEMENT =====
function renderUsersTable(filter = '') {
  const tbody = document.getElementById('usersTable');
  const empty = document.getElementById('usersEmpty');
  if (!tbody) return;

  const search = filter || document.getElementById('userSearch')?.value?.toLowerCase() || '';
  const filtered = state.users.filter(u =>
    u.name.toLowerCase().includes(search) ||
    u.house.toLowerCase().includes(search) ||
    u.phone.includes(search) ||
    u.meter.toLowerCase().includes(search)
  );

  if (!filtered.length) { tbody.innerHTML = ''; empty?.classList.remove('hidden'); return; }
  empty?.classList.add('hidden');

  tbody.innerHTML = filtered.map((u, i) => `
    <tr>
      <td class="px-4 py-3 text-slate-500 text-xs font-mono">${i + 1}</td>
      <td class="px-4 py-3">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-full bg-water-100 text-water-700 flex items-center justify-center text-sm font-bold flex-shrink-0">${u.name.charAt(2)}</div>
          <div><div class="font-medium text-slate-800">${u.name}</div></div>
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
      document.getElementById('uName').value = u.name;
      document.getElementById('uHouse').value = u.house;
      document.getElementById('uPhone').value = u.phone;
      document.getElementById('uMeter').value = u.meter;
    }
  } else {
    ['uName', 'uHouse', 'uPhone', 'uMeter'].forEach(f => document.getElementById(f).value = '');
  }
  document.getElementById('userModal').classList.remove('hidden');
}

function saveUser() {
  const name = document.getElementById('uName').value.trim();
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
  updateNotifyBadge();
}

function deleteUser(id) {
  if (!confirm('ยืนยันการลบผู้ใช้น้ำรายนี้?')) return;
  state.users = state.users.filter(u => u.id !== id);
  callGAS('deleteUser', { id });
  renderUsersTable();
  loadUserDropdowns();
  showToast('🗑️ ลบผู้ใช้น้ำสำเร็จ', 'info');
}

// ===== METER =====
function loadPrevMeter() {
  const userId = document.getElementById('meterUser').value;
  const month = document.getElementById('meterMonth').value;
  if (!userId || !month) return;

  const prevMonth = getPrevMonth(month);
  const prevBill = state.bills.find(b => b.userId === userId && b.month === prevMonth);
  const prevMeter = prevBill ? prevBill.currMeter : 0;
  document.getElementById('meterPrev').value = prevMeter;
  document.getElementById('meterCurrent').value = '';
  document.getElementById('meterUnits').textContent = '0 หน่วย';
}

function calcUsage() {
  const prev = parseFloat(document.getElementById('meterPrev').value) || 0;
  const curr = parseFloat(document.getElementById('meterCurrent').value) || 0;
  const units = Math.max(0, curr - prev);
  document.getElementById('meterUnits').textContent = `${units} หน่วย`;
}

function saveMeterReading() {
  const userId = document.getElementById('meterUser').value;
  const month = document.getElementById('meterMonth').value;
  const prev = parseFloat(document.getElementById('meterPrev').value) || 0;
  const curr = parseFloat(document.getElementById('meterCurrent').value) || 0;

  if (!userId) { showToast('⚠️ กรุณาเลือกผู้ใช้น้ำ', 'warning'); return; }
  if (!curr || curr <= prev) { showToast('⚠️ ค่ามิเตอร์ไม่ถูกต้อง', 'warning'); return; }

  const units = curr - prev;
  const reading = { id: 'M' + Date.now(), userId, month, prev, curr, units };
  state.meters = state.meters.filter(m => !(m.userId === userId && m.month === month));
  state.meters.push(reading);

  callGAS('addMeter', reading);
  renderMeterHistory();
  showToast('✅ บันทึกค่ามิเตอร์สำเร็จ', 'success');
}

function renderMeterHistory() {
  const el = document.getElementById('meterHistory');
  if (!el) return;
  const recent = [...state.meters].reverse().slice(0, 10);
  if (!recent.length) { el.innerHTML = '<div class="text-center py-8 text-slate-400 text-sm">ยังไม่มีประวัติ</div>'; return; }
  el.innerHTML = recent.map(m => {
    const u = getUserById(m.userId);
    return `<div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
      <div>
        <div class="text-sm font-medium text-slate-800">${u?.name || m.userId}</div>
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
  const userId = document.getElementById('billUser').value;
  const month = document.getElementById('billMonth').value;
  if (!userId || !month) return;

  const meterReading = state.meters.find(m => m.userId === userId && m.month === month);
  const units = meterReading ? meterReading.units : 0;
  const waterFee = calcWaterFee(units);
  const serviceFee = CONFIG.SERVICE_FEE;
  const total = waterFee + serviceFee;

  document.getElementById('billUnitsDisplay').textContent = `${units} หน่วย`;
  document.getElementById('billWaterFee').textContent = `฿${waterFee.toFixed(2)}`;
  document.getElementById('billServiceFee').textContent = serviceFee.toFixed(2);
  document.getElementById('billTotal').textContent = `฿${total.toFixed(2)}`;
}

function calcWaterFee(units) {
  const tiers = CONFIG.TIERS;
  let fee = 0, remaining = units;
  let prevLimit = 0;
  for (const tier of tiers) {
    const tierUnits = Math.min(remaining, (tier.limit === Infinity ? Infinity : tier.limit - prevLimit));
    if (tierUnits <= 0) break;
    fee += tierUnits * tier.rate;
    remaining -= tierUnits;
    prevLimit = tier.limit;
    if (remaining <= 0) break;
  }
  return fee;
}

function createBill() {
  const userId = document.getElementById('billUser').value;
  const month = document.getElementById('billMonth').value;
  if (!userId) { showToast('⚠️ กรุณาเลือกผู้ใช้น้ำ', 'warning'); return; }

  const meterReading = state.meters.find(m => m.userId === userId && m.month === month);
  if (!meterReading) { showToast('⚠️ ยังไม่มีการบันทึกมิเตอร์เดือนนี้', 'warning'); return; }

  const existing = state.bills.find(b => b.userId === userId && b.month === month);
  if (existing) { showToast('ℹ️ มีใบแจ้งหนี้เดือนนี้แล้ว', 'info'); return; }

  const units = meterReading.units;
  const waterFee = calcWaterFee(units);
  const serviceFee = CONFIG.SERVICE_FEE;
  const total = waterFee + serviceFee;

  const bill = {
    id: 'B' + Date.now(), userId, month,
    prevMeter: meterReading.prev, currMeter: meterReading.curr,
    units, waterFee, serviceFee, total, status: 'unpaid', paidDate: ''
  };

  state.bills.push(bill);
  callGAS('addBill', bill);
  showToast('✅ สร้างใบแจ้งหนี้สำเร็จ', 'success');
  updateNotifyBadge();
}

// ===== INVOICE =====
function loadInvoices() {
  const month = document.getElementById('invoiceMonth')?.value;
  const grid = document.getElementById('invoiceGrid');
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
            <div class="font-bold text-sm">${user?.name || '-'}</div>
            <div class="text-water-200 text-xs">${user?.house || '-'} | ${user?.meter || '-'}</div>
          </div>
          <span class="text-xs bg-white/20 px-2 py-1 rounded-full font-mono">${formatMonth(bill.month)}</span>
        </div>
      </div>
      <div class="p-4 space-y-2">
        <div class="flex justify-between text-sm"><span class="text-slate-500">หน่วยที่ใช้</span><span class="font-mono font-semibold">${bill.units} หน่วย</span></div>
        <div class="flex justify-between text-sm"><span class="text-slate-500">ค่าน้ำ</span><span class="font-mono">฿${bill.waterFee?.toFixed(2) || '0.00'}</span></div>
        <div class="flex justify-between text-sm"><span class="text-slate-500">ค่าบริการ</span><span class="font-mono">฿${bill.serviceFee?.toFixed(2) || '0.00'}</span></div>
        <div class="flex justify-between font-bold border-t border-slate-100 pt-2"><span>ยอดรวม</span><span class="text-water-700 font-mono text-lg">฿${bill.total?.toLocaleString() || '0'}</span></div>
        <div class="flex items-center justify-between">
          <span class="${bill.status === 'paid' ? 'badge-paid' : 'badge-unpaid'}">${bill.status === 'paid' ? 'ชำระแล้ว' : 'ค้างชำระ'}</span>
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

  document.getElementById('invBillNo').textContent = bill.id;
  document.getElementById('invName').textContent = user?.name || '-';
  document.getElementById('invHouse').textContent = user?.house || '-';
  document.getElementById('invMeter').textContent = user?.meter || '-';
  document.getElementById('invMonth').textContent = formatMonth(bill.month);
  document.getElementById('invPrevMeter').textContent = bill.prevMeter;
  document.getElementById('invCurrMeter').textContent = bill.currMeter;
  document.getElementById('invUnits').textContent = `${bill.units} หน่วย`;
  document.getElementById('invWaterFee').textContent = `฿${bill.waterFee?.toFixed(2) || '0.00'}`;
  document.getElementById('invServiceFee').textContent = `฿${bill.serviceFee?.toFixed(2) || '0.00'}`;
  document.getElementById('invTotal').textContent = `฿${bill.total?.toLocaleString() || '0'}`;
  document.getElementById('invVillageName').textContent = CONFIG.VILLAGE_NAME;
  const statusEl = document.getElementById('invStatusBadge');
  statusEl.className = bill.status === 'paid' ? 'badge-paid' : 'badge-unpaid';
  statusEl.textContent = bill.status === 'paid' ? '✓ ชำระแล้ว' : '⚠ ค้างชำระ';

  document.getElementById('invoiceModal').classList.remove('hidden');
}

function printInvoice() { window.print(); }
function printAllInvoices() { window.print(); }

// ===== PAYMENT =====
function renderPaymentTable() {
  const tbody = document.getElementById('paymentTable');
  if (!tbody) return;

  let bills = [...state.bills].sort((a, b) => b.month.localeCompare(a.month));
  if (state.filterPayment === 'paid') bills = bills.filter(b => b.status === 'paid');
  else if (state.filterPayment === 'unpaid') bills = bills.filter(b => b.status === 'unpaid');

  tbody.innerHTML = bills.map(bill => {
    const user = getUserById(bill.userId);
    return `<tr>
      <td class="px-4 py-3">
        <div class="font-medium text-slate-800">${user?.name || '-'}</div>
        <div class="text-xs text-slate-400">${user?.house || ''}</div>
      </td>
      <td class="px-4 py-3 text-slate-600 hidden sm:table-cell">${formatMonth(bill.month)}</td>
      <td class="px-4 py-3 text-right font-mono text-slate-700">${bill.units}</td>
      <td class="px-4 py-3 text-right font-mono font-semibold text-slate-800">฿${bill.total?.toLocaleString()}</td>
      <td class="px-4 py-3 text-center">
        <div class="flex flex-col items-center gap-1">
          <span class="${bill.status === 'paid' ? 'badge-paid' : 'badge-unpaid'}">${bill.status === 'paid' ? 'ชำระแล้ว' : 'ค้างชำระ'}</span>
          ${bill.paidDate ? `<span class="text-xs text-slate-400 font-mono">${bill.paidDate}</span>` : ''}
        </div>
      </td>
      <td class="px-4 py-3 text-center">
        <div class="flex justify-center gap-2">
          ${bill.status === 'unpaid'
            ? `<button onclick="updatePayment('${bill.id}', 'paid')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg font-medium transition-all">รับชำระ</button>`
            : `<button onclick="updatePayment('${bill.id}', 'unpaid')" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs rounded-lg font-medium transition-all">ยกเลิก</button>`
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

function updatePayment(billId, status) {
  const idx = state.bills.findIndex(b => b.id === billId);
  if (idx === -1) return;
  state.bills[idx].status = status;
  state.bills[idx].paidDate = status === 'paid' ? new Date().toISOString().slice(0, 10) : '';
  callGAS('updatePaymentStatus', { id: billId, status, paidDate: state.bills[idx].paidDate });
  renderPaymentTable();
  updateNotifyBadge();
  showToast(status === 'paid' ? '✅ บันทึกการชำระเงินสำเร็จ' : '↩️ ยกเลิกการชำระแล้ว', 'success');
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
        <div class="text-sm font-medium text-slate-800">${user?.name || '-'}</div>
        <div class="text-xs text-slate-500">${formatMonth(bill.month)} | ${user?.phone || '-'}</div>
      </div>
      <div class="font-bold font-mono text-rose-600">฿${bill.total?.toLocaleString()}</div>
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
    showToast(r.success ? '✅ ส่ง LINE สำเร็จ' : '❌ ส่ง LINE ไม่สำเร็จ', r.success ? 'success' : 'error');
  });
  showToast('📤 กำลังส่ง LINE...', 'info');
}

function sendTelegramNotify() {
  const token = document.getElementById('telegramToken').value.trim();
  const chatId = document.getElementById('telegramChatId').value.trim();
  if (!token || !chatId) { showToast('⚠️ กรุณาใส่ Telegram Token และ Chat ID', 'warning'); return; }
  const debtors = state.bills.filter(b => b.status === 'unpaid');
  const msg = buildNotifyMessage(debtors);
  callGAS('sendTelegram', { token, chatId, message: msg }, r => {
    showToast(r.success ? '✅ ส่ง Telegram สำเร็จ' : '❌ ส่ง Telegram ไม่สำเร็จ', r.success ? 'success' : 'error');
  });
  showToast('📤 กำลังส่ง Telegram...', 'info');
}

function buildNotifyMessage(debtors) {
  const lines = ['📢 แจ้งเตือนค่าน้ำประปา ' + CONFIG.VILLAGE_NAME, '================================'];
  debtors.forEach(b => {
    const u = getUserById(b.userId);
    lines.push(`👤 ${u?.name || b.userId}`);
    lines.push(`   เดือน: ${formatMonth(b.month)} | ยอด: ฿${b.total?.toLocaleString()}`);
  });
  lines.push('================================');
  lines.push('กรุณาชำระเงินภายในกำหนด ขอบคุณครับ/ค่ะ');
  return lines.join('\n');
}

// ===== REPORTS =====
function generateReport(type) {
  const year = document.getElementById('reportYear')?.value || '2025';
  const tbody = document.getElementById('reportTableBody');
  const title = document.getElementById('reportTitle');
  if (!tbody) return;

  title.textContent = type === 'monthly' ? `รายงานรายเดือน ปี ${parseInt(year) + 543}` : `รายงานรายปี`;

  if (type === 'monthly') {
    const months = [];
    for (let m = 1; m <= 12; m++) {
      const key = `${year}-${String(m).padStart(2, '0')}`;
      const bills = state.bills.filter(b => b.month === key);
      const totalUnits = bills.reduce((s, b) => s + b.units, 0);
      const totalRev = bills.reduce((s, b) => s + b.total, 0);
      const paidRev = bills.filter(b => b.status === 'paid').reduce((s, b) => s + b.total, 0);
      const unpaidRev = bills.filter(b => b.status === 'unpaid').reduce((s, b) => s + b.total, 0);
      months.push({ key, bills: bills.length, totalUnits, totalRev, paidRev, unpaidRev });
    }
    tbody.innerHTML = months.map(m => `<tr>
      <td class="px-4 py-3 font-medium text-slate-800">${formatMonth(m.key)}</td>
      <td class="px-4 py-3 text-right font-mono">${m.bills}</td>
      <td class="px-4 py-3 text-right font-mono">${m.totalUnits}</td>
      <td class="px-4 py-3 text-right font-mono font-semibold">฿${m.totalRev.toLocaleString()}</td>
      <td class="px-4 py-3 text-right font-mono text-emerald-600">฿${m.paidRev.toLocaleString()}</td>
      <td class="px-4 py-3 text-right font-mono text-rose-500">฿${m.unpaidRev.toLocaleString()}</td>
    </tr>`).join('');
  }
}

function exportPDF() {
  showToast('📄 กำลังสร้าง PDF...', 'info');
  setTimeout(() => { window.print(); showToast('✅ ดาวน์โหลด PDF สำเร็จ', 'success'); }, 500);
}

function exportExcel() {
  const year = document.getElementById('reportYear')?.value || '2025';
  const rows = [['เดือน', 'จำนวนบิล', 'รวมหน่วย', 'รายได้รวม', 'ชำระแล้ว', 'ค้างชำระ']];
  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${String(m).padStart(2, '0')}`;
    const bills = state.bills.filter(b => b.month === key);
    rows.push([
      formatMonth(key), bills.length,
      bills.reduce((s, b) => s + b.units, 0),
      bills.reduce((s, b) => s + b.total, 0),
      bills.filter(b => b.status === 'paid').reduce((s, b) => s + b.total, 0),
      bills.filter(b => b.status === 'unpaid').reduce((s, b) => s + b.total, 0),
    ]);
  }
  const csv = rows.map(r => r.join(',')).join('\n');
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `รายงานน้ำประปา_${year}.csv`; a.click();
  URL.revokeObjectURL(url);
  showToast('✅ ดาวน์โหลด Excel/CSV สำเร็จ', 'success');
}

// ===== SETTINGS =====
function saveSettings() {
  CONFIG.VILLAGE_NAME = document.getElementById('settingVillage').value;
  CONFIG.SERVICE_FEE = parseFloat(document.getElementById('settingServiceFee').value) || 30;
  CONFIG.GAS_URL = document.getElementById('settingGasUrl').value.trim();
  CONFIG.TIERS = [
    { limit: parseInt(document.getElementById('tier1Units').value) || 10, rate: parseFloat(document.getElementById('tier1Rate').value) || 5 },
    { limit: parseInt(document.getElementById('tier2Units').value) || 30, rate: parseFloat(document.getElementById('tier2Rate').value) || 8 },
    { limit: Infinity, rate: parseFloat(document.getElementById('tier3Rate').value) || 12 },
  ];
  localStorage.setItem('villageName', CONFIG.VILLAGE_NAME);
  localStorage.setItem('serviceFee', CONFIG.SERVICE_FEE);
  localStorage.setItem('gasUrl', CONFIG.GAS_URL);
  localStorage.setItem('tiers', JSON.stringify(CONFIG.TIERS));
  showToast('✅ บันทึกการตั้งค่าสำเร็จ', 'success');
}

// ===== HELPERS =====
function getUserById(id) { return state.users.find(u => u.id === id); }

function getPrevMonth(month) {
  const [y, m] = month.split('-').map(Number);
  const prev = new Date(y, m - 2, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(monthStr) {
  if (!monthStr) return '-';
  const [y, m] = monthStr.split('-').map(Number);
  const thMonth = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${thMonth[m - 1]} ${y + 543}`;
}

function loadUserDropdowns() {
  const selectors = ['meterUser', 'billUser'];
  selectors.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const val = el.value;
    el.innerHTML = `<option value="">-- เลือกผู้ใช้น้ำ --</option>` +
      state.users.map(u => `<option value="${u.id}" ${u.id === val ? 'selected' : ''}>${u.name} (${u.house})</option>`).join('');
  });
}

function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

function showToast(msg, type = 'info') {
  const colors = { success: 'bg-emerald-600', warning: 'bg-amber-500', error: 'bg-rose-600', info: 'bg-water-600' };
  const toast = document.getElementById('toast');
  const inner = document.getElementById('toastInner');
  inner.textContent = msg;
  inner.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${colors[type] || colors.info}`;
  toast.classList.remove('hidden');
  toast.classList.add('show');
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.classList.add('hidden'), 300); }, 3000);
}

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', e => { if (e.target === el) closeModal(el.id); });
});

// Load settings from storage on init
window.addEventListener('load', () => {
  const gasUrl = localStorage.getItem('gasUrl');
  if (gasUrl) document.getElementById('settingGasUrl').value = gasUrl;
  const village = localStorage.getItem('villageName');
  if (village) document.getElementById('settingVillage').value = village;
});
