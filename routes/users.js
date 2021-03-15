var express = require('express');
var router = express.Router();
const mysql = require('mysql');
require('dotenv').config()
const axios = require('axios');

//sql connection
console.log(process.env.DB_HOST)
var connection = mysql.createConnection({
  
  host:'localhost', //changed, remember to put strings here :)
  user:'root',
  password:'password05',
  database:'mydb'
})

const pool = mysql.createPool({
  host     : 'localhost',
  user     : 'root',
  password : 'password05',
  database : 'mydb',
  connectionLimit:10
});

/*
 GET users listing. 
router.get('/', function(req, res, next) {
  connection.connect()
  connection.query('select * from sql_store.customers', function (err, rows, fields) {
    if (err) throw err

    console.log('The solution is: ', rows[0])
    res.json(rows[0]);
  })
  connection.end()
  console.log('finished route')
});
*/

router.get("/",(req,res) => {
  console.log("Entering A")
  pool.getConnection((err, connection) => {
      if(err) throw err;
      console.log('connected as id ' + connection.threadId);
      connection.query('select * from sql_store.customers', function (err, rows, fields) {
        if (err) throw err
    
        console.log('The solution is: ', rows[0])
        res.json(rows[0]);
      })

      console.log('finished route')
  });
});

//note: query params
//i.e. http://localhost:3000/users/test?id=111
router.get("/test",(req,res) => {
  console.log(req.query.id)
  pool.getConnection((err, connection) => {
    if(err) throw err;

    //capture first argument
    var nametosearch= req.query.id
    //var nametosearch=1
    //console.log("Name to search: " + nametosearch )

   // myquery= "SELECT * FROM sql_store.customers WHERE customer_id="+nametosearch
   myquery= "SELECT * FROM mydb.Rental_Tool WHERE tool_id="+nametosearch
    connection.query(myquery, function (err, rows, fields) {
      if (err) throw err
  
      console.log('The solution is: ', rows[0])
      res.json(rows[0]);
    })

    console.log('finished route')
});
})

/*
//note: route params
//i.e. http://localhost:3000/users/1
router.get("/:name",(req,res) => {
  console.log(req.query.id)
  pool.getConnection((err, connection) => {
    if(err) throw err;

    //capture first argument
    var nametosearch= req.params['name']
    //var nametosearch=1
    //console.log("Name to search: " + nametosearch )

    myquery= "SELECT * FROM sql_store.customers WHERE customer_id="+nametosearch
    connection.query(myquery, function (err, rows, fields) {
      if (err) throw err
  
      console.log('The solution is: ', rows[0])
      res.json(rows[0]);
    })

    console.log('finished route')
});
})
*/

module.exports = router;

//'select * from mydb.rental_tool'npm
//'select * from mydb.group where mydb.group.group_id in (select mydb.student_groups.group_id from mydb.student_groups where mydb.student_groups.net_id in (select mydb.rental.net_id from mydb.rental where return_date is null AND due_date < now()) );'