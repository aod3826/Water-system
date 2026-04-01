// ============================================================
// VILLAGE WATER MANAGEMENT SYSTEM - GOOGLE APPS SCRIPT
// ============================================================
// วิธีใช้งาน:
// 1. สร้าง Google Spreadsheet ใหม่
// 2. เปิด Extensions > Apps Script
// 3. วางโค้ดนี้ทั้งหมดในไฟล์ Code.gs
// 4. ตั้งค่า SPREADSHEET_ID ให้ถูกต้อง
// 5. Deploy > New Deployment > Web App
//    - Execute as: Me
//    - Who has access: Anyone
// 6. Copy URL แล้วใส่ใน Frontend Settings
// ============================================================

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // ← เปลี่ยนตรงนี้
const SHEET_NAMES = {
  USERS: 'Users',
  METERS: 'Meters',
  BILLS: 'Bills',
  SETTINGS: 'Settings',
  LOGS: 'Logs'
};

// ===== CORS HEADERS =====
function setCORSHeaders(output) {
  return output
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ===== MAIN ENTRY POINTS =====
function doGet(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    const action = e.parameter.action || '';
    const result = handleAction(action, e.parameter);
    output.setContent(JSON.stringify(result));
  } catch (err) {
    output.setContent(JSON.stringify({ success: false, error: err.message }));
  }
  return setCORSHeaders(output);
}

function doPost(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    const action = e.parameter.action || '';
    let data = {};
    if (e.postData && e.postData.contents) {
      try { data = JSON.parse(e.postData.contents); } catch (_) { data = {}; }
    }
    const result = handleAction(action, { ...e.parameter, ...data });
    output.setContent(JSON.stringify(result));
  } catch (err) {
    output.setContent(JSON.stringify({ success: false, error: err.message }));
  }
  return setCORSHeaders(output);
}

// ===== ACTION ROUTER =====
function handleAction(action, params) {
  logAction(action, params);
  switch (action) {
    // Auth
    case 'login':         return handleLogin(params);
    // Users
    case 'getUsers':      return getUsers();
    case 'addUser':       return addUser(params);
    case 'updateUser':    return updateUser(params);
    case 'deleteUser':    return deleteUser(params);
    // Meters
    case 'getMeters':     return getMeters(params);
    case 'addMeter':      return addMeter(params);
    // Bills
    case 'getBills':      return getBills(params);
    case 'addBill':       return addBill(params);
    case 'updatePaymentStatus': return updatePaymentStatus(params);
    // Notifications
    case 'sendLine':      return sendLineNotify(params);
    case 'sendTelegram':  return sendTelegramNotify(params);
    // Reports
    case 'getReport':     return getReport(params);
    // Settings
    case 'getSettings':   return getSettings();
    case 'saveSettings':  return saveSettings(params);
    // Setup
    case 'initSheets':    return initSheets();

    default: return { success: false, error: `Unknown action: ${action}` };
  }
}

// ===== HELPERS =====
function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(name);
}

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length)
        .setBackground('#0891b2')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function sheetToObjects(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function findRowById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return i + 1; // 1-indexed
  }
  return -1;
}

function generateId(prefix) {
  return prefix + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase();
}

function now() {
  return Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
}

function logAction(action, params) {
  try {
    const sheet = getOrCreateSheet(SHEET_NAMES.LOGS, ['Timestamp', 'Action', 'Params']);
    sheet.appendRow([now(), action, JSON.stringify(params).substring(0, 200)]);
  } catch (_) {}
}

// ===== AUTH =====
function handleLogin(params) {
  const { user, pass } = params;
  const sheet = getSheet(SHEET_NAMES.SETTINGS);
  if (!sheet) return { success: false, error: 'Settings not initialized' };

  const data = sheetToObjects(sheet);
  const users = data.filter(r => r.Key && r.Key.startsWith('user_'));

  // Default: admin/admin1234
  const adminPass = data.find(r => r.Key === 'admin_pass')?.Value || 'admin1234';
  const staffPass = data.find(r => r.Key === 'staff_pass')?.Value || 'staff1234';

  if ((user === 'admin' && pass === adminPass) || (user === 'staff' && pass === staffPass)) {
    return { success: true, role: user };
  }
  return { success: false, error: 'Invalid credentials' };
}

