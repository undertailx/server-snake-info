require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

// ตั้งค่า CORS
app.use(cors());

// ตั้งค่าการเชื่อมต่อ MySQL
const connection = mysql.createConnection(process.env.DATABASE_URL);

// เชื่อมต่อกับฐานข้อมูล
connection.connect((err) => {
  if (err) {
    console.error("Error connecting: " + err.stack);
    return;
  }
  console.log("Connected to MySQL as id " + connection.threadId);
});

// API สำหรับดึงข้อมูลงูทั้งหมด
app.get("/api/snakes", (req, res) => {
  connection.query("SELECT * FROM snakes", (err, results) => {
    if (err) {
      res.status(500).send({ error: "Database query failed" });
    } else {
      res.json(results);
    }
  });
});

// API สำหรับดึงข้อมูลงูตาม id
app.get("/api/snakes/:id", (req, res) => {
  const { id } = req.params;
  connection.query(
    "SELECT * FROM snakes WHERE id = ?",
    [id],
    (err, results) => {
      if (err) {
        res.status(500).send({ error: "Database query failed" });
      } else {
        if (results.length > 0) {
          res.json(results[0]);
        } else {
          res.status(404).send({ error: "Snake not found" });
        }
      }
    }
  );
});

// เริ่ม server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
