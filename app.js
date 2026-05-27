require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var SQLiteStore = require('connect-sqlite3')(session);
var passport = require('passport');
var { csrfSync } = require('csrf-sync');
var rateLimit = require('express-rate-limit');
var userDb = require('./lib/db-users');

var indexRouter = require('./routes/index');
var mapRouter = require('./routes/map');
var apiRouter = require('./routes/api');
var authRouter = require('./routes/auth');

var app = express();

var isProduction = process.env.NODE_ENV === 'production';

// Initialize user database
userDb.initDb().catch(err => console.error('Failed to init users DB:', err));

// Trust proxy in production (behind Traefik)
if (isProduction) {
  app.set('trust proxy', 1);
}

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
    secure: isProduction,
    sameSite: 'lax',
  },
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// CSRF protection
var { csrfSynchronisedProtection, generateToken } = csrfSync({
  getTokenFromRequest: (req) => req.body._csrf || req.headers['x-csrf-token'],
});

// Make user and CSRF token available to all views
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.csrfToken = generateToken(req);
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
  if (isProduction) {
    console.error('Error:', err.message);
  } else {
    console.error(err.stack);
  }
  res.status(err.status || 500);
  res.render('error');
});

// Export rate limiter and CSRF for use in routes
app.locals.csrfProtection = csrfSynchronisedProtection;
app.locals.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: 'Too many attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = app;
