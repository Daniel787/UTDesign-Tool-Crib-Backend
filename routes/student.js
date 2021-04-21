var express = require('express');
var router = express.Router();
const readXlsxFile = require('read-excel-file/node');
var toUnnamed = require('named-placeholders')();

//sql connection
var pool = require('../db.js')

function validate(id, name, email) {
  //all are strings, so no checks implemented for now
  return 1;
}

router.get("/", (req, res) => {
  myquery = "SELECT * FROM mydb.student"
  pool.query(myquery, function (err, rows, fields) {
    if (err) console.log(err)
    res.json(rows);
  })
});

router.get("/withgroups", (req, res) => {
  myquery =
    "SELECT  ghs.net_id, ghs.display, s.name, s.email, s.utd_id, s.student_hold, ghs.group_id, g.group_name, g.group_sponsor "
    + "FROM mydb.group_has_student ghs, mydb.student s, mydb.groups g "
    + "WHERE ghs.net_id = s.net_id AND ghs.group_id = g.group_id"
    + "ORDER BY ghs.net_id, ghs.group_id;"

  if (req.query.json == "true") {
    myquery =
      "SELECT JSON_OBJECT('net_id', ghs.net_id, 'name', s.name, 'email', s.email, 'utd_id', s.utd_id, 'hold', s.student_hold, 'groups', JSON_ARRAYAGG(JSON_OBJECT('group_id', ghs.group_id, 'group_name', g.group_name, 'group_sponsor', g.group_sponsor))) student "
      + "FROM mydb.group_has_student ghs, mydb.student s, mydb.groups g "
      + "WHERE ghs.net_id = s.net_id AND ghs.group_id = g.group_id "
      + "GROUP BY ghs.net_id "
      + "ORDER BY ghs.net_id, ghs.group_id;"
  }

  pool.query(myquery, function (err, rows, fields) {
    if (err) console.log(err)
    res.json(rows);
  })
});

