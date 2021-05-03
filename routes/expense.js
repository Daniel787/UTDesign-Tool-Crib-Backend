var express = require('express');
var router = express.Router();
var toUnnamed = require('named-placeholders')();

//sql connection
var pool = require('../db.js')

//SIMPLE DETAIL REPORT
router.get("/simple", (req, res) => {

  if (!req.query.start && !req.query.end) {
    //no parameters given
    return res.json({"message":'MISSING_PARAMS'});
  }

  var query = toUnnamed(
    "SELECT t.group_id `group_id`, g.group_name `group name`, SUM(pp.purchased_cost * pp.quantity_purchased) `total` "
    + "FROM "
    + "(SELECT * FROM mydb.transaction "
    + "WHERE transaction.type='purchase' "
    + "AND (:start <= transaction.date) AND (transaction.date < :end + '00000001')) t, "
    + "mydb.purchased_part pp, mydb.groups g "
    + "WHERE t.transaction_id = pp.transaction_id "
    + "AND t.group_id = g.group_id "
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
router.get("/medium", (req, res) => {

  if (!req.query.start && !req.query.end) {
    //no parameters given
    return res.json({"message":'MISSING_PARAMS'});
  }

  var query = toUnnamed(
    "SELECT gt.group_id, g.group_name `group name`, gt.group_total `group total`, st.net_id, st.student_total `student total`"
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
    + "GROUP BY t.group_id) gt, mydb.groups g "
    + "WHERE gt.group_id = g.group_id "
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
router.get("/full", (req, res) => {

  if (!req.query.start && !req.query.end) {
    //no parameters given
    return res.json({"message":'MISSING_PARAMS'});
  }

  var query = toUnnamed(
    "SELECT gs.group_id, g.group_name `group name`, gs.group_total `group total`, gs.net_id, gs.student_total `student total`, li.part_id,  li.`quantity_purchased*cost_per_unit`, li.quantity_purchased, li.cost_per_unit, li.date "
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
    + "GROUP BY t.group_id) gt) gs, mydb.groups g "
    + "WHERE gs.group_id = g.group_id "
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

router.get("/toolstats", (req, res) => {

  var query =
    "SELECT tool_id, i.name, number_of_rentals, number_of_unique_renting_groups, assigned_hours, actual_hours_without_overdue, actual_hours_with_overdue_time - actual_hours_without_overdue overdue_hours, actual_hours_with_overdue_time total_actual_hours FROM( "
    +"SELECT rt.tool_id, tool.name, COUNT(t.transaction_id) number_of_rentals, COUNT(DISTINCT t.group_id) number_of_unique_renting_groups,  "
    +"  SUM(rt.hours_rented)  "
    +"    assigned_hours,  "
    +"  SUM(IF(rt.returned_date is not null, IF(TIMESTAMPDIFF(minute, t.date, rt.returned_date)/60 < rt.hours_rented, TIMESTAMPDIFF(minute, t.date, rt.returned_date)/60, rt.hours_rented), "
    +"    IF(TIMESTAMPDIFF(minute, t.date, NOW())/60 < rt.hours_rented, TIMESTAMPDIFF(minute, t.date, NOW())/60, rt.hours_rented))) "
    +"    actual_hours_without_overdue, "
    +"  SUM(IF(rt.returned_date is not null, TIMESTAMPDIFF(minute, t.date, rt.returned_date)/60, TIMESTAMPDIFF(minute, t.date, NOW())/60)) "
    +"    actual_hours_with_overdue_time "
    +"FROM mydb.transaction t, mydb.rented_tool rt, mydb.rental_tool tool "
    +"WHERE t.transaction_id = rt.transaction_id  "
    +"AND rt.tool_id = tool.tool_id  "
    +"GROUP BY tool.tool_id) i;"

  pool.query(query, function (err, rows, fields) {
    if (err) console.log(err)

    if (req.query.csv == "true") {
      //csv file name
      res.attachment("tool_stats.csv");
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