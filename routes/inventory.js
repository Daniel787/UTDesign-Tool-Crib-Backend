var express = require('express');
const nodemon = require('nodemon');
var router = express.Router();
//var bodyParser = require('body-parser')

//sql connection
var pool = require('../db.js')

//i.e. http://localhost:port/inventory/
router.get("/",(req,res) => {

  myquery= "SELECT * FROM mydb.inventory_part"
    pool.query(myquery, function (err, rows, fields) {
      if (err) throw err
  
      console.log('The solution is: ', rows)
      res.json(rows);
    })

    console.log('finished route')
});

//i.e. http://localhost:port/inventory/search?id=12345
router.get("/search",(req,res) => {
  //arguments
  var id= req.query.id

  myquery= "SELECT * FROM mydb.inventory_part WHERE part_id=?"
    pool.query(myquery, [id], function (err, rows, fields) {
      if (err) throw err
  
      console.log('The solution is: ', rows)
      res.json(rows);
    })

    console.log('finished route')
});

//i.e. http://localhost:3006/inventory/searchname?name=phil 
//will theoretically return 12345 phillips screw x
router.get("/searchname",(req,res) => {
  //arguments
  var name= req.query.name

    //myquery= "SELECT * FROM mydb.inventory_part WHERE LOWER(name) LIKE LOWER(%" + name+ "%)"
    myquery= "SELECT * FROM mydb.inventory_part WHERE LOWER(name) LIKE LOWER(CONCAT('%', ?, '%'))"
    pool.query(myquery, [name], function (err, rows, fields) {
      if (err) throw err
  
      console.log('The solution is: ', rows)
      res.json(rows);
    })

    console.log('finished route')
});

/*
//?part_id?name?quantity?current_cost
//i.e. http://localhost:port/inventory/insert?part_id=11123?name='Hot Iron'
router.post("/insert",(req,res) => {
  //arguments
  var part_id= req.query.part_id
  var name= req.query.name
  var quantity= req.query.quantity
  var current_cost= req.query.current_cost

  //later: test if any of the parameters are null

  //myquery= "insert into mydb.inventory_part (part_id, name, quantity_available, current_cost) VALUES (11115, 'Hot Iron', 11, .55)"
  myquery= "INSERT into mydb.inventory_part (part_id, name, quantity_available, current_cost) VALUES (" + part_id+ ", '" +  name + "' , " + quantity + ", " + current_cost + ")"
  pool.query(myquery, function (err, rows, fields) {
      if (err) throw err
      else{
        res.json("Successfully inserted.");
      }
    })

    console.log('finished route')
});
*/

//uses body parser
router.post("/insert",(req,res) => {

  //later: test if any of the parameters are null

  //myquery= "insert into mydb.inventory_part (part_id, name, quantity_available, current_cost) VALUES (11115, 'Hot Iron', 11, .55)"
  console.log(req.body);
  
  for(i=0; i < req.body.cart.length; i++){
  //for(i=0; i < 1; i++){
    var transaction_id= 556; //this is just some random number for now
    var part_id= req.body.cart[i].item.part_id
    var group_id=357;
    var type= "rent"
    var net_id=req.body.net_id;
    //var date= today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    var date= "2020-11-11";
    var description= "OK";
    var name= req.body.cart[i].item.name
    var quantity_purchased= req.body.cart[i].quantity
    var current_cost= req.body.cart[i].item.current_cost
    
    console.log("OK")
    //myquery= "INSERT into mydb.transaction (transaction_id, part_id, quantity_purchased, purchased_cost) VALUES (" + "556" + ", " + "12345" + ", "+  "6" + current_cost + ");" +  "INSERT into mydb.purchased_part (transaction_id, part_id, quantity_purchased, purchased_cost) VALUES (" + transaction_id + ", " + "12345" + ", " + quantity_purchased + ", " + current_cost + ")"
    myquery= "INSERT INTO mydb.transaction(transaction_id, group_id, net_id, date, type) VALUES (?, ?, ?, ?, ?); INSERT into mydb.purchased_part (transaction_id, part_id, quantity_purchased, purchased_cost) VALUES(?, ?, ?, ?)"
    pool.query(myquery, [ transaction_id, group_id, net_id, date, type, transaction_id, part_id, quantity_purchased, current_cost], function (err, rows, fields) {
        if (err) throw err
        else{
          res.json("Successfully inserted.");
        }
      })
   
      console.log('finished route')
  }

});


module.exports = router;