router.get("/withgroups/search", (req, res) => {

  var myquery;
  //csv
  if (req.query.net_id) {
    myquery = toUnnamed(
      "SELECT  ghs.net_id, s.name, s.email, s.utd_id, s.student_hold, ghs.group_id, g.group_name, g.group_sponsor "
      + "FROM mydb.group_has_student ghs, mydb.student s, mydb.groups g "
      + "WHERE ghs.net_id = s.net_id AND ghs.group_id = g.group_id AND s.net_id = :net_id "
      + "ORDER BY ghs.net_id, ghs.group_id;", {
      net_id: req.query.net_id
    });
  }
  else if (req.query.name) {
    myquery = toUnnamed(
      "SELECT  ghs.net_id, s.name, s.email, s.utd_id, s.student_hold, ghs.group_id, g.group_name, g.group_sponsor "
      + "FROM mydb.group_has_student ghs, mydb.student s, mydb.groups g "
      + "WHERE ghs.net_id = s.net_id AND ghs.group_id = g.group_id AND LOWER(s.name) LIKE LOWER(:name) "
      + "ORDER BY ghs.net_id, ghs.group_id;", {
      name: "%" + req.query.name + "%"
    });
  }
  else {
    //invalid parameters
    return res.status(400).send("MISSING_PARAMS");
  }

  //json
  if (req.query.json == "true") {
    if (req.query.net_id) {
      myquery = toUnnamed(
        "SELECT JSON_OBJECT('net_id', ghs.net_id, 'name', s.name, 'email', s.email, 'utd_id', s.utd_id, 'hold', s.student_hold, 'groups', JSON_ARRAYAGG(JSON_OBJECT('group_id', ghs.group_id, 'group_name', g.group_name, 'group_sponsor', g.group_sponsor))) student "
        + "FROM mydb.group_has_student ghs, mydb.student s, mydb.groups g "
        + "WHERE ghs.net_id = s.net_id AND ghs.group_id = g.group_id AND s.net_id = :net_id "
        + "GROUP BY ghs.net_id "
        + "ORDER BY ghs.net_id, ghs.group_id;", {
        net_id: req.query.net_id
      });
    }
    else if (req.query.name) {
      myquery = toUnnamed(
        "SELECT JSON_OBJECT('net_id', ghs.net_id, 'name', s.name, 'email', s.email, 'utd_id', s.utd_id, 'hold', s.student_hold, 'groups', JSON_ARRAYAGG(JSON_OBJECT('group_id', ghs.group_id, 'group_name', g.group_name, 'group_sponsor', g.group_sponsor))) student "
        + "FROM mydb.group_has_student ghs, mydb.student s, mydb.groups g "
        + "WHERE ghs.net_id = s.net_id AND ghs.group_id = g.group_id AND LOWER(s.name) LIKE LOWER(:name) "
        + "GROUP BY ghs.net_id "
        + "ORDER BY ghs.net_id, ghs.group_id;", {
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

//i.e. http://localhost:port/student/search?net_id=180004
router.get("/search", (req, res) => {
  //arguments
  var net_id = req.query.net_id

  myquery = "SELECT * FROM mydb.student WHERE net_id=?"
  pool.query(myquery, [net_id], function (err, rows, fields) {
    if (err) console.log(err)
    res.json(rows);
  })
});

router.get("/holds", (req, res) => {

  myquery = "SELECT * FROM mydb.student WHERE student_hold = true"
  pool.query(myquery, function (err, rows, fields) {
    if (err) console.log(err)
    res.json(rows);
  })
});

router.get("/holds/detailed", (req, res) => {

  myquery =
    "select mydb.transaction.group_id, mydb.transaction.net_id, mydb.student.name, mydb.rental_tool.tool_id, mydb.rental_tool.name, mydb.transaction.date as rental_start "
    + "from mydb.transaction, mydb.rented_tool, mydb.rental_tool, mydb.student "
    + "where mydb.transaction.transaction_id= mydb.rented_tool.transaction_id "
    + "and mydb.transaction.net_id = mydb.student.net_id "
    + "and mydb.rented_tool.tool_id = mydb.rental_tool.tool_id "
    + "and mydb.rented_tool.returned_date is null;"
  pool.query(myquery, function (err, rows, fields) {
    if (err) console.log(err)
    res.json(rows);
  })
});


router.get("/holds/withtools/json", (req, res) => {

  myquery =
   "SELECT JSON_OBJECT('net_id', s.net_id, 'name', s.name, 'email', s.email, 'utd_id', s.utd_id, 'hold', s.student_hold, 'tools',  "
  +"JSON_ARRAYAGG(JSON_OBJECT('group_id', t.group_id, 'tool_id', tool.tool_id, 'tool name', tool.name, 'start_date', t.date, 'hours_rented', rt.hours_rented))) student "
  +"FROM mydb.transaction t, mydb.rented_tool rt, mydb.rental_tool tool, mydb.student s "
  +"WHERE t.transaction_id = rt.transaction_id "
  +"AND t.net_id = s.net_id "
  +"AND rt.tool_id = tool.tool_id "
  +"AND rt.returned_date is null "
  +"GROUP BY s.net_id;"
  
  pool.query(myquery, function (err, rows, fields) {
    if (err) console.log(err)
    res.json(rows);
  })
});

/*var query = toUnnamed("INSERT into mydb.Student VALUES(:net_id, :name, :email, :utd_id, :student_hold)", {
  net_id: req.body.net_id,
  email: req.body.email,
  utd_id: req.body.utd_id,
  name: req.body.name,
  student_hold: req.body.student_hold
});*/

router.post("/insert", (req, res) => {
  var numduplicate = 0, numsuccess = 0, numfailed = 0;

  (async function sendquery(param) {
      newtuples=[]
      oldtuples=[]
      failedinserts=[]
      status=200;

      var id= req.body.net_id;
      var name= req.body.name;
      var email= req.body.email;
      var utd_id= req.body.utd_id;

      var proceed=1;
      //easy checks that don't require queries
      if( (validate(id,name,email)  == -1) || id < 0 || 
          id== "" || id== null || name == "" || name == null || email== "" || email == null ){
          proceed=0;
          failedinserts.push({ "group_id": id, "name": name, "email": email});
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
      var query = toUnnamed("SELECT * FROM mydb.Student s WHERE s.net_id = :id AND (name <> :name OR"
          + " email <> :email)", {
          id: id,
          name: name,
          email: email,
      });
      queries.push(pool2.query(query[0], query[1]));
      var results = await Promise.all(queries);
      
      results.forEach(([rows, fields]) => {
          if (rows.length == 1) {
              console.log("C")
              oldtuples.push({ "id": rows[0].group_id, "name": rows[0].name, "email": rows[0].email })
              newtuples.push({ "group_id": parseInt(id), "name": name, "email": email})
              console.log("That group exists, but you have supplied different values for one of the attributes");
              status = 400;
              proceed = 0;
          }
      });
      
      var queries=[]
      var pool2 = pool.promise();
      //matching everything
      var query = toUnnamed("SELECT * FROM mydb.Student s WHERE s.net_id = :id AND s.name = :name AND s.email = :email", {
        id: id,
        name: name,
        email: email
      });
      queries.push(pool2.query(query[0], query[1]));
      var results = await Promise.all(queries);

      results.forEach(([rows, fields]) => {
          if (rows.length == 1) {
              console.log("That student exists, and is entirely identical to one in the database. Will not be inserted.");
              status = 400;
              numduplicate = numduplicate + 1 
              proceed = 0;
          }
      });

      if(proceed){
          var queries = []
          console.log("", id, name, email)
          var query = toUnnamed("INSERT into mydb.Student VALUES(:id, :name, :email, :utd_id, 0);"
                              +  "INSERT into mydb.Group_Has_Student VALUES (0, :id, 0)", {
            id: id,
            name: name,
            email: email,
            utd_id: utd_id
          });
          queries.push(pool2.query(query[0], query[1]));
          await Promise.all(queries).catch(() => { failedinserts.push({ "net_id": id, "name": name, "email": email});
          console.log("Some sql error in insertion"); status = 400; numfailed=numfailed+1;});
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
          return res.send("SUCCESS");
      }
  })(); 
  

  
});

//i.e. http://localhost:port/group/modify
router.post("/modify", (req, res) => {
  (async function sendquery(param) {
    queries = []
    var pool2 = pool.promise();
    var query = toUnnamed("SELECT * FROM mydb.Student WHERE net_id = :net_id", {
      net_id: req.body.net_id,
      name: req.body.name,
      email: req.body.email,
      utd_id: req.body.utd_id,
      student_hold: req.body.student_hold
    });

    queries.push(pool2.query(query[0], query[1]));

    var status = 200;
    var results = await Promise.all(queries);
    console.log("done with queries")
    results.forEach(([rows, fields]) => { if (rows.length == 0) { console.log("No student with that ID"); status = 412; } });
    if (status == 400) {
      return res.status(status).send("INVALID_ID");
    }

    queries = []
    console.log("down here")
    var query = toUnnamed("UPDATE mydb.Student SET name= :name, email= :email, utd_id= :utd_id, student_hold= :student_hold WHERE net_id = :net_id", {
      net_id: req.body.net_id,
      name: req.body.name,
      email: req.body.email,
      utd_id: req.body.utd_id,
      student_hold: req.body.student_hold
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

router.post("/upload", (req, res) => {
  var failedinserts = []
  var conflictinserts = []
  var newtuples = []
  var oldtuples = []

  var failedgroups = []
  var conflictgroups = []
  var oldgroups = []
  var newgroups = []


  var i, j;
  var status = 200;

  (async function sendquery(param) {
    //Notes: we first run the group checks, then the student checks.
    //Group checks: has group info changed? sponsor, name etc or is it null
    console.log("Number of groups" + req.body.groups.length)
    for (i = 0; i < req.body.groups.length; i++) {
      //declare default values for these 
      var group_id = req.body.groups[i].group_id;
      var group_name = req.body.groups[i].group_name;
      var group_sponsor = req.body.groups[i].group_sponsor;

      if (group_id == null || group_name == null || group_sponsor == null) {
        console.log("group " + i + " has a null field, pushing to failed groups...")
        failedgroups.push({ "group_id": group_id, "group_name": group_name, "group_sponsor:": group_sponsor });
      }

      queries = []
      var pool2 = pool.promise();
      //we want to examine matching group_id
      var query = toUnnamed("SELECT * FROM mydb.groups g WHERE g.group_id = :group_id AND g.group_name = :group_name"
        + " AND group_sponsor = :group_sponsor", {
        group_id: group_id,
        group_name: group_name,
        group_sponsor: group_sponsor
      });
      queries.push(pool2.query(query[0], query[1]));

      var newGroup = 1
      var results = await Promise.all(queries);
      results.forEach(([rows, fields]) => {
        if (rows.length == 1) {  //should be only 1, not 2
          console.log("That group exists, and is entirely identical to one in the database. Will not be inserted.")
          newGroup = 0
        }
      });

      queries = []
      var pool2 = pool.promise();
      //we want to examine matching pgroup id, but difference something else
      var query = toUnnamed("SELECT * FROM mydb.groups g WHERE g.group_id = :group_id AND (g.group_name <> :group_name"
        + " OR group_sponsor <> :group_sponsor)", {
        group_id: group_id,
        group_name: group_name,
        group_sponsor: group_sponsor
      });
      queries.push(pool2.query(query[0], query[1]));

      var results = await Promise.all(queries)
      results.forEach(([rows, fields]) => {
        if (rows.length == 1) {
          console.log("ROWS: " + rows[0].current_cost)
          oldgroups.push({ "group_id": rows[0].group_id, "group_name": rows[0].group_name, "group_sponsor": rows[0].group_sponsor })
          newgroups.push({ "group_id": group_id, "group_name": group_name, "group_sponsor": group_sponsor })
          console.log("That group exists, but you have supplied different values for one of the attributes");
          console.log("oldgroups" + oldgroups)
          console.log("newtuple" + newgroups)
          status = 400;
          newGroup = 0;
          conflictgroups.push([oldgroups, newgroups]) //again, not really necessary
        }
      });

      if (newGroup) {
        //+"INSERT INTO mydb.Groups VALUES(:group_id, :group_name, :sponsor);"
        queries = []
        pool2 = pool.promise();
        var query = toUnnamed("INSERT into mydb.Groups VALUES (:group_id, :group_name, :group_sponsor)", {
          group_id: group_id,
          group_name: group_name,
          group_sponsor: group_sponsor
        });
        queries.push(pool2.query(query[0], query[1]));
        var results2 = await Promise.all(queries).catch(() => {
          console.log("FAILED TO INSERTED GROUP");
          status = 412;
          failedgroups.push({ "group_id": group_id, "group_name": group_name, "group_sponsor": group_sponsor })
        });
      }
    }

    var myjson = ""
    myjson = { "conflictgroups": { "old": oldgroups, "new": newgroups }, "failedgroups": failedgroups, "conflictinserts": conflictinserts, "failedinserts": failedinserts }

    //return here if any groups are screwed
    if (status == 400) {
      return res.status(status).json(myjson);
    }

    //Now enter the process of inserting students. This time, no checks on group are performed.
    for (i = 0; i < req.body.groups.length; i++) {
      var group_id = req.body.groups[i].group_id;
      var group_name = req.body.groups[i].group_name;
      var group_sponsor = req.body.groups[i].group_sponsor;

      for (j = 0; j < req.body.groups[i].students.length; j++) {
        var name = req.body.groups[i].students[j].name
        var net_id = req.body.groups[i].students[j].net_id
        var email = req.body.groups[i].students[j].email

        console.log("NAME: " + name + "    NET_ID:  " + net_id + "   " + "    EMAIL: " + email)
        //Start performing student checks
        //net_id, name, email, utd_id, student_hold
        if ((name == null || email == null || net_id == null)) {
          console.log("student " + j % 3 + " has a null field, skipping...")
          if (!((name == null && email == null && net_id == null))) { //don't want to push all null students to failedinserts 
            failedinserts.push({ "net_id": net_id, "name": name, "email": email, "utd_id": -1, "student_hold": 0 });
          }
        }
        else {
          queries = []
          var pool2 = pool.promise();
          //we want to examine matching student id, but different something else
          var query = toUnnamed("SELECT * FROM mydb.Student s WHERE s.net_id = :net_id AND name = :name AND"
            + " email = :email", {
            name: name,
            email: email,
            net_id: net_id
          });
          queries.push(pool2.query(query[0], query[1]));

          var newStudent = 1
          var secondGroup = 0; //will never be changed unless !newStudent
          var results3 = await Promise.all(queries);
          results3.forEach(([rows, fields]) => {
            if (rows.length == 1) {  //should be only 1, not 2
              console.log("That student exists, and is entirely identical to one in the database. Will not be inserted.")
              newStudent = 0
            }
          });

          queries = []

          var pool2 = pool.promise();
          //we want to examine matching part id, but difference something else
          var query = toUnnamed("SELECT * FROM mydb.Student s WHERE s.net_id = :net_id AND (name <> :name OR"
            + " email <> :email)", {
            name: name,
            email: email,
            net_id: net_id
          });
          queries.push(pool2.query(query[0], query[1]));

          var results2 = await Promise.all(queries);
          results2.forEach(([rows, fields]) => {
            if (rows.length != 0) {
              //net_id, name, email, utd_id, student_hold
              oldtuples.push({ "net_id": rows[0].net_id, "name": rows[0].name, "email": rows[0].email, "utd_id:": rows[0].utd_id, "student_hold": rows[0].student_hold })
              newtuples.push({ "net_id": net_id, "name": name, "email": email, "utd_id:": rows[0].utd_id, "student_hold": rows[0].student_hold })
              console.log("That student exists, but you have supplied different values for either email or name"); //later, we will add net_id to the sheet
              console.log("oldtuple" + oldtuples)
              console.log("newtuple" + newtuples)
              status = 400;
              newStudent = 0;
              conflictinserts.push([oldtuples, newtuples])
            }
          });


          //does the student, group pair exist
          if (!newStudent) {
            queries = []
            var pool2 = pool.promise();
            var query = toUnnamed("SELECT * FROM mydb.Group_has_student ghs WHERE ghs.net_id= :id AND ghs.group_id = :group_id", {
              id: net_id,
              group_id: group_id
            });
            queries.push(pool2.query(query[0], query[1]));

            const results = await Promise.all(queries);
            results.forEach(([rows, fields]) => { if (rows.length == 0) { secondGroup = 0; console.log("The student,group pair already exissts"); } });


            //is he joining a second group?

            queries = []
            var pool2 = pool.promise();
            //query is bad- should return if the student exists AND if his group,student pair is not in the table
            console.log("GHS PAIRS: ", net_id, "       ", group_id)
            var query = toUnnamed("SELECT * FROM mydb.Group_has_student ghs WHERE ghs.group_id = :group_id AND ghs.net_id= :net_id", {
              net_id: net_id,
              group_id: group_id
            });
            queries.push(pool2.query(query[0], query[1]));

            const results4 = await Promise.all(queries);
            results4.forEach(([rows, fields]) => { if (rows.length == 0) { secondGroup = 1; console.log("The student exists, but he is joining another group."); } });
          }
          console.log("NEWSTUDENT: ", newStudent, "secondGroup", secondGroup)
          //newStudent means either the student is brand new OR the student is entering a second group
          if (newStudent && !secondGroup) {
            console.log("Clear to insert student AND student/group relationship: " + net_id + name + email + group_id)
            queries = []
            pool2 = pool.promise();
            var query = toUnnamed("INSERT into mydb.Student VALUES(:net_id, :name, :email, :utd_id, :student_hold);"
              + "INSERT INTO mydb.Group_Has_Student VALUES(:group_id, :net_id, 1)"
              , {
                net_id: net_id,
                name: name,
                email: email,
                utd_id: 0, //this is an optional field
                student_hold: 0,
                group_id: group_id
              });
            queries.push(pool2.query(query[0], query[1]));
            var results2 = await Promise.all(queries).catch(() => {
              console.log("One of the students failed to insert.");
              status = 400;
              failedinserts.push({ "net_id": net_id, "name": name, "email": email, "utd_id:": -1, "student_hold": 0 });
            });
          }
          else if (!newStudent && secondGroup) {
            console.log("Clear to insert student/group relationship: " + net_id + name + email)
            queries = []
            pool2 = pool.promise();
            var query = toUnnamed("INSERT INTO mydb.Group_Has_Student VALUES(:group_id, :net_id, 1)"
              , {
                net_id: net_id,
                group_id: group_id
              });
            queries.push(pool2.query(query[0], query[1]));
            var results2 = await Promise.all(queries).catch(() => {
              console.log("One of the student/group relationships failed to insert.");
              status = 400;
              failedinserts.push({ "net_id": net_id, "name": name, "email": email, "utd_id:": -1, "student_hold": 0 });
            });
          }
          else if (newStudent && secondGroup) {
            console.log("Student is already in the database, but is trying to join a second group")
            console.log("this shouldnt happen?")
          }
          else { //!newStudent and !secondGroup
            console.log("We already have this, skip...")
          }
        }
      }
    }

    var myjson2 = ""
    myjson2 = { "conflictgroups:": conflictgroups, "failedgroups": failedgroups, "conflictinserts": { "old": oldtuples, "new": newtuples }, "failedinserts": failedinserts }
    console.log("FAILED NUMBER: ", failedinserts.length)
    //return here if any groups are screwed
    if (status == 400) {
      return res.status(status).json(myjson2);
    }
    else {
      return res.send("SUCCESS")
    }
  })();
});

module.exports = router;