var express = require('express');
var router = express.Router();
var toUnnamed = require('named-placeholders')();
var pool = require("../db.js");

//sql connection
var pool = require('../db.js')

function validate(id, name, sponsor) {
  //check if valid id
  var regex=/[0-9]/; //only 1-9
  var letters=/[a-zA-Z]/
  if(! regex.test(id) || letters.test(id)){
      console.log("A")
      return -1;
  }
  return 1;
}

router.get("/", (req, res) => {

  myquery = "SELECT * FROM mydb.groups"
  pool.query(myquery, function (err, rows, fields) {
    if (err) console.log(err)
    res.json(rows);
  })
});

router.get("/withmembers", (req, res) => {

  myquery =
    "SELECT ghs.group_id, g.group_name, g.group_sponsor, ghs.net_id, s.name, s.email, s.utd_id, s.student_hold, ghs.display  "
    + "FROM mydb.group_has_student ghs, mydb.student s, mydb.groups g "
    + "WHERE ghs.net_id = s.net_id AND ghs.group_id = g.group_id AND g.group_id > 0 "
    + "ORDER BY ghs.group_id, ghs.net_id;"

  if (req.query.json) { //removed == "true"
    myquery =
      "SELECT JSON_OBJECT('group_id', ghs.group_id, 'group_name', g.group_name, 'group_sponsor', g.group_sponsor, 'students'," 
      + " JSON_ARRAYAGG(JSON_OBJECT('net_id', ghs.net_id, 'name', s.name, 'email', s.email, 'utd_id', s.utd_id, 'hold', s.student_hold, 'display', ghs.display))) `group` "
      + "FROM mydb.group_has_student ghs, mydb.student s, mydb.groups g "
      + "WHERE ghs.net_id = s.net_id AND ghs.group_id = g.group_id AND g.group_id > 0 "
      + "GROUP BY ghs.group_id "
      + "ORDER BY ghs.group_id, ghs.net_id;"
  }
  pool.query(myquery, function (err, rows, fields) {
    if (err) console.log(err)
    res.json(rows);
  })
});

router.get("/detailed", (req, res) => {
  myquery =
    "SELECT g.group_id, JSON_ARRAYAGG(JSON_OBJECT('net_id', g.net_id, 'name', g.name, 'tools', g.tools)) students "
    + "FROM  "
    + "  (SELECT s.group_id, s.net_id, s.name, JSON_ARRAYAGG(JSON_OBJECT('tool_id', s.tool_id, 'status', s.status)) tools "
    + "  FROM  "
    + "  mydb.group_details s "
    + "  GROUP BY s.group_id, s.net_id "
    + "  ORDER BY s.net_id) g "
    + "GROUP BY g.group_id "
    + "ORDER BY g.group_id; "

  pool.query(myquery, function (err, rows, fields) {
    if (err) console.log(err)
    res.json(rows);
  })
});

