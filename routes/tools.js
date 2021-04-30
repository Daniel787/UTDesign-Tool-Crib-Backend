var express = require('express');
var router = express.Router();
var toUnnamed = require('named-placeholders')();
const readXlsxFile = require('read-excel-file/node');
var uuid = require('uuid');
var CronJob = require('cron').CronJob
var nodemailer = require('nodemailer')

//sql connection
var pool = require("../db.js");

function validate(id, name) {
  //check if valid id
  var regex=/[0-9]/; //only 1-9
  var letters=/[a-zA-Z]/
  if(! regex.test(id) || letters.test(id)){
      console.log("A")
      return -1;
  }
  return 1;
}

//i.e. http://localhost:port/inventory/tools
//doesnt show deleted tools
router.get("/", (req, res) => {
  myquery =
     "SELECT * FROM mydb.tool_status WHERE tool_status.tool_id > 0;"
  pool.query(myquery, function (err, rows, fields) {
    if (err) console.log(err);
    res.json(rows);
  });
});

//i.e. http://localhost:port/inventory/tools/search?tool_id=111
//DOES show deleted tools
router.get("/search", (req, res) => {
  //set query by arguments 'tool_id' or 'name'
  if (req.query.tool_id) {
    var myquery = toUnnamed(
       "SELECT * FROM mydb.tool_status "
      +"WHERE tool_status.tool_id IN (:tool_id , -1* :tool_id);", {
      tool_id: req.query.tool_id
    });
  }
  else if (req.query.name) {
    var myquery = toUnnamed(
       "SELECT * FROM mydb.tool_status "
      +"WHERE tool_status.tool_id IN (SELECT tool.tool_id FROM mydb.rental_tool tool WHERE LOWER(tool.name) LIKE LOWER(:name));", {
      name: "%" + req.query.name + "%"
    });
  }
  else {
    //invalid parameters
    return res.json({"message":'MISSING_PARAMS'});
  }

  //query DB
  pool.query(myquery[0], myquery[1], function (err, rows, fields) {
    if (err) console.log(err);
    res.json(rows);
  });
});

router.post("/modify", (req, res) => {
  if(validate(req.body.tool_id, req.body.name) == -1){
    return res.json({"message":'BAD_DATATYPES'});
  }; 

  if(req.body.tool_id < 0){
    return res.json({"message":'DELETED_TOOL'});
  }

  (async function sendquery(param) {
    var pool2 = pool.promise();
    queries = []

    var query = toUnnamed("SELECT * FROM mydb.rental_tool WHERE tool_id = :tool_id", {
      tool_id: req.body.tool_id
    });

    queries.push(pool2.query(query[0], query[1]));

    var status = 200;
    var results = await Promise.all(queries);
    console.log("done with queries")
    results.forEach(([rows, fields]) => { if (rows.length == 0) { console.log("No tool with that ID"); status = 400; } });
    if (status == 400) {
      return res.json({"message":'INVALID_ID'});
    }

    console.log("down here")
    queries = []
    var query = toUnnamed("UPDATE mydb.rental_tool SET name= :name WHERE tool_id= :tool_id", {
      tool_id: req.body.tool_id,
      name: req.body.name,
    });

    queries.push(pool2.query(query[0], query[1]));

    var status = 200;
    var results = await Promise.all(queries);
    return res.json({"message":'SUCCESS'});
  })();
});

