var express = require('express');
const nodemon = require('nodemon');
var router = express.Router();
var toUnnamed = require('named-placeholders')();
var uuid = require('uuid');
var csv = require('express-csv');
var CronJob = require('cron').CronJob
var nodemailer = require('nodemailer')

//sql connection
var pool = require('../db.js')

var emailsdates = [] //stores the emails and the dates they *should* have been returned by

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'toolcributd@gmail.com',
    pass: 'toolcributd01'
  }
});

function sendmails() {
  console.log(emailsdates.length)
  for (var i = 0; i < emailsdates.length; i++) {
    if (emailsdates[i][1] <= Date.now()) {
      var email = String(emailsdates[i][0])

      console.log("We found someone with an overdue part!")
      const mailOptions = {
        from: 'toolcributd@gmail.com', // sender address
        to: email, // list of receivers
        subject: 'Hello.', // Subject line
        html: '<p> Your rental is now overdue. A hold has been placed on your account. Please return the tool to remove it! </p>'// plain text body
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
        if (err) throw err

        console.log("Sent mail and updated hold");
      })
    }
  }
}

//This checker runs once every minute for testing. Later change the cron to be once every 5 minutes
var job = new CronJob('* * * * *', sendmails);
job.start();

//i.e. http://localhost:port/inventory
router.get("/", (req, res) => {

  myquery = "SELECT * FROM mydb.inventory_part"
  pool.query(myquery, function (err, rows, fields) {
    if (err) throw err

    console.log(uuid.v1())
    console.log('The solution is: ', rows)

    //console.log("rows"+ rows.length)
    for (var i = 0; i < rows.length; i++) {
      rows[i].current_cost = parseFloat(rows[i].current_cost)
    }
    res.json(rows);
  })

  console.log('finished route')
});

//i.e. http://localhost:port/inventory/csv
router.get("/csv", (req, res) => {

  myquery = "SELECT * FROM mydb.inventory_part"
  pool.query(myquery, function (err, rows, fields) {
    if (err) throw err

    console.log(uuid.v1())
    console.log('The solution is: ', rows)

    //csv file name
    res.attachment('report.csv');
    //prepend headers
    var headers = {};
    for (key in rows[0]) {
      headers[key] = key;
    }
    rows.unshift(headers);
    //response using express-csv
    res.csv(rows);
  })

  console.log('finished route')
});

//i.e. http://localhost:port/inventory/search?id=12345
router.get("/search", (req, res) => {
  //arguments
  var id = req.query.id

  myquery = "SELECT * FROM mydb.inventory_part WHERE part_id=?"
  pool.query(myquery, [id], function (err, rows, fields) {
    if (err) throw err

    console.log('The solution is: ', rows)
    res.json(rows);
  })

});

//i.e. http://localhost:3006/inventory/search?name=phil 
//should return 12345 phillips screw x
router.get("/searchname", (req, res) => {
  //arguments
  var name = req.query.name

  myquery = "SELECT * FROM mydb.inventory_part WHERE LOWER(name) LIKE LOWER('%" + name + "%')"
  pool.query(myquery, function (err, rows, fields) {
    if (err) throw err

    console.log('The solution is: ', rows)
    res.json(rows);
  })

  console.log('finished route')
});



//http://localhost:3500/inventory/buy
/*
{
  "customer": {
  "netID": "bcd180003",
  "group_id": 357
  },
  
  "cart": [
    {
      "item": {
        "part_id": 12345,
        "current_cost": 0.01
      },
      "quantity": 2,
      "total": 0.14
    },
    {
      "item": {
        "part_id": 56789,
        "current_cost": 12.00
      },
      "quantity": 3,
      "total": 0.14
    }
  ]
}
*/
router.post("/buy", (req, res) => {
  console.log("entered first route");

  (async function sendquery(param) {
    queries = []

    const pool2 = pool.promise();

    console.log("d2");
    for (i = 0; i < req.body.cart.length; i++) {
      var query = toUnnamed(
        "SELECT (current_cost = :purchased_cost) cost_matches, ((quantity_available - :quantity_purchased) >= 0) enough_stock "
        + "FROM inventory_part WHERE part_id = :part_id;", {
        part_id: req.body.cart[i].item.part_id,
        purchased_cost: req.body.cart[i].item.current_cost,
        quantity_purchased: req.body.cart[i].quantity
      });

      queries.push(pool2.query(query[0], query[1]));
    }

    console.log("NUMQUERIES: " + queries.length);

    const results = await Promise.all(queries).catch(() => { console.log("One of the queries failed to complete.") });;

    valid = []
    status = 200;

    results.forEach(([rows, fields]) => { valid.push(rows[0]); if (rows[0].cost_matches == 0 || rows[0].enough_stock == 0) status = 412; });

    if (status != 200) {
      res.status(status).send(valid);
    }
    //else transaction is valid, so insert the transaction row and update the part quantities
    else {
      queries = []

      const pool2 = pool.promise();
      for (i = 0; i < req.body.cart.length; i++) {
        var query = toUnnamed("INSERT into mydb.transaction (transaction_id, group_id, net_id, date, type) values "
          + "(UUID_TO_BIN(:transaction_id), :group_id, :netID, NOW(3), :type);"
          + "INSERT into mydb.purchased_part (transaction_id, part_id, quantity_purchased, purchased_cost) VALUES "
          + "(UUID_TO_BIN(:transaction_id), :part_id, :quantity_purchased, (SELECT current_cost FROM inventory_part WHERE part_id = :part_id));"
          + "UPDATE mydb.inventory_part SET quantity_available = (quantity_available - :quantity_purchased) WHERE part_id = :part_id", {
          transaction_id: uuid.v1(),
          group_id: req.body.customer.groupID,
          netID: req.body.customer.netID,
          type: "purchase",
          part_id: req.body.cart[i].item.part_id,
          quantity_purchased: req.body.cart[i].quantity,
        });

        queries.push(pool2.query(query[0], query[1]));
      }

      console.log("NUMQUERIES: " + queries.length);

      const results = await Promise.all(queries).catch(() => { console.log("One of the queries failed to complete 2.") });

      /*
      for(var i=0;i< rows.length; i++){
        rows[i].current_cost = parseFloat(rows[i].current_cost)
      }*/

      res.send("finished");
    }
  })();
});

