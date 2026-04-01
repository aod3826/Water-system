# 🚰 ระบบบริหารจัดการน้ำประปาหมู่บ้าน
**Village Water Management System v2.0**

---

## 📁 โครงสร้างไฟล์

```
water-system/
├── index.html      → หน้าหลัก Frontend (HTML + Tailwind CSS)
├── script.js       → JavaScript Logic ทั้งระบบ
├── style.css       → Custom CSS + Animations
└── Code.gs         → Google Apps Script Backend
```

---

## 🗄️ Google Sheets Schema

### Sheet 1: Users (ผู้ใช้น้ำ)
| คอลัมน์ | ประเภท | ตัวอย่าง |
|---------|--------|---------|
| id | String | U001 |
| name | String | นายสมชาย ใจดี |
| house | String | 12/1 |
| phone | String | 081-234-5678 |
| meter | String | MTR-001 |
| createdAt | DateTime | 2025-01-15 10:30:00 |

### Sheet 2: Meters (บันทึกมิเตอร์)
| คอลัมน์ | ประเภท | ตัวอย่าง |
|---------|--------|---------|
| id | String | M001 |
| userId | String | U001 |
| month | String | 2025-03 |
| prev | Number | 120 |
| curr | Number | 145 |
| units | Number | 25 |
| recordedAt | DateTime | 2025-03-01 09:00:00 |

### Sheet 3: Bills (ใบแจ้งหนี้)
| คอลัมน์ | ประเภท | ตัวอย่าง |
|---------|--------|---------|
| id | String | B001 |
| userId | String | U001 |
| month | String | 2025-03 |
| prevMeter | Number | 120 |
| currMeter | Number | 145 |
| units | Number | 25 |
| waterFee | Number | 170.00 |
| serviceFee | Number | 30.00 |
| total | Number | 200.00 |
| status | String | paid / unpaid |
| paidDate | String | 2025-03-05 |
| createdAt | DateTime | 2025-03-01 |

### Sheet 4: Settings (ตั้งค่า)
| Key | Value | Description |
|-----|-------|-------------|
| village_name | บ้านสวนสวย | ชื่อหมู่บ้าน |
| service_fee | 30 | ค่าบริการรายเดือน |
| tier1_limit | 10 | หน่วยสูงสุด tier 1 |
| tier1_rate | 5 | ราคา tier 1 |
| tier2_limit | 30 | หน่วยสูงสุด tier 2 |
| tier2_rate | 8 | ราคา tier 2 |
| tier3_rate | 12 | ราคา tier 3 |
| admin_pass | admin1234 | รหัสผ่าน Admin |
| line_token | (your token) | LINE Notify Token |
| telegram_token | (your token) | Telegram Bot Token |

### Sheet 5: Logs (บันทึกการใช้งาน)
| Timestamp | Action | Params |
|-----------|--------|--------|
| 2025-03-01 09:00:00 | addUser | {...} |

---

## 🚀 วิธี Deploy ระบบ

### ขั้นตอนที่ 1: ตั้งค่า Google Sheets