//multiplies all instances of the id in the database by -1
router.post("/delete", (req, res) => {
  var tool_id = req.query.tool_id;
  if(validate(tool_id, " ") == -1){
    return res.json({"message":'BAD_DATATYPES'});
  }; 
  console.log("Tool to delete: ", tool_id);

  (async function sendquery(param) {
    var pool2 = pool.promise();
    queries = []

    var query = toUnnamed("SELECT * FROM mydb.rental_tool WHERE tool_id = :tool_id", {
      tool_id: tool_id
    });

    queries.push(pool2.query(query[0], query[1]));

    var status = 200;
    var results = await Promise.all(queries);
    results.forEach(([rows, fields]) => { if (rows.length == 0) { console.log("No tool with that ID"); status = 400; } });
    if (status == 400) {
      return res.json({"message":'INVALID_ID'});
    }

    console.log("down here")
    queries = []
    var query = toUnnamed( 
                          "UPDATE `mydb`.`Rental_Tool` SET `tool_id` = :tool_id * -1 WHERE (`tool_id` = :tool_id);"
                           , {
      tool_id: tool_id,
    });

    queries.push(pool2.query(query[0], query[1]));

    var status = 200;
    var results = await Promise.all(queries).catch(() => { console.log("Deletion failed."); status = 400; });
    if(status == 400){
      return res.json({"message":'SQL_ERROR'});
    }
    else{
      return res.json({"message":'SUCCESS'});
    }
  })();
});

//emails start
var emailsdates = [] //stores the emails and the dates they *should* have been returned by

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'toolcributd@gmail.com',
    pass: 'toolcributd01'
  }
});

function sendmails() {
  console.log("sendmails(): emailsdates.length: " + emailsdates.length)
  for (var i = 0; i < emailsdates.length; i++) {
    if (emailsdates[i][1] <= Date.now()) {
      var email = String(emailsdates[i][0])

      console.log("We found someone with an overdue tool!")
      const mailOptions = {
        from: 'toolcributd@gmail.com', // sender address
        to: email, // list of receivers
        subject: 'Tool Crib- overdue tool checked out by ' + emailsdates[i][2], // Subject line
        html: '<p> This is an automated message from the UTD Tool Crib. ' + emailsdates[i][2] + ' rented out '
          + emailsdates[i][3] + '. It is overdue as of ' + emailsdates[i][1] +
          '. A hold has been placed on your account. Please return the tool to remove it! </p>'// plain text body
      };

      transporter.sendMail(mailOptions, function (err, info) {
        if (err)
          console.log("ERR:" + err)
        else
          console.log("Message sent: %s", info.messageId);
      });

      let mailSent = emailsdates.splice(i, 1) //splice that email out of the array, so we don't send the mail twice
      //query to update that student's hold to 1, assumes email is unique? may fix later
      var query = toUnnamed(
        "SET SQL_SAFE_UPDATES = 0; UPDATE mydb.Student SET student_hold=1 WHERE email= :email_id; SET SQL_SAFE_UPDATES = 1; ", {
        email_id: email,
      });

      pool.query(query[0], query[1], function (err, rows, fields) {
        if (err) console.log(err)

        console.log("Sent mail and updated hold");
      })
    }
  }
}

//structure of emailsdates: emails, date, netid, tool_name
function updateholds(){
  console.log("updateholds(): emailsdates.length: " + emailsdates.length);

  (async function sendquery(param) {//b/c multiple updates
    for (var i = 0; i < emailsdates.length; i++) {
      if (emailsdates[i][1] <= Date.now()) {
        console.log("Updating...")
        //query to update that student's hold to 1
        var pool2 = pool.promise();
        var queries=[]

        var query = toUnnamed(
          "UPDATE mydb.Student SET student_hold=1 WHERE net_id= :net_id;", {
          net_id: emailsdates[i][2], 
        });

        let removed = emailsdates.splice(i, 1) //splice that entry
        queries.push(pool2.query(query[0], query[1]));
        var results = await Promise.all(queries).catch(() => { console.log("Some sql error in UPDATE"); });
        console.log("Done")
      }
    }
  }) ();
}

//Later, use sendmails()
var job = new CronJob('* * * * *', updateholds);
job.start();

//emails end


//tool/rental start