router.get("/withmembers/search", (req, res) => {

  var myquery;
  //csv
  if (req.query.group_id) {
    myquery = toUnnamed(
      "SELECT ghs.group_id, g.group_name, g.group_sponsor, ghs.net_id, s.name, s.email, s.utd_id, s.student_hold  "
      + "FROM mydb.group_has_student ghs, mydb.student s, mydb.groups g "
      + "WHERE ghs.net_id = s.net_id AND ghs.group_id = g.group_id AND ghs.group_id = :group_id "
      + "ORDER BY ghs.group_id, ghs.net_id;", {
      group_id: req.query.group_id
    });
  }
  else if (req.query.name) {
    myquery = toUnnamed(
      "SELECT ghs.group_id, g.group_name, g.group_sponsor, ghs.net_id, s.name, s.email, s.utd_id, s.student_hold  "
      + "FROM mydb.group_has_student ghs, mydb.student s, mydb.groups g "
      + "WHERE ghs.net_id = s.net_id AND ghs.group_id = g.group_id AND LOWER(g.group_name) LIKE LOWER(:name) "
      + "ORDER BY ghs.group_id, ghs.net_id;", {
      name: "%" + req.query.name + "%"
    });
  }
  else {
    //invalid parameters
    return res.json({"message":'MISSING_PARAMS'});
  }

  //json
  if (req.query.json == "true") {
    if (req.query.group_id) {
      myquery = toUnnamed(
        "SELECT JSON_OBJECT('group_id', ghs.group_id, 'group_name', g.group_name, 'group_sponsor', g.group_sponsor, 'students', JSON_ARRAYAGG(JSON_OBJECT('net_id', ghs.net_id, 'name', s.name, 'email', s.email, 'utd_id', s.utd_id, 'hold', s.student_hold))) `group` "
      + "FROM mydb.group_has_student ghs, mydb.student s, mydb.groups g "
      + "WHERE ghs.net_id = s.net_id AND ghs.group_id = g.group_id AND ghs.group_id = g.group_id AND ghs.group_id = :group_id "
      + "GROUP BY ghs.group_id "
      + "ORDER BY ghs.group_id, ghs.net_id;", {
        group_id: req.query.group_id
      });
    }
    else if (req.query.name) {
      myquery = toUnnamed(
        "SELECT JSON_OBJECT('group_id', ghs.group_id, 'group_name', g.group_name, 'group_sponsor', g.group_sponsor, 'students', JSON_ARRAYAGG(JSON_OBJECT('net_id', ghs.net_id, 'name', s.name, 'email', s.email, 'utd_id', s.utd_id, 'hold', s.student_hold))) `group` "
      + "FROM mydb.group_has_student ghs, mydb.student s, mydb.groups g "
      + "WHERE ghs.net_id = s.net_id AND ghs.group_id = g.group_id AND LOWER(g.group_name) LIKE LOWER(:name) "
      + "GROUP BY ghs.group_id "
      + "ORDER BY ghs.group_id, ghs.net_id;", {
        name: "%" + req.query.name + "%"
      });
    }
    else {
      //invalid parameters
      return res.json({"message":'MISSING_PARAMS'});
    }
  }
  pool.query(myquery[0], myquery[1], function (err, rows, fields) {
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
    var pool2 = pool.promise();
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
      return res.json({"message":'INVALID_ID'});
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
    if (status == 200) {
      return res.json({"message":'SUCCESS'});
    }
    else {
      return res.json({"message":'SQL_ERROR'});
    }
  })();
});

router.post("/deleteMember", (req, res) => {
  var net_id= req.body.net_id;
  var group_id= req.body.group_id;

  (async function sendquery(param) {
      var pool2 = pool.promise();
      queries = []

      var query = toUnnamed("SELECT * FROM mydb.group_has_student ghs WHERE (ghs.net_id = :net_id AND ghs.group_id= :group_id) " , {
          net_id: net_id,
          group_id: group_id
      });
      queries.push(pool2.query(query[0], query[1]));
    

      var status = 200;
      var results = await Promise.all(queries);
      
      results.forEach(([rows, fields]) => { console.log(rows.length); if (rows.length == 0) { console.log("That student group pair doesn't exist"); status = 400; } });
      if (status == 400) {
        return res.json({ message: "NONEXISTENT_PAIR" });
      }

      var pool2 = pool.promise();
      console.log(net_id, group_id)
      queries = []
      var query = toUnnamed("UPDATE mydb.group_has_student ghs SET display=0 WHERE ghs.net_id = :net_id AND ghs.group_id= :group_id" , {
        net_id: net_id,
        group_id: group_id
      });
  
      queries.push(pool2.query(query[0], query[1]));
    
      console.log("A")
      var status = 200;
      var results = await Promise.all(queries); //.catch(() => { console.log("Deletion of pair failed."); status = 400; });
      if (status == 400) {
          return res.json({ message: "SQL_ERROR" });
      }
      else {
          return res.json({ message: "SUCCESS" });
      }
  })();
});

