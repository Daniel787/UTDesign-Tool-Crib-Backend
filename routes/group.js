var express = require('express');
var router = express.Router();
const mysql = require('mysql');
require('dotenv').config()

//sql connection
console.log(process.env.DB_HOST)
var connection = mysql.createConnection({
  
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
})

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  connectionLimit:10
});


router.get("/",(req,res) => {
  pool.getConnection((err, connection) => {
    if(err) throw err;

   myquery= "SELECT * FROM mydb.groups"
    connection.query(myquery, function (err, rows, fields) {
      if (err) throw err
      res.json(rows);
    })

    console.log('finished route')
});
})


//i.e. http://localhost:3000/group/search?id=357
router.get("/search",(req,res) => {
  pool.getConnection((err, connection) => {
    if(err) throw err;

    //arguments
    var id= req.query.id

   myquery= "SELECT * FROM mydb.groups WHERE group_id="+id 
    connection.query(myquery, function (err, rows, fields) {
      if (err) throw err
      res.json(rows[0]);
    })

    console.log('finished route')
});
})


module.exports = router;