router.post("/insert", (req, res) => {
  var numduplicate = 0, numsuccess = 0, numfailed = 0;

    (async function sendquery(param) {
        newtuples=[]
        oldtuples=[]
        conflictinserts=[]
        failedinserts=[]

        var id= req.body.tool_id;
        var name= req.body.name;

        var proceed=1;
        //easy checks that don't require queries
        if( (validate(id,name)  == -1) || id< 0 || id== null || name == null || id == "" || name == ""){
            proceed=0;
            failedinserts.push({"tool_id": id, "name": name});
            numfailed = numfailed+1;
            var myjson = {
                "conflictinserts": { "old": oldtuples, "new": newtuples }, "failedinserts": failedinserts,
                "numtotal": 1, "numduplicate": numduplicate, "numsuccess": numsuccess, "numfailed": numfailed
            }
            return res.json(myjson);
        }

        var pool2 = pool.promise();
        var queries=[]
        //we want to examine matching tool id, but difference something else
        var query = toUnnamed("SELECT * FROM mydb.rental_tool r WHERE r.tool_id = :tool_id AND r.name <> :tool_name", {
            tool_id: id,
            tool_name: name,
        });
        queries.push(pool2.query(query[0], query[1]));
        var results = await Promise.all(queries);

        results.forEach(([rows, fields]) => {
            if (rows.length == 1) {
                oldtuples.push({ "tool_id": rows[0].tool_id, "name": rows[0].name })
                newtuples.push({ "tool_id": parseInt(id), "name": name })
                console.log("That tool exists, but you have supplied different values for one of the attributes");
                console.log("oldtuple" + oldtuples)
                console.log("newtuple" + newtuples)
                status = 412;
                proceed = 0;
                conflictinserts.push([oldtuples, newtuples])
            }
        });

        var queries=[]
        var pool2 = pool.promise();
        //matching everything
        var query = toUnnamed("SELECT * FROM mydb.rental_tool r WHERE r.tool_id = :tool_id AND r.name = :tool_name", {
            tool_id: id,
            tool_name: name
        });
        queries.push(pool2.query(query[0], query[1]));
        var results = await Promise.all(queries);

        results.forEach(([rows, fields]) => {
            if (rows.length == 1) {
                console.log("That tool exists, and is entirely identical to one in the database. Will not be inserted.");
                status = 412;
                numduplicate = numduplicate +1;
                proceed = 0;
            }
        });

        if(proceed){
            var queries = []
            var query = toUnnamed("INSERT into mydb.rental_tool VALUES (:tool_id, :name)", {
                tool_id: req.body.tool_id,
                name: req.body.name
            });
            queries.push(pool2.query(query[0], query[1]));
            await Promise.all(queries).catch(() => { console.log("Some sql error in insertion"); status = 400; numfailed=numfailed+1;});
        }
        numsuccess= 1-(oldtuples.length + failedinserts.length + numduplicate);
        myjson = {
            "conflictinserts": { "old": oldtuples, "new": newtuples }, "failedinserts": failedinserts,
            "numtotal": 1, "numduplicate": numduplicate, "numsuccess": numsuccess, "numfailed": numfailed
        }

        if (status == 412) {
            return res.json(myjson);
        }
        else {
          return res.json({"message":"SUCCESS"});
        }
    })();   
});