//This route to add a student to a group
router.post("/insertMember", (req, res) => {
  var numduplicate = 0, numsuccess = 0, numfailed = 0;

  (async function sendquery(param) {
      newtuples=[]
      oldtuples=[]
      failedinserts=[]
      status=200;

      var net_id= req.body.net_id;
      var group_id= req.body.group_id;

      var proceed=1;
      //easy checks that don't require queries
      if( net_id < 0 || group_id < 0 || 
          net_id== "" || net_id== null || group_id == "" || group_id == null){
          proceed=0;
          failedinserts.push({ "net_id": id, "group_id": group_id});
          numfailed = numfailed+1;
          var myjson = {
              "conflictinserts": { "old": oldtuples, "new": newtuples }, "failedinserts": failedinserts,
              "numtotal": 1, "numduplicate": numduplicate, "numsuccess": numsuccess, "numfailed": numfailed
          }
          return res.json(myjson); //return early b/c there is only one insert
      }

      //Check 1- Student exists?
      var pool2 = pool.promise();
      var queries=[]
      var query = toUnnamed("SELECT * FROM mydb.Student s WHERE s.net_id = :net_id", {
          net_id: net_id,
      });
      queries.push(pool2.query(query[0], query[1]));
      var results = await Promise.all(queries);

      results.forEach(([rows, fields]) => {
          if (rows.length == 0) {
              //oldtuples.push({ "group_id": rows[0].group_id, "n": rows[0].name, "sponsor": rows[0].sponsor })
              //newtuples.push({ "group_id": parseInt(id), "name": name, "sponsor": parseInt(sponsor)})
              console.log("That student doesn't exist!");
              status = 400;
              //proceed = 0;
          }
      });

      if(status == 400){
        return res.json({ message: "NONEXISTENT_STUDENT" });
      }

      //Check 2- Group exists?
      var queries=[]
      var pool2 = pool.promise();
      var query = toUnnamed("SELECT * FROM mydb.Groups g WHERE g.group_id = :group_id", {
          group_id: group_id
      });
      queries.push(pool2.query(query[0], query[1]));
      var results = await Promise.all(queries);

      results.forEach(([rows, fields]) => {
          if (rows.length == 0) {
              console.log("That group doesn't exist.");
              status = 400;
              //numduplicate = numduplicate + 1 
              //proceed = 0;
          }
      });
      if(status == 400){
        return res.json({ message: "NONEXISTENT_GROUP" });
      }

      //Check 3- student, group pair already exists?
      var queries=[]
      var pool2 = pool.promise();
      var query = toUnnamed("SELECT * FROM mydb.Group_Has_Student ghs WHERE ghs.group_id = :group_id AND ghs.net_id=:net_id", {
          group_id: group_id,
          net_id: net_id
      });
      queries.push(pool2.query(query[0], query[1]));
      var results = await Promise.all(queries);

      results.forEach(([rows, fields]) => {
          if (rows.length == 1) {
              console.log("That student group pair already exists.");
              status = 400;
              //numduplicate = numduplicate + 1 
              //proceed = 0;
          }
      });
      if(status == 400){
        return res.json({ message: "SUCCESS" });
      }

      //if(proceed){
      //Proceed to insert
      var queries = []
      var query = toUnnamed("INSERT into mydb.Group_Has_Student VALUES(:group_id, :net_id, 1)", {
          group_id: group_id,
          net_id: net_id
      });
      queries.push(pool2.query(query[0], query[1]));
      await Promise.all(queries).catch(() => { console.log("Some sql error in insertion"); status = 400; numfailed=numfailed+1;});
      //}
      numsuccess= 1-(oldtuples.length + failedinserts.length + numduplicate);
      //there shouldn't be any conflict inserts in this route, but I'm keeping the json the same as the other insert routes
      myjson = {
          "conflictinserts": { "old": oldtuples, "new": newtuples }, "failedinserts": failedinserts,
          "numtotal": 1, "numduplicate": numduplicate, "numsuccess": numsuccess, "numfailed": numfailed
      }

      if (status == 400) {
          return res.json({ message: "SQL_ERROR" });
      }
      else {
        return res.json({ message: "SUCCESS" });
      }
  })();   
});

