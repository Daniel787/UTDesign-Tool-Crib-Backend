var express = require('express');
var router = express.Router();

//subrouters
var toolsRouter = require('./tools');
var partsRouter = require('./parts.js');
router.use('/tools', toolsRouter);
router.use('/parts', partsRouter);

module.exports = router;