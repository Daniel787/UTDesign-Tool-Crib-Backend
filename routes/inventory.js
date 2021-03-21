var express = require('express');
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

  myquery = "SELECT * FROM mydb.inventory_part WHERE part_id=" + id
  pool.query(myquery, function (err, rows, fields) {
    if (err) throw err

    console.log('The solution is: ', rows)
    res.json(rows);
  })

  console.log('finished route')
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


router.post("/insert", (req, res) => {

  //later: test if any of the parameters are null

  for (i = 0; i < req.body.cart.length; i++) {

    var query = toUnnamed("INSERT into mydb.transaction (transaction_id, group_id, net_id, date, type) values "
      + "(UUID_TO_BIN(:transaction_id), :group_id, :net_id, NOW(3), :type);"
      +"INSERT into mydb.purchased_part (transaction_id, part_id, quantity_purchased, purchased_cost) VALUES " 
      +"(UUID_TO_BIN(:transaction_id), :part_id, :quantity_purchased, (SELECT current_cost FROM inventory_part WHERE part_id = :part_id));"
      +"UPDATE mydb.inventory_part SET quantity_available = (quantity_available - :quantity_purchased) WHERE part_id = :part_id AND (quantity_available - :quantity_purchased) >= 0 AND current_cost = ;", {
      transaction_id: uuid.v1(),
      group_id: req.body.group_id,
      net_id: req.body.net_id,
      type: "purchase",
      part_id: req.body.cart[i].item.part_id,
      quantity_purchased: req.body.cart[i].quantity,
    });

    pool.query(query[0], query[1], function (err, rows, fields) {
      if (err) throw err
      else {
        console.log("Successfully inserted.")
        console.log(rows);
        res.json(rows);
      }
    })

    console.log('finished route')
  }
});

router.post("/insert/errors", (req, res) => {

  valid = []

  for (i = 0; i < req.body.cart.length; i++) {
    //check if operation is valid
    var query = toUnnamed(
      "SELECT (current_cost = :purchased_cost) cost_matches, ((quantity_available - :quantity_purchased) >= 0) enough_stock "
     +"FROM inventory_part WHERE part_id = :part_id;", {
      part_id: req.body.cart[i].item.part_id,
      purchased_cost: req.body.cart[i].item.current_cost,
      quantity_purchased: req.body.cart[i].quantity
    });

    pool.query(query[0], query[1], function (err, rows, fields) {
      if (err) throw err
      else {
        console.log(rows);
        console.log(rows[0].cost_matches)
        console.log(rows[0].enough_stock)
        valid.push(rows[0]);
        if(rows[0].cost_matches && rows[0].enough_stock) {
          console.log("ok")
        }

        if (i ==  req.body.cart.length - 1) {
          console.log(valid)
        }
      }
    })
  }

  res.send("response")
  
});

module.exports = router;