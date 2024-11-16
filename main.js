require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000; // ใช้พอร์ตจาก environment หรือ 3000

// ตั้งค่า CORS
const corsOptions = {
  origin: '*',  // ยอมให้ทุก domain เชื่อมต่อ
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
};
app.use(cors(corsOptions));

// เชื่อมต่อกับฐานข้อมูล MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,   // ใช้ค่า DB_HOST จาก environment variables
  user: process.env.DB_USER,   // ใช้ค่า DB_USER จาก environment variables
  password: process.env.DB_PASSWORD,  // ใช้ค่า DB_PASSWORD จาก environment variables
  database: process.env.DB_NAME,  // ใช้ค่า DB_NAME จาก environment variables
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

// API สำหรับดึงข้อมูลงูตาม id
app.get('/api/snakes/:id', (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM snakes WHERE id = ?', [id], (err, results) => {
    if (err) {
      res.status(500).send({ error: 'Database query failed' });
    } else {
      res.json(results[0]);
    }
  });
});

// เริ่ม server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
