var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors') 
const nodemon = require('nodemon');
var app = express();

var server = app.listen(process.env.PORT, '0.0.0.0', () => {
  console.log('Server running on \thttp://%s:%s', '127.0.0.1', process.env.PORT);
  console.log('or on \t\t\thttp://%s:%s', server.address().address, server.address().port);
 });

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(cors({
  exposedHeaders: ['Content-Disposition'],
}));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//routers
var rootRouter = require('./routes/root');
var inventoryRouter = require('./routes/inventory');
var studentRouter = require('./routes/student');
var groupRouter = require('./routes/groups');
var expenseRouter = require('./routes/expense');
app.use('/', rootRouter);
app.use('/inventory', inventoryRouter);
app.use('/student', studentRouter);
app.use('/groups', groupRouter);
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