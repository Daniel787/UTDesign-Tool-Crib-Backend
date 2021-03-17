var createError = require('http-errors');
var express = require('express');
const bodyParser = require('body-parser');
const mysql      = require('mysql');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var app = express();

console.log(process.env.PORT);
app.listen(process.env.PORT || 3006, () => {
  console.log('Go to http://localhost:'+(process.env.PORT || 3006)+'/inventory to see inventory');
 });

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//routers
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var inventoryRouter = require('./routes/inventory');
var toolsRouter = require('./routes/tools');
var studentRouter = require('./routes/student');
var groupRouter = require('./routes/group');
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/inventory', inventoryRouter);
app.use('/tools', toolsRouter);
app.use('/student', studentRouter);
app.use('/group', groupRouter);

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