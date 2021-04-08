var express = require('express');
var router = express.Router();
var toUnnamed = require('named-placeholders')();
const readXlsxFile = require('read-excel-file/node');
var uuid = require('uuid');
var CronJob = require('cron').CronJob
var nodemailer = require('nodemailer')

//sql connection
var pool = require("../db.js");

//i.e. http://localhost:port/inventory/tools
router.get("/", (req, res) => {
  myquery =
    "SELECT * FROM mydb.rental_tool "
    + "natural join "
    + "( "
    + "  SELECT rtr.tool_id tool_id, 'Rented' status, t.group_id group_id, t.net_id net_id, t.date checkout_date, "
    + "  (cast(from_unixtime(2*60*60 + round((unix_timestamp(t.date)+30*5)/(60*5))*(60*5)) as datetime(3))) due_date "
    + "  FROM mydb.transaction t , mydb.rented_tool rtr "
    + "  WHERE (t.transaction_id = rtr.transaction_id) "
    + "    AND (rtr.returned_date IS NULL) "
    + "    AND NOW() <= (cast(from_unixtime(2*60*60 + round((unix_timestamp(t.date)+30*5)/(60*5))*(60*5)) as datetime(3))) "
    + "  UNION "
    + "  SELECT rto.tool_id, 'Overdue' status, t.group_id group_id, t.net_id net_id, t.date checkout_date, "
    + "  (cast(from_unixtime(2*60*60 + round((unix_timestamp(t.date)+30*5)/(60*5))*(60*5)) as datetime(3))) due_date "
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
    + ") u;"
  pool.query(myquery, function (err, rows, fields) {
    if (err) console.log(err);
    res.json(rows);
  });
});

//i.e. http://localhost:port/inventory/tools/search?tool_id=111
router.get("/search", (req, res) => {
  //set query by arguments 'tool_id' or 'name'
  if (req.query.tool_id) {
    var myquery = toUnnamed(
      "SELECT * FROM mydb.rental_tool "
      + "natural join "
      + "( "
      + "  SELECT rtr.tool_id tool_id, 'Rented' status, t.group_id group_id, t.net_id net_id, t.date checkout_date, "
      + "  (cast(from_unixtime(2*60*60 + round((unix_timestamp(t.date)+30*5)/(60*5))*(60*5)) as datetime(3))) due_date "
      + "  FROM mydb.transaction t , mydb.rented_tool rtr "
      + "  WHERE (t.transaction_id = rtr.transaction_id) "
      + "    AND (rtr.returned_date IS NULL) "
      + "    AND NOW() <= (cast(from_unixtime(2*60*60 + round((unix_timestamp(t.date)+30*5)/(60*5))*(60*5)) as datetime(3))) "
      + "  UNION "
      + "  SELECT rto.tool_id, 'Overdue' status, t.group_id group_id, t.net_id net_id, t.date checkout_date, "
      + "  (cast(from_unixtime(2*60*60 + round((unix_timestamp(t.date)+30*5)/(60*5))*(60*5)) as datetime(3))) due_date "
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
      + "WHERE u.tool_id = :tool_id;", {
      tool_id: req.query.tool_id
    });
  }
  else if (req.query.name) {
    var myquery = toUnnamed(
      "SELECT * FROM mydb.rental_tool "
      + "natural join "
      + "( "
      + "  SELECT rtr.tool_id tool_id, 'Rented' status, t.group_id group_id, t.net_id net_id, t.date checkout_date, "
      + "  (cast(from_unixtime(2*60*60 + round((unix_timestamp(t.date)+30*5)/(60*5))*(60*5)) as datetime(3))) due_date "
      + "  FROM mydb.transaction t , mydb.rented_tool rtr "
      + "  WHERE (t.transaction_id = rtr.transaction_id) "
      + "    AND (rtr.returned_date IS NULL) "
      + "    AND NOW() <= (cast(from_unixtime(2*60*60 + round((unix_timestamp(t.date)+30*5)/(60*5))*(60*5)) as datetime(3))) "
      + "  UNION "
      + "  SELECT rto.tool_id, 'Overdue' status, t.group_id group_id, t.net_id net_id, t.date checkout_date, "
      + "  (cast(from_unixtime(2*60*60 + round((unix_timestamp(t.date)+30*5)/(60*5))*(60*5)) as datetime(3))) due_date "
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
      + "WHERE u.tool_id in (SELECT tool.tool_id FROM mydb.rental_tool tool WHERE LOWER(tool.name) LIKE LOWER(:name));", {
      name: "%" + req.query.name + "%"
    });
  }
  else {
    //invalid parameters
    return res.status(400).send("MISSING_PARAMS");
  }

  //query DB
  pool.query(myquery[0], myquery[1], function (err, rows, fields) {
    if (err) console.log(err);
    res.json(rows);
  });
});

