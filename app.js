var createError = require('http-errors');
var express = require('express');
const bodyParser = require('body-parser');
const mysql      = require('mysql');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors') 
var app = express();

app.listen(process.env.PORT || 3006, () => {
  console.log('Go to http://localhost:'+(process.env.PORT || 3006)+'/inventory to see inventory');
 });

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(cors())
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//routers
var rootRouter = require('./routes/root');
var inventoryRouter = require('./routes/inventory');
var toolsRouter = require('./routes/tools');
var studentRouter = require('./routes/student');
var groupRouter = require('./routes/group');
var expenseRouter = require('./routes/expense');
app.use('/', rootRouter);
app.use('/inventory', inventoryRouter);
app.use('/tools', toolsRouter);
app.use('/student', studentRouter);
app.use('/group', groupRouter);
app.use('/group', groupRouter);
app.use('/expense', expenseRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;