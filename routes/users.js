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

/* GET users listing. */
router.get('/', function(req, res, next) {
  connection.connect()
  connection.query('select * from mydb.group where mydb.group.group_id in (select mydb.student_groups.group_id from mydb.student_groups where mydb.student_groups.net_id in (select mydb.rental.net_id from mydb.rental where return_date is null AND due_date < now()) );', function (err, rows, fields) {
    if (err) throw err

    console.log('The solution is: ', rows[0])
    res.json(rows[0]);
  })
  connection.end()
  console.log('finished route')
});



module.exports = router;

//'select * from mydb.rental_tool'npm
//'select * from mydb.group where mydb.group.group_id in (select mydb.student_groups.group_id from mydb.student_groups where mydb.student_groups.net_id in (select mydb.rental.net_id from mydb.rental where return_date is null AND due_date < now()) );'