router.post("/upload", (req, res) => {
  var failedinserts = []
  var conflictinserts = []
  var newtuples = []
  var oldtuples = []

    var i, j;
    var status = 200;
    var numrows=0, numduplicate=0, numsuccess=0, numfailed =0 ;
    numrows= req.body.length;
    (async function sendquery(param) {
      for (i = 0; i < req.body.length; i++) {
        //get name, email, id
        var id = req.body[i].tool_id
        var name = req.body[i].name

        console.log("id: " + id+   "name"+  name)
        //this check fails, but it isn't technically necessary, the insert will just fail
        if (id == null || name == null || id == '' || name == '' || validate(id, name) == -1 ) {
          console.log("tool " + i + " has a null field, skipping...");
          failedinserts.push({ "tool_id": id, "name": name });
          status=400;
        }
        else {
          console.log("id: " + id + "    name: " + name)
          console.log("Check 1- Does the tool exist?")
          queries = []

          var pool2 = pool.promise();
          var query = toUnnamed("SELECT * FROM mydb.rental_tool r WHERE r.tool_id = :tool_id AND r.name = :name", {
            tool_id: id,
            name: name
          });
          queries.push(pool2.query(query[0], query[1]));

          var newTool = 1
          var results = await Promise.all(queries);
          //results.forEach(([rows, fields]) => { console.log("ROWS" + rows) });
          results.forEach(([rows, fields]) => { 
            if (rows.length != 0) { 
              console.log("That tool exists, and is entirely identical to one in the database. Will not insert"); 
              newTool = 0; 
              numduplicate= numduplicate +1; 
              oldtuples.push({ "tool_id": rows[0].tool_id, "name": rows[0].name})
              newtuples.push({ "tool_id": parseInt(id), "name": name })
              status=400; //added
            } 
          });
          queries = []
            var query = toUnnamed("SELECT * FROM mydb.rental_tool r WHERE r.tool_id = :tool_id AND r.name <> :name", {
              tool_id: id,
              name: name
            });
            queries.push(pool2.query(query[0], query[1]));
  
            var results = await Promise.all(queries);
            //results.forEach(([rows, fields]) => { console.log("ROWS: " + rows) });
            results.forEach(([rows, fields]) => { 
              if (rows.length != 0) { 
                 console.log("ROWS:", rows)
                console.log("That tool exists, but you have supplied a different value for its name. Will not insert");                
                oldtuples.push({ "tool_id": rows[0].tool_id, "name": rows[0].name})
                newtuples.push({ "tool_id": parseInt(id), "name": name })
                status = 400;
                newTool = 0;
              } });

          if (newTool) {
            console.log("Attempting to insert a tool...");
            queries = []

            const pool2 = pool.promise();
            var query = toUnnamed("INSERT into mydb.rental_tool VALUES(:id, :name);", {
              id: id,
              name: name
            });
            queries.push(pool2.query(query[0], query[1]));


            //console.log("NUMQUERIES: " + queries.length);
            //later: change error msg to be which tool and why
            const results = await Promise.all(queries).catch(() => { console.log("One of the tools failed to insert."); status = 400; failedinserts.push(name) });
          }
        }//async
      }//outer loop

      numfailed = conflictinserts.length + failedinserts.length
      numsuccess= numrows- (numduplicate + numfailed)
      var myjson = ""
      myjson = { "conflictinserts": { "old": oldtuples, "new": newtuples }, "failedinserts": failedinserts,
      "numtotal": numrows, "numduplicate": numduplicate, "numsuccess": numsuccess, "numfailed": numfailed}

      if(numduplicate == numrows){
        return res.json({"message":"SUCCESS"});
      }
      else if (status == 400) {
          return res.json(myjson);
      }
      else {
        return res.json({"message":"SUCCESS"});
      }


    })();
});


