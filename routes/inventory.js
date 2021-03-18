var express = require('express');
var router = express.Router();

//sql connection
var pool = require('../db.js')

//i.e. http://localhost:port/inventory/
router.get("/",(req,res) => {

  myquery= "SELECT * FROM mydb.inventory_part"
    pool.query(myquery, function (err, rows, fields) {
      if (err) throw err
  
      console.log('The solution is: ', rows)
      res.json(rows);
    })

    console.log('finished route')
});

//i.e. http://localhost:port/inventory/search?id=12345
router.get("/search",(req,res) => {
  //arguments
  var id= req.query.id

  myquery= "SELECT * FROM mydb.inventory_part WHERE part_id="+id
    pool.query(myquery, function (err, rows, fields) {
      if (err) throw err
  
      console.log('The solution is: ', rows)
      res.json(rows);
    })

    console.log('finished route')
});

module.exports = router;