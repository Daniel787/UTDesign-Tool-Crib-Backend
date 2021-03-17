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


//i.e. http://localhost:port/inventory/search?id=12345
router.get("/",(req,res) => {
  console.log(req.query.id)
  pool.getConnection((err, connection) => {
    if(err) throw err;

   myquery= "SELECT * FROM mydb.inventory_part"
    connection.query(myquery, function (err, rows, fields) {
      if (err) throw err
  
      console.log('The solution is: ', rows)
      res.json(rows);
    })

    console.log('finished route')
});
})


//i.e. http://localhost:port/inventory/search?id=12345
router.get("/search",(req,res) => {
  console.log(req.query.id)
  pool.getConnection((err, connection) => {
    if(err) throw err;

    //capture first argument
    var idtosearch= req.query.id
    console.log(idtosearch)

   // myquery= "SELECT * FROM sql_store.customers WHERE customer_id="+nametosearch
   myquery= "SELECT * FROM mydb.inventory_part WHERE part_id="+idtosearch
    connection.query(myquery, function (err, rows, fields) {
      if (err) throw err
  
      console.log('The solution is: ', rows)
      res.json(rows);
    })

    console.log('finished route')
});
})


module.exports = router;