//note: the json used is actually wrong because of duplicate key, use this to rent two items:
/*
{
    "customer": {
        "netID": "bcd180003",
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
router.post("/rent", (req, res) => {
  (async function sendquery(param) {
    console.log("Part 1- check hold");
    queries = []
    const pool2 = pool.promise();

    for (i = 0; i < req.body.cart.length; i++) {
      //CHECK: does the student have a hold?
      var query = toUnnamed(
        "SELECT * FROM mydb.student WHERE student_hold = true AND net_id= :student_id", {
        tool_id: req.body.cart[i].item.tool_id,
        student_id: req.body.customer.netID
      });

      queries.push(pool2.query(query[0], query[1]));
    }

    //console.log("NUMQUERIES: " + queries.length);
    var results = await Promise.all(queries);
    valid = []
    status = 200;

    results.forEach(([rows, fields]) => { if (rows.length == 1) { console.log("That student has a hold"); console.log(rows.length); status = 412; } });
    results.forEach(([rows, fields]) => { valid.push(rows[0]); console.log(rows[0]); });

    if (status != 200) {
      return res.status(status).send(valid);
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
      return res.status(status).send(valid);
    }

    console.log("Part 3- Place the rental");
    queries = []

    for (i = 0; i < req.body.cart.length; i++) {
      var query = toUnnamed("INSERT into mydb.transaction (transaction_id, group_id, net_id, date, type) VALUES "
        + "(UUID_TO_BIN(:transaction_id), :group_id, :netID, NOW(3), :type);"
        + "INSERT into mydb.rented_tool (transaction_id, tool_id, returned_date, notification_sent) VALUES "
        + "(UUID_TO_BIN(:transaction_id), :tool_id, NULL, :notification_sent)", {
        transaction_id: uuid.v1(),
        group_id: req.body.customer.groupID,
        netID: req.body.customer.netID,
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
      return res.status(status).send(valid);
    }


    console.log("Part 4- Push email to emailsdates")
    //Add: push the email of the student and the date +2hrs to emailsdates
    var query = toUnnamed("SELECT email FROM mydb.Student WHERE net_id=:netID ", {
      netID: req.body.customer.netID
    });
    queries.push(pool2.query(query[0], query[1]));
    results = await Promise.all(queries);

    valid = []
    status = 200;

    results.forEach(([rows, fields]) => { if (rows.length == 0) { console.log("We couldn't retrieve a mail"); status = 412; } });
    if (status != 200) {
      return res.status(status).send(valid);
    }

    var email = 'sudhi.jagadeeshi@gmail.com'
    var temp = new Date(Date.now())
    //datedue.setTime(datedue.getTime() + (2*60*60*1000)); //add two hours
    var datedue = new Date(temp.getTime() + (9 * 60 * 60 * 1000)); //add 6 seconds

    //when there are actual emails in the DB, uncomment
    //results.forEach(([rows, fields]) => { emailsdates.push([rows[0], datedue]) });

    //tool crib always closes at 10
    //console.log("HOURS", datedue.getHours());
    if (datedue.getHours() >= 22) { console.log("This rental time is shortened because the crib closes at 10"); datedue.setHours(21); datedue.setMinutes(50); }

    emailsdates.push([email, datedue])
    console.log("EMAILSDATES: " + emailsdates[0][0] + emailsdates[0][1])

    res.send("finished");

  })(); //end async
});

//we want the return date to be null here, unlike the above route
//you can return multiple items at once
//i.e. http://localhost:port/inventory/return?id=111
router.post("/return", (req, res) => {
  console.log("entered return rent route");
  var id = req.query.id;

  (async function sendquery(param) {
    queries = []

    const pool2 = pool.promise();

    //for (i = 0; i < req.body.cart.length; i++) {
    //CHECK: is the tool requested already out for rent?
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

    results.forEach(([rows, fields]) => { if (rows.length == 0) { console.log("Nobody has that part checked out at this time"); status = 412; } });
    if (status != 200) {
      return res.status(status).send(valid);
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

module.exports = router;