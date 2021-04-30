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

//we use regex because testing for datatypes is unreliable when all string/some int
function validate(id, name, quantity, cost) {
    //check if valid id
    var regex=/[0-9]/; //only 1-9
    var letters=/[a-zA-Z]/
    if(! regex.test(id) || letters.test(id)){
        console.log("A")
        return -1;
    }
    var regex= /^[^\.]*$/ //no periods
    if(! regex.test(quantity) || letters.test(id)){ 
        console.log("C")
        return -1;
    }
    var regex=/^[0-9]\d*(((,\d{3}){1})?(\.\d{0,2})?)$/ //valid money format
    if(! regex.test(cost) || letters.test(id)){ 
        console.log("D")
        return -1;
    }
    return 1;
}

//i.e. http://localhost:port/inventory/parts
router.get("/", (req, res) => {
    myquery = "SELECT * FROM mydb.inventory_part WHERE part_id > 0"
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
            "SELECT * FROM mydb.inventory_part p WHERE p.part_id IN (:part_id , -1* :part_id);", {
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
        return res.json({"message":'MISSING_PARAMS'});
    }

    //query DB
    pool.query(myquery[0], myquery[1], function (err, rows, fields) {
        if (err) console.log(err);
        res.json(rows);
    });
});

router.post("/insert", (req, res) => {
    var numduplicate = 0, numsuccess = 0, numfailed = 0;

    (async function sendquery(param) {
        newtuples=[]
        oldtuples=[]
        failedinserts=[]

        var id= req.body.part_id;
        var name= req.body.name;
        var quantity= req.body.quantity_available;
        var cost= req.body.current_cost;

        var proceed=1;
        //easy checks that don't require queries
        if( (validate(id,name,quantity,cost)  == -1) || req.body.part_id < 0 || req.body.quantity_available < 0 || req.body.current_cost < 0){
            proceed=0;
            failedinserts.push({ "part_id": id, "name": name, "quantity_available": quantity, "current_cost": cost });
            numfailed = numfailed+1;
            var myjson = {
                "conflictinserts": { "old": oldtuples, "new": newtuples }, "failedinserts": failedinserts,
                "numtotal": 1, "numduplicate": numduplicate, "numsuccess": numsuccess, "numfailed": numfailed
            }
            return res.json(myjson);
        }

        var pool2 = pool.promise();
        var queries=[]
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

        results.forEach(([rows, fields]) => {
            if (rows.length == 1) {
                oldtuples.push({ "part_id": rows[0].part_id, "name": rows[0].name, "quantity_available": rows[0].quantity_available, "current_cost": parseFloat(rows[0].current_cost) })
                newtuples.push({ "part_id": parseInt(id), "name": name, "quantity_available": parseInt(quantity), "current_cost": parseFloat(cost) })
                console.log("That part exists, but you have supplied different values for one of the attributes");
                status = 412;
                proceed = 0;
            }
        });

        var queries=[]
        var pool2 = pool.promise();
        //matching everything
        var query = toUnnamed("SELECT * FROM mydb.inventory_part p WHERE p.part_id = :part_id AND name = :part_name AND"
            + " current_cost = :part_cost AND quantity_available = :part_quantity", {
            part_id: id,
            part_name: name,
            part_cost: cost,
            part_quantity: quantity
        });
        queries.push(pool2.query(query[0], query[1]));
        var results = await Promise.all(queries);

        results.forEach(([rows, fields]) => {
            if (rows.length == 1) {
                console.log("That part exists, and is entirely identical to one in the database. Will not be inserted.");
                status = 412;
                numduplicate = numduplicate + 1 
                proceed = 0;
            }
        });

        if(proceed){
            var queries = []
            var query = toUnnamed("INSERT into mydb.inventory_part VALUES(:part_id, :name, :quantity_available, :current_cost)", {
                part_id: req.body.part_id,
                name: req.body.name,
                quantity_available: req.body.quantity_available,
                current_cost: req.body.current_cost
            });
            queries.push(pool2.query(query[0], query[1]));
            await Promise.all(queries).catch(() => { console.log("Some sql error in insertion"); status = 412; numfailed=numfailed+1;});
        }
        numsuccess= 1-(oldtuples.length + failedinserts.length);
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

//i.e. http://localhost:port/inventory/parts/modify
router.post("/modify", (req, res) => {
    if( validate(req.body.part_id,req.body.name,req.body.quantity_available,req.body.current_cost)  == -1){
        return res.json({"message":'BAD_DATATYPES'})
    }

    (async function sendquery(param) {
        queries = []

        var query = toUnnamed("SELECT * FROM mydb.inventory_part WHERE part_id = :part_id", {
            part_id: req.body.part_id,
            name: req.body.name,
            quantity_available: req.body.quantity_available,
            current_cost: req.body.current_cost
        });
        if (req.body.part_id < 0) {
            return res.json({"message":'DELETED_PART'})
        }

        queries.push(pool2.query(query[0], query[1]));

        var status = 200;
        var results = await Promise.all(queries);
        console.log("done with queries")
        results.forEach(([rows, fields]) => { if (rows.length == 0) { console.log("No part with that ID"); status = 412; } });
        if (status == 400) {
            return res.json({"message":'INVALID_ID'});
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
        return res.json({"message":'SUCCESS'});

    })();
});

router.post("/delete", (req, res) => {
    var part_id = req.query.part_id;
    console.log("Part to delete: ", part_id);

    (async function sendquery(param) {
        var pool2 = pool.promise();
        queries = []

        var query = toUnnamed("SELECT * FROM mydb.inventory_part WHERE part_id = :part_id", {
            part_id: part_id
        });

        queries.push(pool2.query(query[0], query[1]));

        var status = 200;
        var results = await Promise.all(queries);
        results.forEach(([rows, fields]) => { if (rows.length == 0) { console.log("No part with that ID"); status = 400; } });
        if (status == 400) {
            return res.json({"message":'INVALID_ID'});
        }

        console.log("There is a part with id: " + part_id)
        var pool2 = pool.promise();
        queries = []
        var query2 = toUnnamed("UPDATE mydb.inventory_part SET part_id = (:part_id * -1) WHERE (part_id = :part_id)", {
            part_id: req.query.part_id,
        });
       
        queries.push(pool2.query(query2[0], query2[1]));

        var status = 200;
        var results = await Promise.all(queries);  //.catch(() => { console.log("Deletion failed."); status = 400; });
        if (status == 400) {
            return res.json({"message":'SQL_ERROR'});
        }
        else {
            return res.json({"message":'SUCCESS'});
        }
    })();
});


//http://localhost:3500/inventory/buy
//include validate into this
router.post("/buy", (req, res) => {
    if(req.query.super){
        var superbuy=1;
      }
      else{
        var superbuy=0;
      }

    (async function sendquery(param) {
        queries = []
        var status = 200;
        if(! superbuy){
            //CHECK: does the student have a hold?
            var pool2= pool.promise();
            var query = toUnnamed(
                "select * "
                + "from mydb.transaction, mydb.rented_tool, mydb.rental_tool, mydb.student"
                +  " where mydb.transaction.transaction_id= mydb.rented_tool.transaction_id"
                + " and mydb.transaction.net_id = mydb.student.net_id"
                + " and mydb.rented_tool.tool_id = mydb.rental_tool.tool_id "
                +  "and mydb.rented_tool.returned_date is null and mydb.rental_tool.tool_id > 0 and mydb.transaction.group_id = :group_id;" ,{
                group_id: req.body.customer.group_id
            });
            
            queries.push(pool2.query(query[0], query[1]));
            var results = await Promise.all(queries);
            var valid = []

            results.forEach(([rows, fields]) => { if (rows.length == 1) { console.log("That group has a hold"); console.log(rows.length); status = 400; } });
            results.forEach(([rows, fields]) => { valid.push(rows[0]); console.log(rows[0]); });

            if (status != 200) {
                return res.json({"message":'GROUP_HOLD'});
            }
        }
        console.log("The group does not have a hold")
        queries = []
        

        //CHECK: does the student, group pair exist?
        queries = []
        var pool2 = pool.promise();
        
        console.log("netid, groupid", req.body.customer.net_id,req.body.customer.group_id)
        var query = toUnnamed("SELECT * FROM mydb.Group_has_student ghs WHERE ghs.net_id= :net_id AND ghs.group_id = :group_id", {
            net_id: req.body.customer.net_id,
            group_id: req.body.customer.group_id
        });
        queries.push(pool2.query(query[0], query[1]));

        var results = await Promise.all(queries);

        results.forEach(([rows, fields]) => { 
            if (rows.length == 0) { 
                console.log("ROWS", rows); 
                status = 400; console.log("The student,group pair doesn't exist"); 
            }
        });
      
        if (status == 400) {
            return res.json({"message":'STUDENT_GROUP_MISMATCH'});
        }

        for (i = 0; i < req.body.cart.length; i++) {
            if (req.body.cart[i].item.part_id < 0) {
                return res.json({"message":'DELETED_PART'});
            }

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
            return res.json({"message":'INVALID_FIELDS'});
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
            return res.json({"message":'SQL_ERROR'});
        });
        return res.json({"message":'SUCCESS'});
    })();
});



router.post("/upload", (req, res) => {
    var failedinserts = []
    var conflictinserts = [] //this isn't really being used, new and oldtuples are instead
    var newtuples = []
    var oldtuples = []

    var numrows = 0, numduplicate = 0, numsuccess = 0, numfailed = 0;
    console.log(req.body)
    numrows = req.body.length;

    var i, j;
    var status = 200;
    (async function sendquery(param) {
        for (i = 0; i < req.body.length; i++) {
            //get name, email, id
            var id = req.body[i].part_id
            var name = req.body[i].name
            var cost = req.body[i].current_cost
            var quantity = req.body[i].quantity_available

            if (id < 0) {
                return res.json({"message":'DELETED_PART'});
            }

            //console.log("name: " + name+"    email: " + email+"     id: " + id)
            //this check fails, but it isn't technically necessary, the insert will just fail
            if (id == null || name == null || cost == null || quantity == null || id == '' || name == '' || cost == '' || quantity == ''
                || validate(req.body[i].part_id,req.body[i].name,req.body[i].quantity_available,req.body[i].current_cost) == -1) {
                console.log("part " + i + " has a null field or bad datatype, skipping...")
                failedinserts.push({ "part_id": id, "name": name, "quantity_available": quantity, "current_cost": cost });
                status = 400;
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
                        oldtuples.push({ "part_id": rows[0].part_id, "name": rows[0].name, "quantity_available": rows[0].quantity_available, "current_cost": parseFloat(rows[0].current_cost) })
                        newtuples.push({ "part_id": parseInt(id), "name": name, "quantity_available": parseInt(quantity), "current_cost": parseFloat(cost) })
                        newPart = 0;
                        numduplicate = numduplicate + 1;
                        status=400; //added
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
                        oldtuples.push({ "part_id": rows[0].part_id, "name": rows[0].name, "quantity_available": rows[0].quantity_available, "current_cost": parseFloat(rows[0].current_cost) })
                        newtuples.push({ "part_id": parseInt(id), "name": name, "quantity_available": parseInt(quantity), "current_cost": parseFloat(cost) })
                        console.log("That part exists, but you have supplied different values for one of the attributes");
                        status = 400;
                        newPart = 0;
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
                        failedinserts.push({ "part_id": id, "name": name, "quantity_available": quantity, "current_cost": cost })
                    });
                }
            }//async
        }//outer loop

        numfailed = conflictinserts.length + failedinserts.length
        numsuccess = numrows - (numduplicate + numfailed)
        var myjson = ""
        myjson = {
            "conflictinserts": { "old": oldtuples, "new": newtuples }, "failedinserts": failedinserts,
            "numtotal": numrows, "numduplicate": numduplicate, "numsuccess": numsuccess, "numfailed": numfailed
        }

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


module.exports = router;
