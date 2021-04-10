var express = require('express');
var router = express.Router();
var toUnnamed = require('named-placeholders')();
var pool = require("../db.js");

//sql connection
var pool = require('../db.js')

router.get("/",(req,res) => {

   myquery= "SELECT * FROM mydb.groups"
    pool.query(myquery, function (err, rows, fields) {
      if (err) console.log(err)
      res.json(rows);
    })
});

//i.e. http://localhost:port/group/search?id=357
router.get("/search",(req,res) => {
    //arguments
    var id= req.query.id

   myquery= "SELECT * FROM mydb.groups WHERE group_id=?" 
    pool.query(myquery, [id], function (err, rows, fields) {
      if (err) console.log(err)
      res.json(rows);
    })
});

//i.e. http://localhost:port/group/searchname?name =TeamName
router.get("/searchname",(req,res) => {
  //arguments
  var name= req.query.name

  myquery= "SELECT * FROM mydb.groups WHERE LOWER(group_name) LIKE LOWER(CONCAT('%', ?, '%'))"
  pool.query(myquery, [name], function (err, rows, fields) {
    if (err) console.log(err)
    res.json(rows);
  })
});

/*
{
    "group_id": 357,
    "group_name": "new group name",
    "group_sponsor": "billy"
}
*/

//i.e. http://localhost:port/group/modify
router.post("/modify", (req, res) => {
  (async function sendquery(param) {
      queries = []
      var pool2= pool.promise();
      var query = toUnnamed("SELECT * FROM mydb.Groups WHERE group_id = :group_id", {
          group_id: req.body.group_id,
          group_name: req.body.group_name,
          group_sponsor: req.body.group_sponsor
      });

      queries.push(pool2.query(query[0], query[1]));

      var status = 200;
      var results = await Promise.all(queries);
      console.log("done with queries")
      results.forEach(([rows, fields]) => { if (rows.length == 0) { console.log("No group with that ID"); status = 412; } });
      if (status == 400) {
          return res.status(status).send("INVALID_ID");
      }

      queries = []
      console.log("down here")
      var query = toUnnamed("UPDATE mydb.Groups SET group_name= :group_name, group_sponsor= :group_sponsor WHERE group_id= :group_id", {
        group_id: req.body.group_id,
        group_name: req.body.group_name,
        group_sponsor: req.body.group_sponsor
      });
      queries.push(pool2.query(query[0], query[1]));
      status = 200;
      var results = await Promise.all(queries).catch(() => { status = 400; });
      if(status==200){
        return res.status(status).send("SUCCESS");
      }
      else{
        return res.status(status).send("SQL_ERROR");
      }
  })();
});

module.exports = router;