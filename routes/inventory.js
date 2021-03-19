var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser')

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

  myquery= "SELECT * FROM mydb.inventory_part WHERE part_id="+id
    pool.query(myquery, function (err, rows, fields) {
      if (err) throw err
  
      console.log('The solution is: ', rows)
      res.json(rows);
    })

    console.log('finished route')
});

//i.e. http://localhost:3006/inventory/search?name=phil 
//will theoretically return 12345 phillips screw x
router.get("/searchname",(req,res) => {
  //arguments
  var name= req.query.name

    myquery= "SELECT * FROM mydb.inventory_part WHERE LOWER(name) LIKE LOWER('%"+ name+ "%')"
    pool.query(myquery, function (err, rows, fields) {
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
  for(i=0; i < req.cart.length; i++){
    var transcation_id= 556; //this is just some random number for now
    var part_id= req.body.cart[i].item.part_id
    var net_id=NULL;
    var date= NULL;
    var description= NULL;
    var name= req.body.cart[i].item.name
    var quantity_wanted= req.body.cart[i].item.quantity
    var current_cost= req.body.cart[i].item.current_cost
    
    myquery= "INSERT into mydb.purchase (transcation_id, part_id, net_id, date, description, name, quantity_available, current_cost) VALUES (" + transaction_id + ", " + part_id+ ", '" + net_id+ ", '"+  date +"' , '"+ description + "' , '"+ name + "' , " + quantity_wanted + ", " + current_cost + ")"
    pool.query(myquery, function (err, rows, fields) {
        if (err) throw err
        else{
          res.json("Successfully inserted.");
        }
      })

      console.log('finished route')
  }
});


module.exports = router;