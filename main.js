require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;

// ตั้งค่า CORS
app.use(cors());

// ตั้งค่าการเชื่อมต่อ MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,  // เพิ่มพอร์ต
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// เชื่อมต่อกับฐานข้อมูล
db.connect((err) => {
  if (err) {
    console.error('error connecting: ' + err.stack);
    return;
  }
  console.log('connected to MySQL as id ' + db.threadId);
});

// API สำหรับดึงข้อมูลงูทั้งหมด
app.get('/api/snakes', (req, res) => {
  db.query('SELECT * FROM snakes', (err, results) => {
    if (err) {
      res.status(500).send({ error: 'Database query failed' });
    } else {
      res.json(results);
    }
  });
});

// เริ่ม server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