// ===== USERS CRUD =====

/** GET /getUsers */
function getUsers() {
  const sheet = getOrCreateSheet(SHEET_NAMES.USERS,
    ['id', 'name', 'house', 'phone', 'meter', 'createdAt']);
  return { success: true, data: sheetToObjects(sheet) };
}

/** POST /addUser */
function addUser(params) {
  const { name, house, phone, meter } = params;
  if (!name || !house) return { success: false, error: 'name and house required' };

  const sheet = getOrCreateSheet(SHEET_NAMES.USERS,
    ['id', 'name', 'house', 'phone', 'meter', 'createdAt']);
  const id = params.id || generateId('U');
  sheet.appendRow([id, name, house, phone || '', meter || '', now()]);
  return { success: true, id };
}

/** POST /updateUser */
function updateUser(params) {
  const { id, name, house, phone, meter } = params;
  const sheet = getSheet(SHEET_NAMES.USERS);
  if (!sheet) return { success: false, error: 'Users sheet not found' };

  const row = findRowById(sheet, id);
  if (row === -1) return { success: false, error: 'User not found' };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowData = sheet.getRange(row, 1, 1, headers.length).getValues()[0];

  const mapping = { name, house, phone, meter };
  headers.forEach((h, i) => { if (mapping[h] !== undefined) rowData[i] = mapping[h]; });
  sheet.getRange(row, 1, 1, headers.length).setValues([rowData]);

  return { success: true };
}

/** POST /deleteUser */
function deleteUser(params) {
  const sheet = getSheet(SHEET_NAMES.USERS);
  if (!sheet) return { success: false, error: 'Users sheet not found' };
  const row = findRowById(sheet, params.id);
  if (row === -1) return { success: false, error: 'User not found' };
  sheet.deleteRow(row);
  return { success: true };
}

// ===== METERS =====

/** GET /getMeters */
function getMeters(params) {
  const sheet = getOrCreateSheet(SHEET_NAMES.METERS,
    ['id', 'userId', 'month', 'prev', 'curr', 'units', 'recordedAt']);
  let data = sheetToObjects(sheet);
  if (params.userId) data = data.filter(r => r.userId === params.userId);
  if (params.month) data = data.filter(r => r.month === params.month);
  return { success: true, data };
}

/** POST /addMeter */
function addMeter(params) {
  const { userId, month, prev, curr, units } = params;
  if (!userId || !month) return { success: false, error: 'userId and month required' };

  const sheet = getOrCreateSheet(SHEET_NAMES.METERS,
    ['id', 'userId', 'month', 'prev', 'curr', 'units', 'recordedAt']);

  // Remove existing record for same user+month
  const existing = sheetToObjects(sheet).find(r => r.userId === userId && r.month === month);
  if (existing) {
    const row = findRowById(sheet, existing.id);
    if (row > 0) sheet.deleteRow(row);
  }

  const id = params.id || generateId('M');
  sheet.appendRow([id, userId, month, prev || 0, curr || 0, units || (curr - prev), now()]);
  return { success: true, id };
}

// ===== BILLS =====

/** GET /getBills */
function getBills(params) {
  const sheet = getOrCreateSheet(SHEET_NAMES.BILLS,
    ['id', 'userId', 'month', 'prevMeter', 'currMeter', 'units',
     'waterFee', 'serviceFee', 'total', 'status', 'paidDate', 'createdAt']);
  let data = sheetToObjects(sheet);
  if (params.userId) data = data.filter(r => r.userId === params.userId);
  if (params.month) data = data.filter(r => r.month === params.month);
  if (params.status) data = data.filter(r => r.status === params.status);
  return { success: true, data };
}

