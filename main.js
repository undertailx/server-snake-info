require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// สร้าง pool แทนการใช้ connection เดียว
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// ถ้าไม่มี DATABASE_URL ให้ใช้พารามิเตอร์แยก
if (!process.env.DATABASE_URL) {
  console.warn("ไม่พบ DATABASE_URL ในไฟล์ .env กำลังใช้ค่าแยกแทน");
  pool.config.connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'your_database'
  };
}

// แปลง pool เป็น promise
const promisePool = pool.promise();

// ฟังก์ชันทดสอบการเชื่อมต่อ
const testConnection = async () => {
  try {
    const [rows] = await promisePool.query('SELECT 1');
    console.log('✅ การเชื่อมต่อฐานข้อมูลทำงานปกติ');
    return true;
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล:', error);
    return false;
  }
};

// API สำหรับดึงข้อมูลงูทั้งหมด
app.get("/api/snakes", async (req, res) => {
  try {
    const [rows] = await promisePool.query("SELECT * FROM snakes");
    res.json(rows);
  } catch (error) {
    console.error("❌ Query failed:", error);
    // ทดสอบการเชื่อมต่อใหม่เมื่อเกิดข้อผิดพลาด
    await testConnection();
    res.status(500).send({ 
      error: "Database query failed", 
      message: error.message,
      sqlState: error.sqlState,
      sqlCode: error.code
    });
  }
});

// API สำหรับดึงข้อมูลงูตาม id
app.get("/api/snakes/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await promisePool.query(
      "SELECT * FROM snakes WHERE id = ?",
      [id]
    );
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).send({ error: "Snake not found" });
    }
  } catch (error) {
    console.error("❌ Query failed:", error);
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
    timestamp: new Date().toISOString()
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
  await testConnection();
  
  // เริ่ม server
  app.listen(port, () => {
    console.log(`Server กำลังทำงานที่ http://localhost:${port}`);
    console.log(`ลองทดสอบ API ที่ http://localhost:${port}/api/test`);
    console.log(`ตรวจสอบสถานะฐานข้อมูลที่ http://localhost:${port}/api/db-status`);
  });
})();
