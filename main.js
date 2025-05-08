require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ตรวจสอบว่ามีการกำหนดค่า DATABASE_URL หรือไม่
if (!process.env.DATABASE_URL) {
  console.error("กรุณากำหนดค่า DATABASE_URL ในไฟล์ .env");
  process.exit(1);
}

// สร้างการเชื่อมต่อ MySQL
let connection;
try {
  connection = mysql.createConnection(process.env.DATABASE_URL);
  
  // เชื่อมต่อกับฐานข้อมูล
  connection.connect((err) => {
    if (err) {
      console.error("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล: " + err.stack);
      console.error("DATABASE_URL: " + process.env.DATABASE_URL);
      process.exit(1);
    }
    console.log("เชื่อมต่อกับ MySQL สำเร็จ (ID: " + connection.threadId + ")");
    
    // ตรวจสอบว่าตาราง snakes มีอยู่หรือไม่
    connection.query("SHOW TABLES LIKE 'snakes'", (err, results) => {
      if (err) {
        console.error("เกิดข้อผิดพลาดในการตรวจสอบตาราง: " + err.message);
      } else if (results.length === 0) {
        console.warn("คำเตือน: ไม่พบตาราง 'snakes' ในฐานข้อมูล");
      } else {
        console.log("พบตาราง 'snakes' ในฐานข้อมูล");
      }
    });
  });
} catch (error) {
  console.error("เกิดข้อผิดพลาดในการสร้างการเชื่อมต่อกับฐานข้อมูล:", error);
  process.exit(1);
}

// API สำหรับดึงข้อมูลงูทั้งหมด
app.get("/api/snakes", (req, res) => {
  try {
    connection.query("SELECT * FROM snakes", (err, results) => {
      if (err) {
        console.error("เกิดข้อผิดพลาดในการคิวรี่ข้อมูล:", err);
        res.status(500).send({ error: "Database query failed", details: err.message });
      } else {
        res.json(results);
      }
    });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดที่ไม่คาดคิด:", error);
    res.status(500).send({ error: "Unexpected error occurred", details: error.message });
  }
});

// API สำหรับดึงข้อมูลงูตาม id
app.get("/api/snakes/:id", (req, res) => {
  const { id } = req.params;
  try {
    connection.query(
      "SELECT * FROM snakes WHERE id = ?",
      [id],
      (err, results) => {
        if (err) {
          console.error("เกิดข้อผิดพลาดในการคิวรี่ข้อมูล:", err);
          res.status(500).send({ error: "Database query failed", details: err.message });
        } else {
          if (results.length > 0) {
            res.json(results[0]);
          } else {
            res.status(404).send({ error: "Snake not found" });
          }
        }
      }
    );
  } catch (error) {
    console.error("เกิดข้อผิดพลาดที่ไม่คาดคิด:", error);
    res.status(500).send({ error: "Unexpected error occurred", details: error.message });
  }
});

// สร้างเส้นทางทดสอบที่ไม่ต้องใช้ฐานข้อมูล
app.get("/api/test", (req, res) => {
  res.json({ status: "OK", message: "API ทำงานได้ปกติ" });
});

// จัดการกรณีเส้นทางไม่มีอยู่จริง
app.use((req, res) => {
  res.status(404).send({ error: "Not found" });
});

// จัดการข้อผิดพลาดทั่วไป
app.use((err, req, res, next) => {
  console.error("เกิดข้อผิดพลาดในเซิร์ฟเวอร์:", err);
  res.status(500).send({ error: "Internal server error", details: err.message });
});

// เริ่ม server
app.listen(port, () => {
  console.log(`Server กำลังทำงานที่ http://localhost:${port}`);
});
