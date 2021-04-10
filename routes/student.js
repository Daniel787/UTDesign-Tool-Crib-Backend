var express = require('express');
var router = express.Router();
const readXlsxFile = require('read-excel-file/node');
var toUnnamed = require('named-placeholders')();

//sql connection
var pool = require('../db.js')

router.get("/", (req, res) => {
  myquery = "SELECT * FROM mydb.student"
  pool.query(myquery, function (err, rows, fields) {
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

router.post("/insert", (req, res) => {
  console.log("O3")
  var query = toUnnamed("INSERT into mydb.Student VALUES(:net_id, :name, :email, :utd_id, :student_hold)", {
    net_id: req.body.net_id,
    email: req.body.email,
    utd_id: req.body.utd_id,
    name: req.body.name,
    student_hold: req.body.student_hold
  });

  pool.query(query[0], query[1], function (err, rows, fields) {
    if (err) console.log(err)

    console.log('Response: ', rows)
    res.send("finished");
  });
});

router.post("/upload", (req, res) => {
  var failedinserts = []
  var conflictinserts = [] 
  var newtuples = []
  var oldtuples = []

  var failedgroups = []
  var conflictgroups = [] 
  var oldgroups=[]
  var newgroups=[]

  readXlsxFile('ExampleStudentGroupsSheet.xlsx').then((rows) => { //later change this to parse json object
    var i, j;
    var status = 200;

    (async function sendquery(param) {
      //Notes: we first run the group checks, then the student checks.
      //Group checks: has group info changed? sponsor, name etc or is it null
      console.log("rows.length" + rows.length)
      for (i = 1; i < rows.length; i++) { //ignore first row, it is header
        console.log("GROUP: " + group_id + "    NAME:   " + group_name + "    SPONSOR:   " + group_sponsor)
        //declare default values for these 
        var group_id = rows[i][0];
        var group_name = rows[i][3];
        var group_sponsor = rows[i][4]

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

        if(newGroup){
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
            status=412;
            failedgroups.push({ "group_id": group_id, "group_name": group_name, "group_sponsor": group_sponsor })
          });
        }
      }

      var myjson = ""
      myjson = { "conflictgroups": { "old": oldgroups, "new": newgroups }, "failedgroups": failedgroups, "conflictinserts": conflictinserts, "failedinserts": failedinserts}

      //return here if any groups are screwed
      if (status == 400) {
          return res.status(status).json(myjson);
      }
      
      //Now enter the process of inserting students. This time, no checks on group are performed.
      for (i = 1; i < rows.length; i++) {
        var group_id = rows[i][0];
        var group_name = rows[i][3]; //dont need this and sponsor for this insert student
        var group_sponsor = rows[i][4]

        for (j = 6; j < 24; j++) { //TODO: also don't hardcode this
            var name = rows[i][j]
            j++;
            var net_id = rows[i][j]
            j++;
            var email = rows[i][j]
             
            console.log("NAME: " + name + "    NET_ID:  " + net_id + "   " + "    EMAIL: " + email)
            //Start performing student checks
            //net_id, name, email, utd_id, student_hold
            if ( (name == null || email == null || net_id == null)) {
              console.log("student " + j % 3 + " has a null field, skipping...")
              if(! ((name == null && email == null && net_id == null) )){ //don't want to push all null students to failedinserts 
                failedinserts.push({ "net_id": net_id, "name" :name, "email": email, "utd_id": -1, "student_hold":0 });
              }
            }
            else {
              queries = []
              var pool2 = pool.promise();
              //we want to examine matching student id, but different something else
              var query = toUnnamed("SELECT * FROM mydb.Student s WHERE s.net_id = :net_id AND name = :name AND"
                  + " email = :email", {
                  name:name,
                  email:email,
                  net_id:net_id
              });
              queries.push(pool2.query(query[0], query[1]));

              var newStudent = 1
              var secondGroup=0; //will never be changed unless !newStudent
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
                name:name,
                email:email,
                net_id:net_id
              });
              queries.push(pool2.query(query[0], query[1]));

              var results2 = await Promise.all(queries);
              results2.forEach(([rows, fields]) => {
                if (rows.length != 0) {
                  //net_id, name, email, utd_id, student_hold
                  oldtuples.push({ "net_id": rows[0].net_id, "name": rows[0].name, "email": rows[0].email, "utd_id:": rows[0].utd_id, "student_hold": rows[0].student_hold })
                  newtuples.push({ "net_id": net_id, "name": name, "email": email, "utd_id:": rows[0].utd_id, "student_hold": rows[0].student_hold  })
                  console.log("That student exists, but you have supplied different values for either email or name"); //later, we will add net_id to the sheet
                  console.log("oldtuple" + oldtuples)
                  console.log("newtuple" + newtuples)
                  status = 400;
                  newStudent = 0;
                  conflictinserts.push([oldtuples, newtuples])
                }
              });

              
              //does the student, group pair exist
              if(! newStudent){
                queries = []
                var pool2 = pool.promise();
                var query = toUnnamed("SELECT * FROM mydb.Group_has_student ghs WHERE ghs.net_id= :id AND ghs.group_id = :group_id", {
                  id: net_id,
                  group_id: group_id
                });
                queries.push(pool2.query(query[0], query[1]));

                const results = await Promise.all(queries);
                results.forEach(([rows, fields]) => { if (rows.length == 0) {secondGroup=0; console.log("The student,group pair already exissts"); } });
              

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
                results4.forEach(([rows, fields]) => { if (rows.length == 0) { secondGroup=1; console.log("The student exists, but he is joining another group."); } });
              }
              console.log("NEWSTUDENT: ", newStudent, "secondGroup", secondGroup)
                //newStudent means either the student is brand new OR the student is entering a second group
                if (newStudent && !secondGroup) {
                  console.log("Clear to insert student AND student/group relationship: " + net_id + name + email + group_id)
                  queries = []
                  pool2 = pool.promise();
                  var query = toUnnamed("INSERT into mydb.Student VALUES(:net_id, :name, :email, :utd_id, :student_hold);"
                    +"INSERT INTO mydb.Group_Has_Student VALUES(:group_id, :net_id)"
                    ,{
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
                    failedinserts.push({ "net_id": net_id, "name": name, "email": email, "utd_id:": -1, "student_hold": 0});
                  });
                }
                else if(!newStudent && secondGroup){
                  console.log("Clear to insert student/group relationship: " + net_id + name + email)
                  queries = []
                  pool2 = pool.promise();
                  var query = toUnnamed("INSERT INTO mydb.Group_Has_Student VALUES(:group_id, :net_id)"
                    ,{
                      net_id: net_id,
                      group_id: group_id
                  });
                  queries.push(pool2.query(query[0], query[1]));
                  var results2 = await Promise.all(queries).catch(() => { 
                    console.log("One of the student/group relationships failed to insert."); 
                    status = 400;
                    failedinserts.push({ "net_id": net_id, "name": name, "email": email, "utd_id:": -1, "student_hold": 0});
                  });
                }
                else if(newStudent && secondGroup) {
                  console.log("Student is already in the database, but is trying to join a second group")
                  console.log("this shouldnt happen?")
                }
                else{ //!newStudent and !secondGroup
                  console.log("We already have this, skip...")
                }
          }
        }
      }
    
      var myjson2 = ""
      myjson2 = { "conflictgroups:": conflictgroups, "failedgroups" :failedgroups, "conflictinserts": { "old": oldtuples, "new": newtuples }, "failedinserts": failedinserts }
      console.log("FAILED NUMBER: ", failedinserts.length)
      //return here if any groups are screwed
      if (status == 400) {
          return res.status(status).json(myjson2);
      }
      else{
        return res.send("SUCCESS")
      }

  })();
  })
});

module.exports = router;