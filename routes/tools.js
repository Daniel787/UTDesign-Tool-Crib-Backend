var express = require('express');
var router = express.Router();

//sql connection
var pool = require('../db.js')

router.get("/",(req,res) => {

  myquery= "SELECT * FROM mydb.rental_tool"
  connection.query(myquery, function (err, rows, fields) {
    if (err) throw err
    res.json(rows);
  })

  console.log('finished route')
});

//i.e. http://localhost:port/tools/search?id=111
router.get("/search",(req,res) => {
  //arguments
  var id= req.query.id

  myquery= "SELECT * FROM mydb.rental_tool WHERE tool_id=?"
  connection.query(myquery, [id], function (err, rows, fields) {
    if (err) throw err
    res.json(rows);
  })

  console.log('finished route')
});
 
//i.e. http://localhost:port/tools/searchname?name=ham
router.get("/searchname",(req,res) => {
  //arguments
  var name= req.query.name

    myquery= "SELECT * FROM mydb.rental_tool WHERE LOWER(name) LIKE LOWER(CONCAT('%', ?, '%'))"
    pool.query(myquery, function (err, rows, fields) {
      if (err) throw err
  
      console.log('The solution is: ', rows)
      res.json(rows);
    })

    console.log('finished route')
});

module.exports = router;