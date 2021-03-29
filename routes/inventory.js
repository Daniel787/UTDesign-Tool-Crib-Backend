var express = require('express');
const nodemon = require('nodemon');
var router = express.Router();
var toUnnamed = require('named-placeholders')();
var uuid = require('uuid');
var csv = require('express-csv');
var CronJob = require('cron').CronJob
var nodemailer = require('nodemailer')

//subrouters
var toolsRouter = require('./tools');
var partsRouter = require('./parts.js');
router.use('/tools', toolsRouter);
router.use('/parts', partsRouter);

module.exports = router;