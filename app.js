var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var SQLiteStore = require('connect-sqlite3')(session);
var passport = require('passport');
var userDb = require('./lib/db-users');

var indexRouter = require('./routes/index');
var mapRouter = require('./routes/map');
var apiRouter = require('./routes/api');
var authRouter = require('./routes/auth');

var app = express();

// Initialize user database
userDb.initDb().catch(err => console.error('Failed to init users DB:', err));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Session setup
app.use(session({
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: process.env.SQLITE_DB_PATH || './data/db/',
  }),
  secret: process.env.SESSION_SECRET || 'capeetal-dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
  },
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Make user available to all views
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/data/stats', express.static(process.env.STATS_PATH));

app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/api', apiRouter);
app.use('/map/', mapRouter);

app.use('/favicon.ico', express.static('public/images/favicon.ico'));


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
  console.log(err.stack);
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
