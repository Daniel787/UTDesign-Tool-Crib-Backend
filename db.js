const mysql = require('mysql2');
require('dotenv').config()

//sql connection
var pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  connectionLimit : 20,
  multipleStatements: true
});

module.exports = pool;