var express = require('express');
var nodemon = require('nodemon');
var router = express.Router();
var toUnnamed = require('named-placeholders')();
const readXlsxFile = require('read-excel-file/node');
var uuid = require('uuid');
var csv = require('express-csv');

//sql connection
var pool = require("../db.js");
var pool2 = pool.promise();

//i.e. http://localhost:port/inventory/parts
router.get("/", (req, res) => {

    myquery = "SELECT * FROM mydb.inventory_part"
    pool.query(myquery, function (err, rows, fields) {
        if (err) console.log(err)

        for (var i = 0; i < rows.length; i++) {
            rows[i].current_cost = parseFloat(rows[i].current_cost)
        }

        console.log('Response: ', rows)
        res.json(rows);
    })
});

//i.e. http://localhost:port/inventory/parts/search?part_id=12345
router.get("/search", (req, res) => {
    //set query by arguments 'part_id' or 'name'
    if (req.query.part_id) {
        var myquery = toUnnamed(
            "SELECT * FROM mydb.inventory_part p WHERE p.part_id = :part_id", {
            part_id: req.query.part_id
        });
    }
    else if (req.query.name) {
        var myquery = toUnnamed(
            "SELECT * FROM mydb.inventory_part p WHERE LOWER(p.name) LIKE LOWER(:name)", {
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

router.post("/insert", (req, res) => {
    var query = toUnnamed("INSERT into mydb.inventory_part VALUES(:part_id, :name, :quantity_available, :current_cost)", {
        part_id: req.body.part_id,
        name: req.body.name,
        quantity_available: req.body.quantity_available,
        current_cost: req.body.current_cost
    });

    if (req.body.quantity_available < 0) {
        res.status(400).send('NEGATIVE_QUANTITY')
    }
    if (req.body.current_cost < 0) {
        res.status(400).send('NEGATIVE_COST')
    }

    pool.query(query[0], query[1], function (err, rows, fields) {
        if (err) {
            console.log(err)
            res.status(400).send(err.code)
        }
        res.send();
    })
});


//i.e. http://localhost:port/inventory/parts/insertMultiple
router.post("/insertMultiple", (req, res) => {
    (async function sendquery(param) {
        queries = []

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
        var status = 200;
        var results = await Promise.all(queries).catch(() => { console.log("One of the tools failed to insert."); status = 412; });
        return res.status(status).send("done with route");
    })();
});

//i.e. http://localhost:port/inventory/parts/modify
router.post("/modify", (req, res) => {
    (async function sendquery(param) {
        queries = []

        var query = toUnnamed("SELECT * FROM mydb.inventory_part WHERE part_id = :part_id", {
            part_id: req.body.part_id,
            name: req.body.name,
            quantity_available: req.body.quantity_available,
            current_cost: req.body.current_cost
        });

        queries.push(pool2.query(query[0], query[1]));

        var status = 200;
        var results = await Promise.all(queries);
        console.log("done with queries")
        results.forEach(([rows, fields]) => { if (rows.length == 0) { console.log("No part with that ID"); status = 412; } });
        if (status == 400) {
            return res.status(status).send("INVALID_ID");
        }

        queries = []
        console.log("down here")
        var query = toUnnamed("UPDATE mydb.inventory_part SET name= :name, quantity_available= :quantity_available, current_cost= :current_cost WHERE part_id= :part_id", {
            part_id: req.body.part_id,
            name: req.body.name,
            quantity_available: req.body.quantity_available,
            current_cost: req.body.current_cost
        });
        queries.push(pool2.query(query[0], query[1]));
        status = 200;
        var results2 = await Promise.all(queries);
        return res.status(status).send("SUCCESS");

    })();
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
    (async function sendquery(param) {
        queries = []

        //NEED TO CHECK AND MAKE ERRORS FOR (net_id, group_id) pair existing in DB

        for (i = 0; i < req.body.cart.length; i++) {
            var query = toUnnamed(
                "SELECT part_id, (current_cost = :purchased_cost) cost_matches, ((quantity_available - :quantity_purchased) >= 0) enough_stock "
                + "FROM inventory_part WHERE part_id = :part_id;", {
                part_id: req.body.cart[i].item.part_id,
                purchased_cost: req.body.cart[i].item.current_cost,
                quantity_purchased: req.body.cart[i].quantity
            });

            queries.push(pool2.query(query[0], query[1]));
        }

        var results = await Promise.all(queries).catch(() => { console.log("One of the queries failed to complete.") });;

        valid = []
        status = 200
        results.forEach(([rows, fields]) => {
            valid.push(rows[0]);
            if (rows[0].cost_matches == 0 || rows[0].enough_stock == 0) { status = 400; }
        });

        if (status != 200) {
            res.status(status).send(valid)
        }

        //transaction is valid, so insert the transaction row and update the part quantities
        queries = []
        for (i = 0; i < req.body.cart.length; i++) {
            var query = toUnnamed("INSERT into mydb.transaction (transaction_id, group_id, net_id, date, type) values "
                + "(UUID_TO_BIN(:transaction_id), :group_id, :net_id, NOW(3), :type);"
                + "INSERT into mydb.purchased_part (transaction_id, part_id, quantity_purchased, purchased_cost) VALUES "
                + "(UUID_TO_BIN(:transaction_id), :part_id, :quantity_purchased, (SELECT current_cost FROM inventory_part WHERE part_id = :part_id));"
                + "UPDATE mydb.inventory_part SET quantity_available = (quantity_available - :quantity_purchased) WHERE part_id = :part_id", {
                transaction_id: uuid.v1(),
                group_id: req.body.customer.group_id,
                net_id: req.body.customer.net_id,
                type: "purchase",
                part_id: req.body.cart[i].item.part_id,
                quantity_purchased: req.body.cart[i].quantity,
            });
            queries.push(pool2.query(query[0], query[1]));
        }
        var results = await Promise.all(queries).catch((error) => {
            console.log(error);
            res.status(500).send(error.code);
        });
        res.send();
    })();
});



router.post("/upload", (req, res) => {
    var failedinserts = []
    var conflictinserts = [] //this isn't really being used, new and oldtuples are instead
    var newtuples = []
    var oldtuples = []

    var i, j;
    var status = 200;
    (async function sendquery(param) {
        for (i = 1; i < req.body.length; i++) {
            //get name, email, id
            var id = req.body[i].part_id
            var name = req.body[i].name
            var cost = req.body[i].current_cost
            var quantity = req.body[i].quantity_available

            //console.log("name: " + name+"    email: " + email+"     id: " + id)
            //this check fails, but it isn't technically necessary, the insert will just fail
            if (id == null || name == null || cost == null || quantity == null) {
                console.log("part " + i + " has a null field, skipping...")
                failedinserts.push({ "part_id": id, "name": name, "quantity_available": quantity, "current_cost:": cost });
            }
            else {
                console.log("id: " + id + "    name: " + name)
                console.log("Check 1- Does the part exist?")

                queries = []
                var pool2 = pool.promise();
                //we want to examine matching part id, but difference something else
                var query = toUnnamed("SELECT * FROM mydb.inventory_part p WHERE p.part_id = :part_id AND name = :part_name AND"
                    + " current_cost = :part_cost AND quantity_available = :part_quantity", {
                    part_id: id,
                    part_name: name,
                    part_cost: cost,
                    part_quantity: quantity
                });
                queries.push(pool2.query(query[0], query[1]));

                var newPart = 1
                var results = await Promise.all(queries);
                results.forEach(([rows, fields]) => {
                    if (rows.length == 1) {  //should be only 1, not 2
                        console.log("That part exists, and is entirely identical to one in the database. Will not be inserted.")
                        newPart = 0
                    }
                });

                queries = []

                var pool2 = pool.promise();
                //we want to examine matching part id, but difference something else
                var query = toUnnamed("SELECT * FROM mydb.inventory_part p WHERE p.part_id = :part_id AND (name <> :part_name OR"
                    + " current_cost <> :part_cost OR quantity_available <> :part_quantity)", {
                    part_id: id,
                    part_name: name,
                    part_cost: cost,
                    part_quantity: quantity
                });
                queries.push(pool2.query(query[0], query[1]));

                var results = await Promise.all(queries);
                //TODO : return a JSON of old, new pairs

                results.forEach(([rows, fields]) => {
                    if (rows.length == 1) {
                        console.log("ROWS: " + rows[0].current_cost)
                        oldtuples.push({ "part_id": rows[0].part_id, "name": rows[0].name, "quantity_available": rows[0].quantity_available, "current_cost:": parseFloat(rows[0].current_cost) })
                        newtuples.push({ "part_id": id, "name": name, "quantity_available": quantity, "current_cost:": cost })
                        console.log("That part exists, but you have supplied different values for one of the attributes");
                        console.log("oldtuple" + oldtuples)
                        console.log("newtuple" + newtuples)
                        status = 400;
                        newPart = 0;
                        conflictinserts.push([oldtuples, newtuples])
                    }
                });

                if (newPart) {
                    console.log("Attempting to insert a part...");
                    queries = []

                    const pool2 = pool.promise();
                    var query = toUnnamed("INSERT into mydb.inventory_part VALUES(:id, :name, :quantity, :cost);", {
                        id: id,
                        name: name,
                        quantity: quantity,
                        cost: cost
                    });
                    queries.push(pool2.query(query[0], query[1]));


                    //console.log("NUMQUERIES: " + queries.length);
                    //later: change error msg to be which part and why
                    const results = await Promise.all(queries).catch(() => {
                        console.log("One of the tools failed to insert."); status = 400;
                        failedinserts.push({ "part_id": id, "name": name, "quantity_available": quantity, "current_cost:": cost })
                    });
                }
            }//async
        }//outer loop

        var myjson = ""
        myjson = { "conflictinserts": { "old": oldtuples, "new": newtuples }, "failedinserts": failedinserts }

        if (status == 400) {
            return res.status(status).json(myjson);
        }
        else {
            return res.status(status).send("SUCCESS");
        }


    })();
});


module.exports = router;
