var express = require('express');
var router = express.Router();
var toUnnamed = require('named-placeholders')();

//sql connection
var pool = require('../db.js')

//SIMPLE DETAIL REPORT
//i.e. http://localhost:port/expense/simple?year=YYYY&month=MM
//i.e. http://localhost:3500/expense/simple?year=2021&month=03
router.get("/simple", (req, res) => {

  if (!req.query.start && !req.query.end) {
    //no parameters given
    return res.status(400).send("MISSING_PARAMS");
  }

  console.log(req.query.start)
  console.log(req.query.end)
  var query = toUnnamed(
    "SELECT t.group_id `group_id`, SUM(pp.purchased_cost * pp.quantity_purchased) `total` "
    + "FROM "
    + "(SELECT * FROM mydb.transaction "
    + "WHERE transaction.type='purchase' "
    + "AND (:start <= transaction.date) AND (transaction.date < :end + '00000001')) t, "
    + "mydb.purchased_part pp "
    + "WHERE t.transaction_id = pp.transaction_id "
    + "GROUP BY t.group_id "
    + "ORDER BY t.group_id;", {
    start: req.query.start,
    end: req.query.end,
  });

  pool.query(query[0], query[1], function (err, rows, fields) {
    if (err) console.log(err)

    if (req.query.csv == "true") {
      //csv file name
      res.attachment(req.query.start + "-" + req.query.end + "_simple_report.csv");
      //prepend headers
      var headers = {};
      for (key in rows[0]) {
        headers[key] = key;
      }
      rows.unshift(headers);
      //csv response
      res.csv(rows);
    }
    else {
      //json response
      res.json(rows);
    }
  })
});



//MEDIUM DETAIL REPORT
//i.e. http://localhost:port/expense/medium?year=YYYY&month=MM
//i.e. http://localhost:3500/expense/medium?year=2021&month=03
router.get("/medium", (req, res) => {

  if (!req.query.start && !req.query.end) {
    //no parameters given
    return res.status(400).send("MISSING_PARAMS");
  }

  var query = toUnnamed(
    "SELECT gt.group_id, gt.group_total, st.net_id, st.student_total "
    + "FROM "
    + "(SELECT t.group_id, t.net_id, SUM(pp.purchased_cost * pp.quantity_purchased) student_total "
    + "FROM "
    + "  (SELECT * FROM mydb.transaction "
    + "  WHERE transaction.type='purchase' "
    + "  AND (:start <= transaction.date) AND (transaction.date < :end + '00000001')) t, "
    + "  mydb.purchased_part pp "
    + "WHERE t.transaction_id = pp.transaction_id "
    + "GROUP BY t.group_id, t.net_id) st "
    + "natural join "
    + "(SELECT t.group_id, SUM(pp.purchased_cost * pp.quantity_purchased) group_total "
    + "FROM "
    + "  (SELECT * FROM mydb.transaction "
    + "  WHERE transaction.type='purchase' "
    + "  AND (:start <= transaction.date) AND (transaction.date < :end + '00000001')) t, "
    + "    mydb.purchased_part pp "
    + "WHERE t.transaction_id = pp.transaction_id "
    + "GROUP BY t.group_id) gt "
    + "ORDER BY gt.group_id, st.net_id; ", {
    start: req.query.start,
    end: req.query.end,
  });

  pool.query(query[0], query[1], function (err, rows, fields) {
    if (err) console.log(err)

    if (req.query.csv == "true") {
      //csv file name
      res.attachment(req.query.start + "-" + req.query.end + "_medium_report.csv");
      //prepend headers
      var headers = {};
      for (key in rows[0]) {
        headers[key] = key;
      }
      rows.unshift(headers);
      //csv response
      res.csv(rows);
    }
    else {
      //json response
      res.json(rows);
    }
  })
});



//FULL DETAIL REPORT
//i.e. http://localhost:port/expense/full?year=YYYY&month=MM
//i.e. http://localhost:3500/expense/full?year=2021&month=03
router.get("/full", (req, res) => {

  if (!req.query.start && !req.query.end) {
    //no parameters given
    return res.status(400).send("MISSING_PARAMS");
  }

  var query = toUnnamed(
    "SELECT gs.group_id, gs.group_total, gs.net_id, gs.student_total, li.part_id,  li.`quantity_purchased*cost_per_unit`, li.quantity_purchased, li.cost_per_unit, li.date "
    + "FROM "
    + "(SELECT t.group_id, t.net_id, pp.part_id, pp.quantity_purchased, pp.purchased_cost cost_per_unit, pp.quantity_purchased*pp.purchased_cost as `quantity_purchased*cost_per_unit`, t.date "
    + "FROM "
    + "  (SELECT * FROM mydb.transaction "
    + "  WHERE transaction.type='purchase' "
    + "  AND (:start <= transaction.date) AND (transaction.date < :end + '00000001')) t, "
    + "    mydb.group_has_student gs, "
    + "    mydb.purchased_part pp "
    + "WHERE t.group_id = gs.group_id AND t.net_id = gs.net_id AND t.type = 'purchase' AND t.transaction_id = pp.transaction_id "
    + "ORDER BY t.group_id) li "
    + "natural join "
    + "(SELECT gt.group_id, gt.group_total, st.net_id, st.student_total "
    + "FROM "
    + "(SELECT t.group_id, t.net_id, SUM(pp.purchased_cost * pp.quantity_purchased) student_total "
    + "FROM "
    + "  (SELECT * FROM mydb.transaction "
    + "  WHERE transaction.type='purchase' "
    + "  AND (:start <= transaction.date) AND (transaction.date < :end + '00000001')) t, "
    + "    mydb.purchased_part pp "
    + "WHERE t.transaction_id = pp.transaction_id "
    + "GROUP BY t.group_id, t.net_id) st "
    + "natural join "
    + "(SELECT t.group_id, SUM(pp.purchased_cost * pp.quantity_purchased) group_total "
    + "FROM "
    + "  (SELECT * FROM mydb.transaction "
    + "  WHERE transaction.type='purchase' "
    + "  AND (:start <= transaction.date) AND (transaction.date < :end + '00000001')) t, "
    + "    mydb.purchased_part pp "
    + "WHERE t.transaction_id = pp.transaction_id "
    + "GROUP BY t.group_id) gt) gs "
    + "ORDER BY gs.group_id, gs.net_id, li.part_id; ", {
    start: req.query.start,
    end: req.query.end,
  });

  pool.query(query[0], query[1], function (err, rows, fields) {
    if (err) console.log(err)

    if (req.query.csv == "true") {
      //csv file name
      res.attachment(req.query.start + "-" + req.query.end + "_full_report.csv");
      //prepend headers
      var headers = {};
      for (key in rows[0]) {
        headers[key] = key;
      }
      rows.unshift(headers);
      //csv response
      res.csv(rows);
    }
    else {
      //json response
      res.json(rows);
    }
  })
});

module.exports = router;