router.post("/rent", (req, res) => {
  if(req.query.super){
    var superrent=1;
  }
  else{
    var superrent=0;
  }

  console.log(req.body);

  (async function sendquery(param) {
    queries = []
    const pool2 = pool.promise();
    var id = req.body.customer.net_id
    for (i = 0; i < req.body.cart.length; i++) {
      if(validate(req.body.cart[i].item.tool_id, " ") == -1){
        return res.json({"message":'BAD_DATATYPES'});
      }; 
    }

    //when superrent is 1, the following check does not occur
    if(! superrent){
      //CHECK: does the group have a hold
      var query = toUnnamed(
        //"SELECT * FROM mydb.student WHERE student_hold = true AND net_id= :student_id", {
          "select * "
          + "from mydb.transaction, mydb.rented_tool, mydb.rental_tool, mydb.student"
          +  " where mydb.transaction.transaction_id= mydb.rented_tool.transaction_id"
          + " and mydb.transaction.net_id = mydb.student.net_id"
          + " and mydb.rented_tool.tool_id = mydb.rental_tool.tool_id "
          +  "and mydb.rented_tool.returned_date is null and mydb.rental_tool.tool_id > 0 and mydb.transaction.group_id = :group_id;" ,{
        group_id: req.body.customer.group_id
      });
      
      queries.push(pool2.query(query[0], query[1]));

      //console.log("NUMQUERIES: " + queries.length);
      var results = await Promise.all(queries);
      var status = 200

      results.forEach(([rows, fields]) => { 
        console.log(rows.length)
        if (rows.length != 0) { 
          console.log("Someone in the group has a hold"); status = 400; 
        } 
      });

      if (status != 200) {
        return res.json({"message":'GROUP_HOLD'});
      }
    
      console.log("The group does not have a hold")
      queries = []
      //console.log("length"+ req.body.cart.length);
    }

    console.log("tool 2- check if out");
    for (i = 0; i < req.body.cart.length; i++) {
      if(req.body.cart[i].item.tool_id < 0){
        return res.json({"message":'DELETED_TOOL'});
      }

      var query = toUnnamed(
        "SELECT transaction_id FROM rented_tool where (tool_id = :tool_id AND returned_date is NULL)", {
        //"SELECT 1 from mydb.rented_tool where tool_id = :tool_id AND returned_date=NULL", {
        tool_id: req.body.cart[i].item.tool_id,
      });

      queries.push(pool2.query(query[0], query[1]));
    }

    results = await Promise.all(queries);

    valid = []
    status = 200;

    results.forEach(([rows, fields]) => { if (rows.length != 0) { console.log("That item is currently out"); status = 400; } });
    results.forEach(([rows, fields]) => { valid.push(rows[0]); console.log(rows[0]); });

    if (status != 200) {
      return res.json({"message":'TOOL_ALREADY_OUT'});
    }

    console.log("tool 3- Place the rental");
    queries = []

    for (i = 0; i < req.body.cart.length; i++) {
      var query = toUnnamed("INSERT into mydb.transaction (transaction_id, group_id, net_id, date, type) VALUES "
        + "(UUID_TO_BIN(:transaction_id), :group_id, :net_id, NOW(3), :type);"
        + "INSERT into mydb.rented_tool (transaction_id, tool_id, returned_date, notification_sent, hours_rented) VALUES "
        + "(UUID_TO_BIN(:transaction_id), :tool_id, NULL, :notification_sent, :hours)", {
        transaction_id: uuid.v1(),
        group_id: req.body.customer.group_id,
        net_id: req.body.customer.net_id,
        type: "rental",
        tool_id: req.body.cart[i].item.tool_id,
        hours: req.body.cart[i].item.hours,
        notification_sent: 0
      });

      queries.push(pool2.query(query[0], query[1]));
    }

    //console.log("NUMQUERIES: " + queries.length);
    var results = await Promise.all(queries).catch(() => { console.log("Rental placement failed."); status = 400; });
    valid = []
   

    //results.forEach(([rows, fields]) => { if (rows.length != 0){ console.log("Some issue placing the rental");status = 400; }});
    //console.log("VALID: "+ valid)

    if (status != 200) {
      return res.json({"message":'UNKNOWN_RENTAL_ERROR'});
    }


    console.log("tool 4- Push email to emailsdates")
    //Add: push the email of the student and the date +2hrs to emailsdates
    var query = toUnnamed("SELECT email FROM mydb.Student WHERE net_id=:net_id ", {
      net_id: req.body.customer.net_id
    });
    queries.push(pool2.query(query[0], query[1]));
    results = await Promise.all(queries);

    valid = []
    status = 200;

    for (i = 0; i < req.body.cart.length; i++) {
      var tool_name = req.body.cart[i].item.name
      var id = req.body.customer.net_id
      var email = 'toolcributd@gmail.com'
      var datedue = new Date(Date.now())
      var temp= new Date(Date.now())
      datedue.setTime(datedue.getTime() + (req.body.cart[i].item.hours*60*60*1000)); //add required number of hours
      //var datedue = new Date(temp.getTime() + (6 * 1000)); //for testing, add 6 seconds

      //when there are actual emails in the DB, uncomment
      //results.forEach(([rows, fields]) => { emailsdates.push([rows[0], datedue]) });

      //tool crib always closes at 10
      //console.log("HOURS", datedue.getHours());
      //if (datedue.getHours() >= 22) { console.log("This rental time is shortened because the crib closes at 10"); datedue.setHours(21); datedue.setMinutes(50); }
      emailsdates.push([email, datedue, id, tool_name])
    }
    console.log("EMAILSDATES: " + emailsdates)
    return res.json({"message":"SUCCESS"});

  })(); //end async
});

