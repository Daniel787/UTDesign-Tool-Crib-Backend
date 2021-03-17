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

   myquery= "SELECT * FROM mydb.student"
    connection.query(myquery, function (err, rows, fields) {
      if (err) throw err
      res.json(rows);
    })

    console.log('finished route')
});
})


//i.e. http://localhost:port/student/search?net-id=180004
router.get("/search",(req,res) => {
  pool.getConnection((err, connection) => {
    if(err) throw err;

    //arguments
    var net_id= req.query.net-id

   myquery= "SELECT * FROM mydb.student WHERE net_id="+net_id 
    connection.query(myquery, function (err, rows, fields) {
      if (err) throw err
      res.json(rows[0]);
    })

    console.log('finished route')
});
})


router.get("/holds",(req,res) => {
    pool.getConnection((err, connection) => {
      if(err) throw err;
  
     myquery= "SELECT * FROM mydb.student WHERE student_hold = true"
      connection.query(myquery, function (err, rows, fields) {
        if (err) throw err
        res.json(rows);
      })
  
      console.log('finished route')
  });
  })
  
  router.get("/holds/detailed",(req,res) => {
    pool.getConnection((err, connection) => {
      if(err) throw err;
  
     myquery= "select group_id, net_id, mydb.rental_tool.tool_id, mydb.rental_tool.name,  mydb.transaction.date as rental_start "
     +"from mydb.transaction, mydb.rented_tool, mydb.rental_tool "
     +"where mydb.transaction.transaction_id= mydb.rented_tool.transaction_id " 
         +"and mydb.rented_tool.tool_id = mydb.rental_tool.tool_id "
         +"and mydb.rented_tool.returned_date is null;"
      connection.query(myquery, function (err, rows, fields) {
        if (err) throw err
        res.json(rows);
      })
  
      console.log('finished route')
  });
  })


module.exports = router;