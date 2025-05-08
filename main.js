require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// กำหนดค่าการเชื่อมต่อสำหรับ TiDB Cloud
const poolConfig = {
  // ใช้ URI จาก environment variable
  uri: process.env.DATABASE_URL,
  
  // กำหนดค่าการเชื่อมต่อเพิ่มเติม
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  
  // ตั้งค่าสำหรับป้องกันการเชื่อมต่อหลุด
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000, // 10 วินาที
  
  // ตั้งค่า SSL สำหรับ TiDB Cloud
  ssl: {
    rejectUnauthorized: true
  },
  
  // กำหนดค่า timeout ที่เหมาะสม
  connectTimeout: 30000, // 30 วินาที
  acquireTimeout: 30000 // 30 วินาที
};

// สร้าง connection pool
let pool;
try {
  pool = mysql.createPool(poolConfig);
  console.log("✅ สร้าง connection pool สำเร็จ");
} catch (err) {
  console.error("❌ ไม่สามารถสร้าง connection pool:", err);
  process.exit(1);
}

// แปลง pool เป็น promise
const promisePool = pool.promise();

// ฟังก์ชันทดสอบการเชื่อมต่อ
const testConnection = async () => {
  try {
    console.log("⏳ กำลังทดสอบการเชื่อมต่อกับฐานข้อมูล...");
    const [rows] = await promisePool.query('SELECT 1 as connection_test');
    console.log('✅ การเชื่อมต่อฐานข้อมูลทำงานปกติ:', rows[0]);
    return true;
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล:', error);
    
    // แสดงข้อมูลเพิ่มเติมเกี่ยวกับการเชื่อมต่อ (แต่ไม่แสดงรหัสผ่าน)
    const connectionInfo = { ...poolConfig };
    if (connectionInfo.uri) {
      connectionInfo.uri = connectionInfo.uri.replace(/:[^:]*@/, ':****@');
    }
    console.error('ข้อมูลการเชื่อมต่อที่ใช้:', connectionInfo);
    
    return false;
  }
};

// API สำหรับดึงข้อมูลงูทั้งหมด
app.get("/api/snakes", async (req, res) => {
  try {
    console.log("⏳ กำลังดึงข้อมูลงูทั้งหมด...");
    const [rows] = await promisePool.query("SELECT * FROM snakes");
    console.log(`✅ ดึงข้อมูลงูสำเร็จ (${rows.length} รายการ)`);
    res.json(rows);
  } catch (error) {
    console.error("❌ การคิวรี่ล้มเหลว:", error);
    await testConnection();
    res.status(500).send({
      error: "Database query failed",
      message: error.message,
      code: error.code,
      sqlState: error.sqlState
    });
  }
});

// API สำหรับดึงข้อมูลงูตาม id
app.get("/api/snakes/:id", async (req, res) => {
  const { id } = req.params;
  try {
    console.log(`⏳ กำลังดึงข้อมูลงู ID: ${id}...`);
    const [rows] = await promisePool.query(
      "SELECT * FROM snakes WHERE id = ?",
      [id]
    );
    if (rows.length > 0) {
      console.log(`✅ ดึงข้อมูลงู ID: ${id} สำเร็จ`);
      res.json(rows[0]);
    } else {
      console.log(`⚠️ ไม่พบงู ID: ${id}`);
      res.status(404).send({ error: "Snake not found" });
    }
  } catch (error) {
    console.error(`❌ การคิวรี่ล้มเหลว (ID: ${id}):`, error);
    await testConnection();
    res.status(500).send({
      error: "Database query failed",
      message: error.message
    });
  }
});

// สร้างเส้นทางทดสอบที่ไม่ต้องใช้ฐานข้อมูล
app.get("/api/test", (req, res) => {
  res.json({
    status: "OK",
    message: "API ทำงานได้ปกติ",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ตรวจสอบการเชื่อมต่อฐานข้อมูล
app.get("/api/db-status", async (req, res) => {
  const isConnected = await testConnection();
  res.json({
    status: isConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
    database_url_set: !!process.env.DATABASE_URL
  });
});

// จัดการกรณีเส้นทางไม่มีอยู่จริง
app.use((req, res) => {
  res.status(404).send({ error: "Not found" });
});

// จัดการข้อผิดพลาดทั่วไป
app.use((err, req, res, next) => {
  console.error("เกิดข้อผิดพลาดในเซิร์ฟเวอร์:", err);
  res.status(500).send({
    error: "Internal server error",
    message: err.message
  });
});

// ทดสอบการเชื่อมต่อก่อนเริ่ม server
(async () => {
  console.log("🚀 กำลังเริ่มต้นเซิร์ฟเวอร์...");
  console.log(`💾 DATABASE_URL ${process.env.DATABASE_URL ? 'ถูกกำหนดค่า' : 'ไม่ได้ถูกกำหนดค่า'}`);
  
  // ทดสอบการเชื่อมต่อ
  const connected = await testConnection();
  if (!connected) {
    console.warn("⚠️ ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้ แต่จะเริ่มเซิร์ฟเวอร์อยู่ดี");
  }
  
  // เริ่ม server
  app.listen(port, () => {
    console.log(`🌐 Server กำลังทำงานที่ http://localhost:${port}`);
    console.log(`🧪 ลองทดสอบ API ที่ http://localhost:${port}/api/test`);
    console.log(`💻 ตรวจสอบสถานะฐานข้อมูลที่ http://localhost:${port}/api/db-status`);
  });
})();
