var express = require('express');
var router = express.Router();
const readXlsxFile = require('read-excel-file/node');
var toUnnamed = require('named-placeholders')();

//sql connection
var pool = require('../db.js')

router.get("/",(req,res) => {
  myquery= "SELECT * FROM mydb.student"
  pool.query(myquery, function (err, rows, fields) {
    if (err) console.log(err)
    res.json(rows);
  })
});

//i.e. http://localhost:port/student/search?net_id=180004
router.get("/search",(req,res) => {
  //arguments
  var net_id= req.query.net_id

  myquery= "SELECT * FROM mydb.student WHERE net_id=?"
  pool.query(myquery, [net_id], function (err, rows, fields) {
    if (err) console.log(err)
    res.json(rows);
  })
});

router.get("/holds",(req,res) => {

  myquery= "SELECT * FROM mydb.student WHERE student_hold = true"
  pool.query(myquery, function (err, rows, fields) {
    if (err) console.log(err)
    res.json(rows);
  })
});
  
router.get("/holds/detailed",(req,res) => {

  myquery=
  "select mydb.transaction.group_id, mydb.transaction.net_id, mydb.student.name, mydb.rental_tool.tool_id, mydb.rental_tool.name, mydb.transaction.date as rental_start "
  +"from mydb.transaction, mydb.rented_tool, mydb.rental_tool, mydb.student "
  +"where mydb.transaction.transaction_id= mydb.rented_tool.transaction_id "
  +"and mydb.transaction.net_id = mydb.student.net_id "
  +"and mydb.rented_tool.tool_id = mydb.rental_tool.tool_id "
  +"and mydb.rented_tool.returned_date is null;"
  pool.query(myquery, function (err, rows, fields) {
    if (err) console.log(err)
    res.json(rows);
  })
});

router.post("/insert", (req, res) => {
  console.log("O3")
   var query = toUnnamed("INSERT into mydb.Student VALUES(:net_id, :name, :email, :utd_id, :student_hold)", {
     net_id: req.body.net_id,
     email: req.body.email,
     utd_id: req.body.utd_id,
     name: req.body.name,
     student_hold: req.body.student_hold
   });

   pool.query(query[0],query[1], function (err, rows, fields) {
     if (err) console.log(err)
 
     console.log('Response: ', rows)
     res.send("finished");
   });
});

router.post("/upload", (req, res) => {  
  var failedinserts=[]

  readXlsxFile('Examples.xlsx').then((rows) => { //later change this to parse json object
    var i,j;
    var status=200;
  
    for(i=1; i< rows.length; i++){
       //declare default values for these 
        var group_id= rows[i][0];
        var group_name= rows[i][3];
        var sponsor= rows[i][4];

        //TODO: search the header in case some of the columns moved

      for(j=6; j<24; j++){ //TODO: also don't hardcode this
        //get name, email, id
        var name= rows[i][j]
        j++;
        var id= rows[i][j]
        j++;
        var email= rows[i][j]

        console.log("name: " + name+"    email: " + email+"     id: " + id)
        //this check fails, but it isn't technically necessary, the insert will just fail
        if(name == null || email == null || id == null){
          console.log("student " + j%3 + " has a null field, skipping...")
        }
        else{
          console.log("Attempting to insert a student...");
          (async function sendquery(param) {

            console.log("Check 1- Does the student exist?")
            queries = []

            var pool2 = pool.promise();
              var query = toUnnamed("SELECT * FROM mydb.Student WHERE net_id= :id", {
                id: id
              });
              queries.push(pool2.query(query[0], query[1]));
          
            var newStudent=0
            const results = await Promise.all(queries).catch(() => { console.log("Some random sql error");  status=412;});
            results.forEach(([rows, fields]) => { if(rows.length !=0 ) {console.log("That student already exists..."); newStudent = 1;} });
              
            //if the student already exists, check to see if his group already exists. 
            //If it does not, then we are adding another group for the same student
            if(!newStudent){
              console.log("Check 2- Does the student, group pair exist?")
              queries = []

              var pool2 = pool.promise();
  
              var query = toUnnamed("SELECT * FROM mydb.Group_has_student WHERE net_id= :id AND group_id= :group_id", {
                id: id,
                group_id:group_id
              });
              queries.push(pool2.query(query[0], query[1]));
            
              var newStudent=0
              const results = await Promise.all(queries).catch(() => { console.log("Some random sql error");  status=412;});
              results.forEach(([rows, fields]) => { if(rows.length !=0 ) {console.log("That student, group pair already exists... Overwrite?"); status=412;} });
              //later implement overwrite functionality
              if(status == 412){
                failedinserts.push(rows);
                console.log("trying next student...")
                break;
              }
            }
            
            queries = []
            pool2 = pool.promise();
            console.log("length: ")
              var query = toUnnamed("INSERT into mydb.Student VALUES(:net_id, :name, :email, :utd_id, :student_hold);"
                                    +"INSERT INTO mydb.Groups VALUES(:group_id, :group_name, :sponsor);"
                                    +"INSERT INTO mydb.Group_Has_Student VALUES(:group_id, :net_id)", {
                net_id: name, //for now, there is no netid in the sheet, need to ask
                email: email,
                name: name,
                utd_id: id,
                student_hold: 0,
                group_id: group_id,
                group_name: group_name,
                sponsor: sponsor
              });
              queries.push(pool2.query(query[0], query[1]));
              const results = await Promise.all(queries).catch(() => { console.log("One of the students failed to insert.");  status=412;});
          })();
        }//async
      }//inner loop
    }//outer loop
    return res.status(status).json(failedinserts);
  })
});

module.exports = router;