router.post("/insert", (req, res) => {
  var numduplicate = 0, numsuccess = 0, numfailed = 0;

  (async function sendquery(param) {
      newtuples=[]
      oldtuples=[]
      failedinserts=[]
      status=200;

      var id= req.body.group_id;
      var name= req.body.group_name;
      var sponsor= req.body.group_sponsor;

      var proceed=1;
      //easy checks that don't require queries
      if( (validate(id,name,sponsor)  == -1) || id < 0 || 
          id== "" || id== null || name == "" || name == null || sponsor== "" || sponsor == null ){
          proceed=0;
          failedinserts.push({ "group_id": id, "name": name, "sponsor": sponsor});
          numfailed = numfailed+1;
          var myjson = {
              "conflictinserts": { "old": oldtuples, "new": newtuples }, "failedinserts": failedinserts,
              "numtotal": 1, "numduplicate": numduplicate, "numsuccess": numsuccess, "numfailed": numfailed
          }
          return res.json(myjson);
      }

      var pool2 = pool.promise();
      var queries=[]
      //we want to examine matching group id, but difference something else
      var query = toUnnamed("SELECT * FROM mydb.Groups g WHERE g.group_id = :group_id AND (group_name <> :group_name OR"
          + " group_sponsor <> :group_sponsor)", {
          group_id: id,
          group_name: name,
       
          group_sponsor: sponsor
      });
      queries.push(pool2.query(query[0], query[1]));
      var results = await Promise.all(queries);

      results.forEach(([rows, fields]) => {
          if (rows.length == 1) {
              oldtuples.push({ "group_id": rows[0].group_id, "name": rows[0].group_name, "sponsor": rows[0].group_sponsor })
              newtuples.push({ "group_id": parseInt(id), "name": name, "sponsor": sponsor})
              console.log("That group exists, but you have supplied different values for one of the attributes");
              status = 400;
              proceed = 0;
          }
      });

      var queries=[]
      var pool2 = pool.promise();
      //matching everything
      var query = toUnnamed("SELECT * FROM mydb.Groups g WHERE g.group_id = :group_id AND group_name = :group_name AND"
          + " group_sponsor = :group_sponsor", {
          group_id: id,
          group_name: name,
          group_sponsor: sponsor
      });
      queries.push(pool2.query(query[0], query[1]));
      var results = await Promise.all(queries);

      results.forEach(([rows, fields]) => {
          if (rows.length == 1) {
              console.log("That group exists, and is entirely identical to one in the database. Will not be inserted.");
              status = 400;
              numduplicate = numduplicate + 1 
              proceed = 0;
          }
      });

      if(proceed){
          var queries = []
          var query = toUnnamed("INSERT into mydb.Groups VALUES(:group_id, :name, :sponsor)", {
              group_id: id,
              name: name,
              sponsor: sponsor
          });
          queries.push(pool2.query(query[0], query[1]));
          await Promise.all(queries).catch(() => { console.log("Some sql error in insertion"); status = 400; numfailed=numfailed+1;});
      }
      numsuccess= 1-(oldtuples.length + failedinserts.length + numduplicate);
      myjson = {
          "conflictinserts": { "old": oldtuples, "new": newtuples }, "failedinserts": failedinserts,
          "numtotal": 1, "numduplicate": numduplicate, "numsuccess": numsuccess, "numfailed": numfailed
      }

      if (status == 400) {
          return res.json(myjson);
      }
      else {
        return res.json({ message: "SUCCESS" });
      }
  })();   
});

module.exports = router;