1. ไปที่ [Google Sheets](https://sheets.google.com)
2. สร้าง Spreadsheet ใหม่
3. คัดลอก **Spreadsheet ID** จาก URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```

### ขั้นตอนที่ 2: ตั้งค่า Google Apps Script

1. ใน Spreadsheet เลือก **Extensions → Apps Script**
2. ลบโค้ดเดิมทั้งหมด
3. วางโค้ดจากไฟล์ `Code.gs`
4. แก้ไข `SPREADSHEET_ID`:
   ```javascript
   const SPREADSHEET_ID = 'your-spreadsheet-id-here';
   ```
5. กด **Save** (Ctrl+S)

### ขั้นตอนที่ 3: Initialize Sheets

1. ใน Apps Script เลือก function: `initSheets`
2. กด **Run**
3. อนุญาต permissions ที่ขอ
4. ตรวจสอบว่า Sheets ถูกสร้างครบ 5 sheets

### ขั้นตอนที่ 4: Deploy เป็น Web App

1. คลิก **Deploy → New deployment**
2. เลือก Type: **Web app**
3. ตั้งค่า:
   - **Description**: Water Management System v2
   - **Execute as**: Me (your Gmail)
   - **Who has access**: Anyone
4. คลิก **Deploy**
5. คัดลอก **Web app URL**

### ขั้นตอนที่ 5: เชื่อมต่อ Frontend

1. เปิด `index.html` ในเบราว์เซอร์
2. Login ด้วย admin / admin1234
3. ไปที่เมนู **ตั้งค่าระบบ**
4. ใส่ Web App URL ที่ได้จากขั้นตอน 4
5. กด **บันทึกการตั้งค่า**

---

## 🌐 วิธี Host Frontend

### Option A: GitHub Pages (ฟรี)
```bash
git init
git add .
git commit -m "Water Management System"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/water-system.git
git push -u origin main
# Enable GitHub Pages in repo Settings
```

### Option B: Netlify Drop (ง่ายที่สุด)
1. ไปที่ [netlify.com/drop](https://app.netlify.com/drop)
2. ลากโฟลเดอร์ `water-system/` ไปวาง
3. ได้ URL ทันที!

### Option C: เปิดไฟล์โดยตรง
- เปิด `index.html` ในเบราว์เซอร์โดยตรง
- ระบบทำงานแบบ Offline (Demo Data)
- เชื่อมต่อ GAS เมื่อใส่ URL ในตั้งค่า

---

## 🔑 API Endpoints

| Action | Method | Parameters | Description |
|--------|--------|------------|-------------|
| login | POST | user, pass | เข้าสู่ระบบ |
| getUsers | GET | - | ดึงรายชื่อผู้ใช้ทั้งหมด |
| addUser | POST | name, house, phone, meter | เพิ่มผู้ใช้น้ำ |
| updateUser | POST | id, name, house, phone, meter | แก้ไขผู้ใช้น้ำ |
| deleteUser | POST | id | ลบผู้ใช้น้ำ |
| getMeters | GET | userId?, month? | ดึงข้อมูลมิเตอร์ |
| addMeter | POST | userId, month, prev, curr | บันทึกมิเตอร์ |
| getBills | GET | userId?, month?, status? | ดึงใบแจ้งหนี้ |
| addBill | POST | userId, month, units, total... | สร้างใบแจ้งหนี้ |
| updatePaymentStatus | POST | id, status, paidDate | อัปเดตสถานะชำระ |
| sendLine | POST | token, message | ส่ง LINE Notify |
| sendTelegram | POST | token, chatId, message | ส่ง Telegram |
| getReport | GET | year, type | ดึงรายงาน |
| initSheets | GET | - | สร้าง Sheets ครั้งแรก |

---

## 💡 อัตราค่าน้ำ (ขั้นบันได)

| ช่วงหน่วย | อัตรา |
|-----------|-------|
| 1 - 10 หน่วย | 5 บาท/หน่วย |
| 11 - 30 หน่วย | 8 บาท/หน่วย |
| 31 หน่วยขึ้นไป | 12 บาท/หน่วย |
| ค่าบริการรายเดือน | 30 บาท/เดือน |

**ตัวอย่าง**: ใช้น้ำ 35 หน่วย
- 10 หน่วย × 5 = 50 บาท
- 20 หน่วย × 8 = 160 บาท  
- 5 หน่วย × 12 = 60 บาท
- ค่าบริการ = 30 บาท
- **รวม = 300 บาท**

---

## 🔔 ตั้งค่า LINE Notify

1. ไปที่ [notify-bot.line.me](https://notify-bot.line.me)
2. Login ด้วย LINE Account
3. คลิก **Generate token**
4. เลือก Group หรือ 1:1 chat
5. คัดลอก Token ไปใส่ในระบบ

## 📱 ตั้งค่า Telegram Bot

1. ค้นหา [@BotFather](https://t.me/botfather) ใน Telegram
2. ส่ง `/newbot` และตั้งชื่อ Bot
3. คัดลอก **Bot Token**
4. เพิ่ม Bot เข้า Group
5. หา Chat ID จาก `https://api.telegram.org/bot{TOKEN}/getUpdates`

---

## 👥 ผู้ใช้งาน Demo

| Username | Password | สิทธิ์ |
|----------|----------|--------|
| admin | admin1234 | ผู้ดูแลระบบ |
| staff | staff1234 | เจ้าหน้าที่ |

---

## 📞 ติดต่อสนับสนุน

ระบบนี้พัฒนาด้วย:
- **Frontend**: HTML5 + Tailwind CSS + Chart.js
- **Backend**: Google Apps Script
- **Database**: Google Sheets
- **Fonts**: Noto Sans Thai + IBM Plex Mono