//we want the return date to be null here, unlike the above route
//you can return multiple items at once
//i.e. http://localhost:port/inventory/tools/return?tool_id=111
router.post("/return", (req, res) => {
  if(validate(req.query.tool_id, " ") == -1){
    return res.json({"message":'BAD_DATATYPES'});
  }; 

  console.log("entered return rent route");
  if(req.query.tool_id < 0){
    return res.json({"message":'DELETED_TOOL'});
  }

  (async function sendquery(param) {
    var id = req.query.tool_id;
    queries = []

    const pool2 = pool.promise();

    //for (i = 0; i < req.body.cart.length; i++) {
    //CHECK: is the tool requested already out for rent?

    console.log("ID" + id);
    var query = toUnnamed(
      "SELECT rt.tool_id, t.net_id, t.date "
      + "FROM mydb.transaction t, mydb.rented_tool rt, mydb.student s "
      + "WHERE (t.transaction_id = rt.transaction_id AND t.net_id = s.net_id AND rt.tool_id = :tool_id) "
      + "    AND(rt.returned_date IS NULL) "
      + "ORDER BY REVERSE (t.date); ", {
      tool_id: id
    });


    queries.push(pool2.query(query[0], query[1]));
    //}

    var results = await Promise.all(queries);

    valid = []
    status = 200;
    var studentRenting = "";

    results.forEach(([rows, fields]) => { if (rows.length == 0) { console.log("ROWS" + rows); console.log("Nobody has that tool checked out at this time"); status = 400; } });
    if (status != 200) {
      return res.json({"message":'NOT_OUT'});
    }
    results.forEach(([rows, fields]) => { console.log(rows[0]); valid.push(rows[0]); /*console.log(rows[0].net_id);*/ });
    results.forEach(([rows, fields]) => { studentRenting = rows[0].net_id });
    console.log("VALID: " + valid)

    //else transaction is valid, so insert the transaction row for the tool
    console.log("That tool is able to be returned...");

    queries=[]
    var id= req.query.tool_id
    console.log("id", id)
    var query = toUnnamed("UPDATE mydb.rented_tool SET returned_date = NOW(3) WHERE tool_id = :id AND returned_date is NULL", {
      id: id
    });

    queries.push(pool2.query(query[0], query[1]));
    
    results = await Promise.all(queries);

    queries = []              //added
    var query = toUnnamed("select mydb.transaction.net_id "
                        + "from mydb.transaction, mydb.rented_tool, mydb.rental_tool, mydb.student"
                        +  " where mydb.transaction.transaction_id= mydb.rented_tool.transaction_id"
                        + " and mydb.transaction.net_id = mydb.student.net_id"
                        + " and mydb.rented_tool.tool_id = mydb.rental_tool.tool_id "
                        +  "and mydb.rented_tool.returned_date is null and mydb.rental_tool.tool_id > 0 and mydb.transaction.net_id = :student_id;", {
      student_id: studentRenting
    });

    queries.push(pool2.query(query[0], query[1]));
    results = await Promise.all(queries);
    var removeHold=1;
    results.forEach(([rows, fields]) => { if (rows.length != 0) { removeHold=0; console.log("This student has multiple overdue tools, and has only returned one of them. His hold will not be removed."); status = 400; } });

    console.log("sR", studentRenting)
    if(removeHold){
      queries = []
      const pool2 = pool.promise();  
      var query = toUnnamed("UPDATE mydb.Student SET student_hold=0 WHERE net_id = :student_id", {
        student_id: studentRenting
      });

      queries.push(pool2.query(query[0], query[1]));
      results = await Promise.all(queries);
    }
    
    return res.json({"message":"SUCCESS"});

  })();
});


//tool/rental end

module.exports = router;
