var express = require('express');
const nodemon = require('nodemon');
var router = express.Router();
var toUnnamed = require('named-placeholders')();
var uuid = require('uuid');
var csv = require('express-csv');

//sql connection
var pool = require('../db.js')

//i.e. http://localhost:port/inventory
router.get("/", (req, res) => {

  myquery = "SELECT * FROM mydb.inventory_part"
  pool.query(myquery, function (err, rows, fields) {
    if (err) throw err

    console.log(uuid.v1())
    console.log('The solution is: ', rows)

    //console.log("rows"+ rows.length)
    for(var i=0;i< rows.length; i++){
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

  console.log('The solution is: ', rows)
  res.json(rows);
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
  "net_id": "bcd180003",
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
          + "(UUID_TO_BIN(:transaction_id), :group_id, :net_id, NOW(3), :type);"
          + "INSERT into mydb.purchased_part (transaction_id, part_id, quantity_purchased, purchased_cost) VALUES "
          + "(UUID_TO_BIN(:transaction_id), :part_id, :quantity_purchased, (SELECT current_cost FROM inventory_part WHERE part_id = :part_id));"
          + "UPDATE mydb.inventory_part SET quantity_available = (quantity_available - :quantity_purchased) WHERE part_id = :part_id", {
          transaction_id: uuid.v1(),
          group_id: req.body.customer.groupID,
          net_id: req.body.customer.netID,
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
router.post("/rent", (req, res) => {
  console.log("entered first rent route");

  (async function sendquery(param) {
    queries = []

    const pool2 = pool.promise();

    console.log("length"+ req.body.cart.length);
    for (i = 0; i < req.body.cart.length; i++) {
      //SELECT (current_cost = :purchased_cost) cost_matches, ((quantity_available - :quantity_purchased) >= 0) enough_stock "
      //+ "FROM inventory_part WHERE part_id = :part_id;
      var query = toUnnamed(
        "SELECT transaction_id FROM rented_tool where (tool_id = :tool_id AND returned_date is NULL)",{
        //"SELECT 1 from mydb.rented_tool where tool_id = :tool_id AND returned_date=NULL", {
        tool_id: req.body.cart[i].tool.tool_id,
      });

      queries.push(pool2.query(query[0], query[1]));
    }

    //console.log("NUMQUERIES: " + queries.length);

    const results = await Promise.all(queries);
    //console.log("RESULTS:", results[0])

    valid = []
    status = 200;

    results.forEach(([rows, fields]) => { if (rows.length != 0) status = 412; });
    results.forEach(([rows, fields]) => { valid.push(rows[0]); console.log(rows[0]);});
    console.log("VALID: "+ valid)

    if (status != 200) {
      res.status(status).send(valid);
    }
    //else transaction is valid, so insert the transaction row for the tool
    else {
      console.log("Entering part 2 of post route for tool");
      queries = []

      const pool2 = pool.promise();
      for (i = 0; i < req.body.cart.length; i++) {
        var query = toUnnamed("INSERT into mydb.transaction (transaction_id, group_id, net_id, date, type) VALUES "
          + "(UUID_TO_BIN(:transaction_id), :group_id, :net_id, NOW(3), :type);"
          + "INSERT into mydb.rented_tool (transaction_id, tool_id, returned_date, notification_sent) VALUES "
          + "(UUID_TO_BIN(:transaction_id), :tool_id, NULL, 0)" , {
          transaction_id: uuid.v1(),
          group_id: req.body.customer.group_id,
          net_id: req.body.customer.net_id,
          type: "rental",
          tool_id: req.body.cart[i].tool.tool_id,
          notification_sent: "0"
        });

        queries.push(pool2.query(query[0], query[1]));
      }

      console.log("NUMQUERIES: " + queries.length);

      const results = await Promise.all(queries);

      res.send("finished");
    }
  })();
});

//we want the return date to be null here, unlike the above route
//you can return multiple items at once
router.post("/return", (req, res) => {
  console.log("entered return rent route");

  (async function sendquery(param) {
    queries = []

    const pool2 = pool.promise();

    for (i = 0; i < req.body.cart.length; i++) {
      //SELECT (current_cost = :purchased_cost) cost_matches, ((quantity_available - :quantity_purchased) >= 0) enough_stock "
      //+ "FROM inventory_part WHERE part_id = :part_id;
      var query = toUnnamed(
        "SELECT transaction_id FROM rented_tool where (tool_id = :tool_id AND returned_date is NULL)",{
        tool_id: req.body.cart[i].tool.tool_id
      });

      queries.push(pool2.query(query[0], query[1]));
    }

    //console.log("NUMQUERIES: " + queries.length);

    const results = await Promise.all(queries);
   

    valid = []
    status = 200;

    results.forEach(([rows, fields]) => { if (rows.length != 1){ console.log(rows.length); status = 412;} });
    results.forEach(([rows, fields]) => { valid.push(rows[0]); console.log(rows[0]);});
    console.log("VALID: "+ valid)

    if (status != 200) {
      res.status(status).send(valid);
    }
    //else transaction is valid, so insert the transaction row for the tool
    else {
      console.log("That part is able to be returned...");
      queries = []

      const pool2 = pool.promise();
     for (i = 0; i < req.body.cart.length; i++) {
        var query = toUnnamed("UPDATE mydb.rented_tool SET returned_date = NOW(3) WHERE tool_id = :id AND returned_date is NULL" , {
          id: req.body.cart[i].tool.tool_id
        });

        queries.push(pool2.query(query[0], query[1]));
      }

      console.log("NUMQUERIES: " + queries.length);

      const results = await Promise.all(queries);

      res.send("finished");
    }
  })();
});

module.exports = router;