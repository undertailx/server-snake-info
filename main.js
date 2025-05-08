require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const poolConfig = {
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  ssl: {
    rejectUnauthorized: true
  },
  connectTimeout: 30000,
  acquireTimeout: 30000
};

let pool;
try {
  pool = mysql.createPool(poolConfig);
} catch (err) {
  console.error("Unable to create connection pool:", err);
  process.exit(1);
}

const promisePool = pool.promise();

const testConnection = async () => {
  try {
    const [rows] = await promisePool.query('SELECT 1 as connection_test');
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    
    const connectionInfo = { ...poolConfig };
    if (connectionInfo.uri) {
      connectionInfo.uri = connectionInfo.uri.replace(/:[^:]*@/, ':****@');
    }
    
    return false;
  }
};

app.get("/api/snakes", async (req, res) => {
  try {
    const [rows] = await promisePool.query("SELECT * FROM snakes");
    res.json(rows);
  } catch (error) {
    console.error("Query failed:", error);
    await testConnection();
    res.status(500).send({
      error: "Database query failed",
      message: error.message,
      code: error.code,
      sqlState: error.sqlState
    });
  }
});

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
    console.error("Query failed:", error);
    await testConnection();
    res.status(500).send({
      error: "Database query failed",
      message: error.message
    });
  }
});

app.get("/api/test", (req, res) => {
  res.json({
    status: "OK",
    message: "API is working normally",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get("/api/db-status", async (req, res) => {
  const isConnected = await testConnection();
  res.json({
    status: isConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
    database_url_set: !!process.env.DATABASE_URL
  });
});

app.use((req, res) => {
  res.status(404).send({ error: "Not found" });
});

app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).send({
    error: "Internal server error",
    message: err.message
  });
});

(async () => {
  console.log(`DATABASE_URL ${process.env.DATABASE_URL ? 'is configured' : 'is not configured'}`);
  
  const connected = await testConnection();
  if (!connected) {
    console.warn("Cannot connect to database, but starting server anyway");
  }
  
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
})();
