require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const { URL } = require("url");

const app = express();
const port = process.env.PORT || 3000;

// ตั้งค่า CORS
app.use(cors());

// แปลง DATABASE_URL
const dbUrl = new URL(process.env.DATABASE_URL);

// แยกข้อมูลจาก URL
const connection = mysql.createConnection({
  host: dbUrl.hostname,
  port: dbUrl.port,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  ssl: {
    rejectUnauthorized: true,
  },
});

// เชื่อมต่อกับฐานข้อมูล
connection.connect((err) => {
  if (err) {
    console.error("❌ Error connecting:", err.stack);
    return;
  }
  console.log("✅ Connected to MySQL as id " + connection.threadId);
});

// API สำหรับดึงข้อมูลงูทั้งหมด
app.get("/api/snakes", (req, res) => {
  connection.query("SELECT * FROM snakes", (err, results) => {
    if (err) {
      console.error("❌ Query failed:", err);
      return res.status(500).send({ error: "Database query failed" });
    }
    res.json(results);
  });
});

// API สำหรับดึงข้อมูลงูตาม id
app.get("/api/snakes/:id", (req, res) => {
  const { id } = req.params;
  connection.query("SELECT * FROM snakes WHERE id = ?", [id], (err, results) => {
    if (err) {
      console.error("❌ Query failed:", err);
      return res.status(500).send({ error: "Database query failed" });
    }
    if (results.length > 0) {
      res.json(results[0]);
    } else {
      res.status(404).send({ error: "Snake not found" });
    }
  });
});

// เริ่ม server
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