/** POST /addBill */
function addBill(params) {
  const { userId, month, prevMeter, currMeter, units, waterFee, serviceFee, total } = params;
  if (!userId || !month) return { success: false, error: 'userId and month required' };

  // Check duplicate
  const sheet = getOrCreateSheet(SHEET_NAMES.BILLS,
    ['id', 'userId', 'month', 'prevMeter', 'currMeter', 'units',
     'waterFee', 'serviceFee', 'total', 'status', 'paidDate', 'createdAt']);
  const existing = sheetToObjects(sheet).find(r => r.userId === userId && r.month === month);
  if (existing) return { success: false, error: 'Bill already exists for this month', existing };

  const id = params.id || generateId('B');
  sheet.appendRow([id, userId, month, prevMeter || 0, currMeter || 0,
    units || 0, waterFee || 0, serviceFee || 0, total || 0,
    'unpaid', '', now()]);
  return { success: true, id };
}

/** POST /updatePaymentStatus */
function updatePaymentStatus(params) {
  const { id, status, paidDate } = params;
  const sheet = getSheet(SHEET_NAMES.BILLS);
  if (!sheet) return { success: false, error: 'Bills sheet not found' };

  const row = findRowById(sheet, id);
  if (row === -1) return { success: false, error: 'Bill not found' };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const statusCol = headers.indexOf('status') + 1;
  const paidDateCol = headers.indexOf('paidDate') + 1;

  if (statusCol > 0) sheet.getRange(row, statusCol).setValue(status);
  if (paidDateCol > 0) sheet.getRange(row, paidDateCol).setValue(paidDate || '');

  return { success: true };
}

// ===== NOTIFICATIONS =====

/** POST /sendLine */
function sendLineNotify(params) {
  const { token, message } = params;
  if (!token || !message) return { success: false, error: 'token and message required' };

  try {
    const response = UrlFetchApp.fetch('https://notify-api.line.me/api/notify', {
      method: 'post',
      headers: { 'Authorization': `Bearer ${token}` },
      payload: { message }
    });
    const code = response.getResponseCode();
    return { success: code === 200, code };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/** POST /sendTelegram */
function sendTelegramNotify(params) {
  const { token, chatId, message } = params;
  if (!token || !chatId || !message) return { success: false, error: 'token, chatId, and message required' };

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
    });
    const result = JSON.parse(response.getContentText());
    return { success: result.ok, result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ===== REPORTS =====
function getReport(params) {
  const { year, type } = params;
  const billsSheet = getSheet(SHEET_NAMES.BILLS);
  const usersSheet = getSheet(SHEET_NAMES.USERS);
  if (!billsSheet) return { success: false, error: 'Bills sheet not found' };

  const bills = sheetToObjects(billsSheet);
  const users = usersSheet ? sheetToObjects(usersSheet) : [];

  if (type === 'monthly') {
    const report = [];
    for (let m = 1; m <= 12; m++) {
      const monthKey = `${year}-${String(m).padStart(2, '0')}`;
      const monthBills = bills.filter(b => b.month === monthKey);
      report.push({
        month: monthKey,
        billCount: monthBills.length,
        totalUnits: monthBills.reduce((s, b) => s + Number(b.units), 0),
        totalRevenue: monthBills.reduce((s, b) => s + Number(b.total), 0),
        paidRevenue: monthBills.filter(b => b.status === 'paid').reduce((s, b) => s + Number(b.total), 0),
        unpaidRevenue: monthBills.filter(b => b.status === 'unpaid').reduce((s, b) => s + Number(b.total), 0),
      });
    }
    return { success: true, data: report };
  }

  return { success: true, data: bills };
}

// ===== SETTINGS =====
function getSettings() {
  const sheet = getOrCreateSheet(SHEET_NAMES.SETTINGS, ['Key', 'Value', 'Description']);
  return { success: true, data: sheetToObjects(sheet) };
}

function saveSettings(params) {
  const sheet = getOrCreateSheet(SHEET_NAMES.SETTINGS, ['Key', 'Value', 'Description']);
  const { key, value, description } = params;
  if (!key) return { success: false, error: 'key required' };

  const data = sheetToObjects(sheet);
  const existing = data.find(r => r.Key === key);

  if (existing) {
    const row = findRowById(sheet, key);
    // For settings, Key is in col 1 but not 'id'
    const allData = sheet.getDataRange().getValues();
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(value);
        return { success: true };
      }
    }
  }

  sheet.appendRow([key, value, description || '']);
  return { success: true };
}

