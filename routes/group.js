var express = require('express');
var router = express.Router();

//sql connection
var pool = require('../db.js')

router.get("/",(req,res) => {

   myquery= "SELECT * FROM mydb.groups"
    pool.query(myquery, function (err, rows, fields) {
      if (err) throw err
      res.json(rows);
    })

    console.log('finished route')
});

//i.e. http://localhost:port/group/search?id=357
router.get("/search",(req,res) => {
    //arguments
    var id= req.query.id

   myquery= "SELECT * FROM mydb.groups WHERE group_id="+id 
    pool.query(myquery, function (err, rows, fields) {
      if (err) throw err
      res.json(rows);
    })

    console.log('finished route')
});

//i.e. http://localhost:port/group/searchname?name=TeamName
router.get("/searchname",(req,res) => {
  //arguments
  var name= req.query.name

  myquery= "SELECT * FROM mydb.groups WHERE LOWER(group_name) LIKE LOWER('%"+ name+ "%')"
  pool.query(myquery, function (err, rows, fields) {
    if (err) throw err
    res.json(rows);
  })

  console.log('finished route')
});

module.exports = router;