var express = require('express');
var router = express.Router();
var toUnnamed = require('named-placeholders')();
var pool = require("../db.js");

//sql connection
var pool = require('../db.js')

router.get("/", (req, res) => {

  myquery = "SELECT * FROM mydb.groups"
  pool.query(myquery, function (err, rows, fields) {
    if (err) console.log(err)
    res.json(rows);
  })
});

router.get("/withmembers", (req, res) => {

  myquery =
    "SELECT ghs.group_id, g.group_name, g.group_sponsor, ghs.net_id, s.name, s.email, s.utd_id, s.student_hold  "
    + "FROM mydb.group_has_student ghs, mydb.student s, mydb.groups g "
    + "WHERE ghs.net_id = s.net_id AND ghs.group_id = g.group_id "
    + "ORDER BY ghs.group_id, ghs.net_id;"

  if (req.query.json = "true") {
    myquery =
      "SELECT JSON_OBJECT('group_id', ghs.group_id, 'group_name', g.group_name, 'group_sponsor', g.group_sponsor, 'students', JSON_ARRAYAGG(JSON_OBJECT('net_id', ghs.net_id, 'name', s.name, 'email', s.email, 'utd_id', s.utd_id, 'hold', s.student_hold))) `group` "
      + "FROM mydb.group_has_student ghs, mydb.student s, mydb.groups g "
      + "WHERE ghs.net_id = s.net_id AND ghs.group_id = g.group_id "
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
    "SELECT s.*, u.tool_id, u.status, u.checkout_date, u.due_date FROM "
    + "(SELECT ghs.group_id, ghs.net_id, s.name, s.email, s.utd_id, s.student_hold from mydb.group_has_student ghs, mydb.student s "
    + "WHERE ghs.net_id = s.net_id "
    + "ORDER BY ghs.group_id, ghs.net_id) s "
    + "LEFT JOIN "
    + "( "
    + "  SELECT rtr.tool_id, 'Rented' status, t.group_id group_id, t.net_id net_id, t.date checkout_date,  "
    + "    (cast(from_unixtime(2*60*60 + round((unix_timestamp(t.date)+30*5)/(60*5))*(60*5)) as datetime(3))) due_date  "
    + "  FROM mydb.transaction t , mydb.rented_tool rtr "
    + "  WHERE (t.transaction_id = rtr.transaction_id) "
    + "    AND (rtr.returned_date IS NULL) "
    + "    AND NOW() <= (cast(from_unixtime(2*60*60 + round((unix_timestamp(t.date)+30*5)/(60*5))*(60*5)) as datetime(3))) "
    + "  UNION "
    + "  SELECT rto.tool_id, 'Overdue' status, t.group_id group_id, t.net_id net_id, t.date checkout_date,  "
    + "    (cast(from_unixtime(2*60*60 + round((unix_timestamp(t.date)+30*5)/(60*5))*(60*5)) as datetime(3))) due_date  "
    + "  FROM mydb.transaction t , mydb.rented_tool rto "
    + "  WHERE (t.transaction_id = rto.transaction_id) "
    + "    AND (rto.returned_date IS NULL)  "
    + "    AND NOW() > (cast(from_unixtime(2*60*60 + round((unix_timestamp(t.date)+30*5)/(60*5))*(60*5)) as datetime(3)))  "
    + "  UNION "
    + "  SELECT rta.tool_id, 'Available' status, null group_id, null net_id, null checkout_date, null due_date "
    + "  FROM mydb.rental_tool rta "
    + "  WHERE rta.tool_id  "
    + "    NOT IN (SELECT rt.tool_id "
    + "      FROM mydb.transaction t, mydb.rented_tool rt "
    + "      WHERE (t.transaction_id = rt.transaction_id) "
    + "        AND(rt.returned_date IS NULL) "
    + "      ORDER BY REVERSE (t.date)) "
    + ") u "
    + "ON "
    + "u.net_id = s.net_id AND u.group_id = s.group_id;"

  pool.query(myquery, function (err, rows, fields) {
    if (err) console.log(err)

    res.json(rows);
  })
});

router.get("/detailed2", (req, res) => {
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
    return res.status(400).send("MISSING_PARAMS");
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
      return res.status(400).send("MISSING_PARAMS");
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
    if (status == 200) {
      return res.status(status).send("SUCCESS");
    }
    else {
      return res.status(status).send("SQL_ERROR");
    }
  })();
});

module.exports = router;