router.post("/modify", (req, res) => {
  (async function sendquery(param) {
    var pool2 = pool.promise();
    queries = []

    var query = toUnnamed("SELECT * FROM mydb.rental_tool WHERE tool_id = :tool_id", {
      tool_id: req.body.part_id
    });

    queries.push(pool2.query(query[0], query[1]));

    var status = 200;
    var results = await Promise.all(queries);
    console.log("done with queries")
    results.forEach(([rows, fields]) => { if (rows.length == 0) { console.log("No tool with that ID"); status = 400; } });
    if (status == 400) {
      return res.status(status).send("INVALID_ID");
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
    res.status(status).send("SUCCESS");
  })();
});

/*
//i.e. http://localhost:port/inventory/tools/search?name=phil
router.get("/searchname", (req, res) => {
  //arguments
  var id = req.query.name;

  var myquery = toUnnamed(
  "SELECT * FROM mydb.rental_tool "
  + "natural join "
  + "( "
  + "	SELECT rtr.tool_id, 'Rented' status "
  + "	FROM mydb.transaction t , mydb.rented_tool rtr "
  + "	WHERE (t.transaction_id = rtr.transaction_id) AND rtr.name LIKE LOWER(CONCAT('%', :name, '%'))"
  + "		AND (rtr.returned_date IS NULL) "
  + "		AND NOW() <= (cast(from_unixtime(2*60*60 + round((unix_timestamp(t.date)+30*5)/(60*5))*(60*5)) as datetime(3))) "
  + "	UNION "
  + "	SELECT rto.tool_id, 'Overdue' status "
  + "	FROM mydb.transaction t , mydb.rented_tool rto "
  + "	WHERE (t.transaction_id = rto.transaction_id) AND rto.name LIKE LOWER(CONCAT('%', :name, '%'))"
  + "		AND (rto.returned_date IS NULL)  "
  + "		AND NOW() > (cast(from_unixtime(2*60*60 + round((unix_timestamp(t.date)+30*5)/(60*5))*(60*5)) as datetime(3)))  "
  + "	UNION "
  + "	SELECT rta.tool_id, 'Available' status  "
  + "	FROM mydb.rental_tool rta "
  + "	WHERE rta.name LIKE LOWER(CONCAT('%', :name, '%')) AND rta.tool_id  "
  + "		NOT IN (SELECT rt.tool_id "
  + "			FROM mydb.transaction t, mydb.rented_tool rt "
  + "			WHERE (t.transaction_id = rt.transaction_id)"
  + "				AND(rt.returned_date IS NULL) "
  + "			ORDER BY REVERSE (t.date)) "
  + ") u;",{
    name: id
  });
  pool.query(myquery[0], myquery[1], function (err, rows, fields) {
    if (err) console.log(err);
    res.json(rows);
  });
});
*/



//emails start
var emailsdates = [] //stores the emails and the dates they *should* have been returned by

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'toolcributd@gmail.com',
    pass: 'toolcributd01'
  }
});


