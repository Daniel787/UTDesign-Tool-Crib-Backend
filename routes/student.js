var express = require('express');
var router = express.Router();

//sql connection
var pool = require('../db.js')

router.get("/",(req,res) => {
  myquery= "SELECT * FROM mydb.student"
  pool.query(myquery, function (err, rows, fields) {
    if (err) throw err
    res.json(rows);
  })

  console.log('finished route')
});

//i.e. http://localhost:port/student/search?net-id=180004
router.get("/search",(req,res) => {
  //arguments
  var net_id= req.query.net-id

  myquery= "SELECT * FROM mydb.student WHERE net_id="+net_id 
  pool.query(myquery, function (err, rows, fields) {
    if (err) throw err
    res.json(rows);
  })

  console.log('finished route')
});

router.get("/holds",(req,res) => {

  myquery= "SELECT * FROM mydb.student WHERE student_hold = true"
  pool.query(myquery, function (err, rows, fields) {
    if (err) throw err
    res.json(rows);
  })

  console.log('finished route')
});
  
router.get("/holds/detailed",(req,res) => {

  myquery= "select group_id, net_id, mydb.rental_tool.tool_id, mydb.rental_tool.name,  mydb.transaction.date as rental_start "
  +"from mydb.transaction, mydb.rented_tool, mydb.rental_tool "
  +"where mydb.transaction.transaction_id= mydb.rented_tool.transaction_id " 
      +"and mydb.rented_tool.tool_id = mydb.rental_tool.tool_id "
      +"and mydb.rented_tool.returned_date is null;"
  pool.query(myquery, function (err, rows, fields) {
    if (err) throw err
    res.json(rows);
  })

  console.log('finished route')
});

module.exports = router;