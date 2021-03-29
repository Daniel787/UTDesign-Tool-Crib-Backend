var express = require('express');
const nodemon = require('nodemon');
var router = express.Router();
var toUnnamed = require('named-placeholders')();
var uuid = require('uuid');
var csv = require('express-csv');
var CronJob = require('cron').CronJob
var nodemailer = require('nodemailer')

//sql connection
var pool = require("../db.js");


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
  });
  
  
  //i.e. http://localhost:port/inventory
  router.post("/insert", (req, res) => {
    (async function sendquery(param) {
      queries = []
  
      const pool2 = pool.promise();
      console.log("length: ")
      console.log(req.body.cart.length)
      for (i = 0; i < req.body.cart.length; i++) {
        var query = toUnnamed("INSERT into mydb.inventory_part VALUES(:tool_id, :name, :quantity_avilable, :current_cost)", {
          tool_id: req.body.cart[i].item.part_id,
          name: req.body.cart[i].item.name,
          quantity_available: req.body.cart[i].item.quantity_available,
          current_cost: req.body.cart[i].item.current_cost
        });
  
        queries.push(pool2.query(query[0], query[1]));
      }
  
      console.log("NUMQUERIES: " + queries.length);
      var status=200;
      const results = await Promise.all(queries).catch(() => { console.log("One of the tools failed to insert.");  status=412;});
      return res.status(status).send("done with route");
    })();
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

module.exports = router;