// ===== INIT SHEETS (Run once to set up) =====
function initSheets() {
  getOrCreateSheet(SHEET_NAMES.USERS,
    ['id', 'name', 'house', 'phone', 'meter', 'createdAt']);

  getOrCreateSheet(SHEET_NAMES.METERS,
    ['id', 'userId', 'month', 'prev', 'curr', 'units', 'recordedAt']);

  getOrCreateSheet(SHEET_NAMES.BILLS,
    ['id', 'userId', 'month', 'prevMeter', 'currMeter', 'units',
     'waterFee', 'serviceFee', 'total', 'status', 'paidDate', 'createdAt']);

  const settingsSheet = getOrCreateSheet(SHEET_NAMES.SETTINGS, ['Key', 'Value', 'Description']);
  const defaults = [
    ['village_name', 'บ้านสวนสวย', 'ชื่อหมู่บ้าน'],
    ['village_address', 'ม.5 ต.สวนหลวง อ.เมือง จ.เชียงใหม่', 'ที่อยู่'],
    ['village_phone', '053-000-000', 'เบอร์ติดต่อ'],
    ['service_fee', '30', 'ค่าบริการรายเดือน (บาท)'],
    ['tier1_limit', '10', 'หน่วยสูงสุด tier 1'],
    ['tier1_rate', '5', 'ราคา tier 1 (บาท/หน่วย)'],
    ['tier2_limit', '30', 'หน่วยสูงสุด tier 2'],
    ['tier2_rate', '8', 'ราคา tier 2 (บาท/หน่วย)'],
    ['tier3_rate', '12', 'ราคา tier 3 (บาท/หน่วย)'],
    ['admin_pass', 'admin1234', 'รหัสผ่าน Admin'],
    ['staff_pass', 'staff1234', 'รหัสผ่านเจ้าหน้าที่'],
    ['line_token', '', 'LINE Notify Token'],
    ['telegram_token', '', 'Telegram Bot Token'],
    ['telegram_chat_id', '', 'Telegram Chat ID'],
  ];
  defaults.forEach(row => settingsSheet.appendRow(row));

  getOrCreateSheet(SHEET_NAMES.LOGS, ['Timestamp', 'Action', 'Params']);

  // Format all sheets
  formatAllSheets();

  return { success: true, message: 'Sheets initialized successfully' };
}

function formatAllSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  ss.getSheets().forEach(sheet => {
    sheet.autoResizeColumns(1, sheet.getLastColumn());
    if (sheet.getLastRow() > 1) {
      // Zebra striping
      for (let i = 2; i <= sheet.getLastRow(); i++) {
        const bg = i % 2 === 0 ? '#f8fafc' : '#ffffff';
        sheet.getRange(i, 1, 1, sheet.getLastColumn()).setBackground(bg);
      }
    }
  });
}

// ===== TRIGGER: Auto format on edit =====
function onEdit(e) {
  // Auto-timestamp on bill status change
  const sheet = e.range.getSheet();
  if (sheet.getName() !== SHEET_NAMES.BILLS) return;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const statusCol = headers.indexOf('status') + 1;
  const paidDateCol = headers.indexOf('paidDate') + 1;

  if (e.range.getColumn() === statusCol && e.value === 'paid') {
    sheet.getRange(e.range.getRow(), paidDateCol)
      .setValue(Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd'));
  }
}
