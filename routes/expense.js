var express = require('express');
var router = express.Router();

//sql connection
var pool = require('../db.js')

//SIMPLE DETAIL REPORT
//i.e. http://localhost:port/expense/simple?year=YYYY&month=MM
//i.e. http://localhost:3500/expense/simple?year=2021&month=03
router.get("/simple", (req, res) => {

  //get year,month parameters
  if (req.query.year && req.query.month) {
    year = req.query.year;
    month = req.query.month;
  } else {
    //parameters not given, use current year,month
    var d = new Date();
    year = d.getFullYear();
    month = d.getMonth()+1;
    month = (month < 10) ?  "0"+month : month
  }

  myquery =
   "SELECT t.group_id `group#`, SUM(pp.purchased_cost * pp.quantity_purchased) `dollars` "
  +"FROM "
  +  "(SELECT * FROM mydb.transaction "
  +  "WHERE transaction.type='purchase' "
  +  "AND (? <= transaction.date) AND (transaction.date < ? + '00000100')) t, "
  +  "mydb.purchased_part pp "
  +"WHERE t.transaction_id = pp.transaction_id "
  +"GROUP BY t.group_id "
  +"ORDER BY t.group_id;"

  pool.query(myquery, [""+year+month+"01", ""+year+month+"01"], function (err, rows, fields) {
    if (err) console.log(err)

    //csv file name
    res.attachment(""+year+"-"+month+"_simple_report.csv");
    //prepend headers
    var headers = {};
    for (key in rows[0]) {
      headers[key] = key;
    }
    rows.unshift(headers);
    //response using express-csv
    res.csv(rows);
  })
});



//MEDIUM DETAIL REPORT
//i.e. http://localhost:port/expense/medium?year=YYYY&month=MM
//i.e. http://localhost:3500/expense/medium?year=2021&month=03
router.get("/medium", (req, res) => {

  //get year,month parameters
  if (req.query.year && req.query.month) {
    year = req.query.year;
    month = req.query.month;
  } else {
    //parameters not given, use current year,month
    var d = new Date();
    year = d.getFullYear();
    month = d.getMonth()+1;
    month = (month < 10) ?  "0"+month : month
  }

  myquery =
   "SELECT gt.group_id, gt.group_total, st.net_id, st.student_total "
  +"FROM "
  +"(SELECT t.group_id, t.net_id, SUM(pp.purchased_cost * pp.quantity_purchased) student_total "
  +"FROM "
  +"  (SELECT * FROM mydb.transaction "
  +"  WHERE transaction.type='purchase' "
  +"  AND (? <= transaction.date) AND (transaction.date < ? + '00000100')) t, "
  +"  mydb.purchased_part pp "
  +"WHERE t.transaction_id = pp.transaction_id "
  +"GROUP BY t.group_id, t.net_id) st "
  +"natural join "
  +"(SELECT t.group_id, SUM(pp.purchased_cost * pp.quantity_purchased) group_total "
  +"FROM "
  +"  (SELECT * FROM mydb.transaction "
  +"  WHERE transaction.type='purchase' "
  +"  AND (? <= transaction.date) AND (transaction.date < ? + '00000100')) t, "
  +"    mydb.purchased_part pp "
  +"WHERE t.transaction_id = pp.transaction_id "
  +"GROUP BY t.group_id) gt "
  +"ORDER BY gt.group_id, st.net_id; "

  pool.query(myquery, [""+year+month+"01", ""+year+month+"01", ""+year+month+"01", ""+year+month+"01"], function (err, rows, fields) {
    if (err) console.log(err)

    //csv file name
    res.attachment(""+year+"-"+month+"_simple_report.csv");
    //prepend headers
    var headers = {};
    for (key in rows[0]) {
      headers[key] = key;
    }
    rows.unshift(headers);
    //response using express-csv
    res.csv(rows);
  })
});



//FULL DETAIL REPORT
//i.e. http://localhost:port/expense/full?year=YYYY&month=MM
//i.e. http://localhost:3500/expense/full?year=2021&month=03
router.get("/full", (req, res) => {

  //get year,month parameters
  if (req.query.year && req.query.month) {
    year = req.query.year;
    month = req.query.month;
  } else {
    //parameters not given, use current year,month
    var d = new Date();
    year = d.getFullYear();
    month = d.getMonth()+1;
    month = (month < 10) ?  "0"+month : month
  }

  myquery =
   "SELECT gs.group_id, gs.group_total, gs.net_id, gs.student_total, li.part_id,  li.`quantity_purchased*cost_per_unit`, li.quantity_purchased, li.cost_per_unit, li.date "
  +"FROM "
  +"(SELECT t.group_id, t.net_id, pp.part_id, pp.quantity_purchased, pp.purchased_cost cost_per_unit, pp.quantity_purchased*pp.purchased_cost as `quantity_purchased*cost_per_unit`, t.date "
  +"FROM "
  +"  (SELECT * FROM mydb.transaction "
  +"  WHERE transaction.type='purchase' "
  +"  AND (? <= transaction.date) AND (transaction.date < ? + '00000100')) t, "
  +"    mydb.group_has_student gs, "
  +"    mydb.purchased_part pp "
  +"WHERE t.group_id = gs.group_id AND t.net_id = gs.net_id AND t.type = 'purchase' AND t.transaction_id = pp.transaction_id "
  +"ORDER BY t.group_id) li "
  +"natural join "
  +"(SELECT gt.group_id, gt.group_total, st.net_id, st.student_total "
  +"FROM "
  +"(SELECT t.group_id, t.net_id, SUM(pp.purchased_cost * pp.quantity_purchased) student_total "
  +"FROM "
  +"  (SELECT * FROM mydb.transaction "
  +"  WHERE transaction.type='purchase' "
  +"  AND (? <= transaction.date) AND (transaction.date < ? + '00000100')) t, "
  +"    mydb.purchased_part pp "
  +"WHERE t.transaction_id = pp.transaction_id "
  +"GROUP BY t.group_id, t.net_id) st "
  +"natural join "
  +"(SELECT t.group_id, SUM(pp.purchased_cost * pp.quantity_purchased) group_total "
  +"FROM "
  +"  (SELECT * FROM mydb.transaction "
  +"  WHERE transaction.type='purchase' "
  +"  AND (? <= transaction.date) AND (transaction.date < ? + '00000100')) t, "
  +"    mydb.purchased_part pp "
  +"WHERE t.transaction_id = pp.transaction_id "
  +"GROUP BY t.group_id) gt) gs "
  +"ORDER BY gs.group_id, gs.net_id, li.part_id; "

  pool.query(myquery, [""+year+month+"01", ""+year+month+"01", ""+year+month+"01", ""+year+month+"01", ""+year+month+"01", ""+year+month+"01"], function (err, rows, fields) {
    if (err) console.log(err)

    //csv file name
    res.attachment(""+year+"-"+month+"_simple_report.csv");
    //prepend headers
    var headers = {};
    for (key in rows[0]) {
      headers[key] = key;
    }
    rows.unshift(headers);
    //response using express-csv
    res.csv(rows);
  })
});

module.exports = router;