//emails, dates, id, tool_id
function sendmails() {
  console.log("sendmails(): emailsdates.length: " + emailsdates.length)
  for (var i = 0; i < emailsdates.length; i++) {
    if (emailsdates[i][1] <= Date.now()) {
      var email = String(emailsdates[i][0])

      console.log("We found someone with an overdue part!")
      const mailOptions = {
        from: 'toolcributd@gmail.com', // sender address
        to: email, // list of receivers
        subject: 'Tool Crib- overdue tool checked out by ' + emailsdates[i][2], // Subject line
        html: '<p> This is an automated message from the UTD Tool Crib. ' + emailsdates[i][2]+ ' rented out '
              + emailsdates[i][3]+ '. It is overdue as of ' + emailsdates[i][1] + 
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

//This checker runs once every minute for testing. Later change the cron to be once every 5 minutes
var job = new CronJob('* * * * *', sendmails);
job.start();

//emails end


//tool/rental start

//note: the json used is actually wrong because of duplicate key, use this to rent two items:
/*
{
    "customer": {
        "net_id": "bcd180003",
        "group_id": 357
    },
    "cart": [
        {
            "tool": {
                "tool_id": 111
            }
        },
        {
            "tool": {
                "tool_id": 222
            }

        }
    ]
}
*/

router.post("/insert", (req, res) => {
  var query = toUnnamed("INSERT into mydb.rental_tool VALUES(:tool_id, :name)", {
    tool_id: req.body.tool_id,
    name: req.body.name,
  });

  pool.query(query[0], query[1], function (err, rows, fields) {
    if (err) {
      console.log(err)
      res.status(400).send(err.code)
    }
    res.send();
  })
});

//i.e. http://localhost:port/inventory
router.post("/insertMultiple", (req, res) => {
  console.log("IN HERE");
  (async function sendquery(param) {
    queries = []

    const pool2 = pool.promise();
    console.log("length: ")
    console.log(req.body.cart.length)
    for (i = 0; i < req.body.cart.length; i++) {
      var query = toUnnamed("INSERT into mydb.rental_tool VALUES(:tool_id, :name)", {
        tool_id: req.body.cart[i].item.tool_id,
        name: req.body.cart[i].item.name
      });

      queries.push(pool2.query(query[0], query[1]));
    }

    console.log("NUMQUERIES: " + queries.length);
    var status = 200;
    const results = await Promise.all(queries).catch(() => { console.log("One of the tools failed to insert."); status = 412; });
    return res.status(status).send("done with route");
  })();
});

router.post("/upload", (req, res) => {
  var failedinserts = []
  var duplicateinserts = []

  readXlsxFile('SampleToolsSheet.xlsx').then((rows) => {

    var i,j;
    var status=200;
    (async function sendquery(param) {
    for(i=1; i< rows.length; i++){
        //get name, email, id
        var id= rows[i][0]
        var name= rows[i][1]

        //console.log("name: " + name+"    email: " + email+"     id: " + id)
        //this check fails, but it isn't technically necessary, the insert will just fail
        if(id == null || name == null){
          console.log("tool " + i + " has a null field, skipping...")
        }
        else{
          console.log("id: " + id + "    name: " + name)
          console.log("Check 1- Does the tool exist?")
          queries = []

          var pool2 = pool.promise();
          var query = toUnnamed("SELECT * FROM mydb.rental_tool r WHERE r.tool_id = :tool_id", {
            tool_id: id
          });
          queries.push(pool2.query(query[0], query[1]));

          var newTool = 1
          var results = await Promise.all(queries);
          results.forEach(([rows, fields]) => {console.log("ROWS" + rows) });
          results.forEach(([rows, fields]) => { if (rows.length != 0) { console.log("That tool exists"); status = 400; newTool=0; duplicateinserts.push(name) } });

          if(newTool){
            console.log("Attempting to insert a tool...");
            queries = []
  
            const pool2 = pool.promise();
            var query = toUnnamed("INSERT into mydb.rental_tool VALUES(:id, :name);", {
                id: id,
                name: name
              });
              queries.push(pool2.query(query[0], query[1]));
          
        
            //console.log("NUMQUERIES: " + queries.length);
            //later: change error msg to be which part and why
            const results = await Promise.all(queries).catch(() => { console.log("One of the tools failed to insert.");  status=412; failedinserts.push(name)});
          }
        }//async
    }//outer loop

    if(status==400){
      return res.status(status).json("duplicate parts: " + duplicateinserts + "          failed parts: " + failedinserts);
    }
    else{
      return res.status(status).send("SUCCESS");
    }

  })();
  })
});


router.post("/rent", (req, res) => {
  (async function sendquery(param) {
    queries = []
    const pool2 = pool.promise();
    var id= req.body.customer.net_id
  

    for (i = 0; i < req.body.cart.length; i++) {
      //CHECK: does the student have a hold?
      var query = toUnnamed(
        "SELECT * FROM mydb.student WHERE student_hold = true AND net_id= :student_id", {
        tool_id: req.body.cart[i].item.tool_id,
        student_id: req.body.customer.net_id
      });

      queries.push(pool2.query(query[0], query[1]));
    }

    //console.log("NUMQUERIES: " + queries.length);
    var results = await Promise.all(queries);
    var valid=[]
    var status=200

    results.forEach(([rows, fields]) => { if (rows.length == 1) { console.log("That student has a hold"); console.log(rows.length); status = 412; } });
    results.forEach(([rows, fields]) => { valid.push(rows[0]); console.log(rows[0]); });

    if (status != 200) {
      return res.status(400).send('STUDENT_HOLD');
    }

    console.log("The student does not have a hold")
    queries = []
    //console.log("length"+ req.body.cart.length);

    console.log("Part 2- check if out");
    for (i = 0; i < req.body.cart.length; i++) {
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

    results.forEach(([rows, fields]) => { if (rows.length != 0) { console.log("That item is currently out"); status = 412; } });
    results.forEach(([rows, fields]) => { valid.push(rows[0]); console.log(rows[0]); });

    if (status != 200) {
      return res.status(400).send('PART_ALREADY_OUT');
    }

    console.log("Part 3- Place the rental");
    queries = []

    for (i = 0; i < req.body.cart.length; i++) {
      var query = toUnnamed("INSERT into mydb.transaction (transaction_id, group_id, net_id, date, type) VALUES "
        + "(UUID_TO_BIN(:transaction_id), :group_id, :net_id, NOW(3), :type);"
        + "INSERT into mydb.rented_tool (transaction_id, tool_id, returned_date, notification_sent) VALUES "
        + "(UUID_TO_BIN(:transaction_id), :tool_id, NULL, :notification_sent)", {
        transaction_id: uuid.v1(),
        group_id: req.body.customer.group_id,
        net_id: req.body.customer.net_id,
        type: "rental",
        tool_id: req.body.cart[i].item.tool_id,
        notification_sent: 0
      });

      queries.push(pool2.query(query[0], query[1]));
    }

    //console.log("NUMQUERIES: " + queries.length);
    try {
      results = await Promise.all(queries);
    } catch (e) {
      console.log("Some issue in placing rental")
      console.log(e.message);
    }
    valid = []
    status = 200;

    //results.forEach(([rows, fields]) => { if (rows.length != 0){ console.log("Some issue placing the rental");status = 412; }});
    results.forEach(([rows, fields]) => { valid.push(rows[0]); console.log(rows); });
    //console.log("VALID: "+ valid)

    if (status != 200) {
      return res.status(400).send('UNKNOWN_RENTAL_ERROR');
    }


    console.log("Part 4- Push email to emailsdates")
    //Add: push the email of the student and the date +2hrs to emailsdates
    var query = toUnnamed("SELECT email FROM mydb.Student WHERE net_id=:net_id ", {
      net_id: req.body.customer.net_id
    });
    queries.push(pool2.query(query[0], query[1]));
    results = await Promise.all(queries);

    valid = []
    status = 200;

    results.forEach(([rows, fields]) => { if (rows.length == 0) { console.log("We couldn't retrieve a mail"); status = 412; } });
    if (status != 200) {
      return res.status(400).send('NO_EMAIL');
    }

    for(i = 0; i < req.body.cart.length; i++){
      var tool_name= req.body.cart[i].item.tool_name
      var id= req.body.customer.net_id
      var email = 'sudhi.jagadeeshi@gmail.com'
      var temp = new Date(Date.now())
      //datedue.setTime(datedue.getTime() + (2*60*60*1000)); //add two hours
      var datedue = new Date(temp.getTime() + (6 * 1000)); //add 6 seconds

      //when there are actual emails in the DB, uncomment
      //results.forEach(([rows, fields]) => { emailsdates.push([rows[0], datedue]) });

      //tool crib always closes at 10
      //console.log("HOURS", datedue.getHours());
      if (datedue.getHours() >= 22) { console.log("This rental time is shortened because the crib closes at 10"); datedue.setHours(21); datedue.setMinutes(50); }
      emailsdates.push([email, datedue, id, tool_name])
    }
    console.log("EMAILSDATES: " + emailsdates)
    res.send("finished");
  
  })(); //end async
});

//we want the return date to be null here, unlike the above route
//you can return multiple items at once
//i.e. http://localhost:port/inventory/tools/return?tool_id=111
router.post("/return", (req, res) => {
  console.log("entered return rent route");
  (async function sendquery(param) {
    var id = req.query.tool_id;
    queries = []

    const pool2 = pool.promise();

    //for (i = 0; i < req.body.cart.length; i++) {
    //CHECK: is the tool requested already out for rent?

    console.log("ID"+ id);
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

    //console.log("NUMQUERIES: " + queries.length);

    var results = await Promise.all(queries);

    valid = []
    status = 200;
    var studentRenting = "";

    results.forEach(([rows, fields]) => { if (rows.length == 0) { console.log("ROWS"+rows); console.log("Nobody has that part checked out at this time"); status = 412; } });
    if (status != 200) {
      return res.status(status).send("NOT_OUT");
    }
    results.forEach(([rows, fields]) => { console.log(rows[0]); valid.push(rows[0]); /*console.log(rows[0].net_id);*/ });
    results.forEach(([rows, fields]) => { studentRenting = rows[0].net_id });
    console.log("VALID: " + valid)

    //else transaction is valid, so insert the transaction row for the tool
    console.log("That part is able to be returned...");
    queries = []

    //for (i = 0; i < req.body.cart.length; i++) {
    var query = toUnnamed("UPDATE mydb.rented_tool SET returned_date = NOW(3) WHERE tool_id = :id AND returned_date is NULL;"
      + "UPDATE mydb.student SET student_hold=0 WHERE net_id = :student_id", {
      id: id,
      student_id: studentRenting
    });

    queries.push(pool2.query(query[0], query[1]));
    // }

    console.log("NUMQUERIES: " + queries.length);

    results = await Promise.all(queries);

    res.send("finished");

  })();
});


//tool/rental end

module.exports = router;
