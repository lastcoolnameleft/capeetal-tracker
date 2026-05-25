const express = require('express');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcrypt');
const userDb = require('../lib/db-users');

const router = express.Router();
const SALT_ROUNDS = 10;

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await userDb.findUserById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Local strategy (email/password)
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    try {
      const user = await userDb.findUserByEmail(email.toLowerCase());
      if (!user) return done(null, false, { message: 'No account with that email.' });
      if (!user.password_hash) return done(null, false, { message: 'Please use Google to sign in.' });
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) return done(null, false, { message: 'Incorrect password.' });
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// Google OAuth strategy (only if credentials provided)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await userDb.findUserByGoogleId(profile.id);
      if (!user) {
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        user = await userDb.createUser({
          email: email,
          displayName: profile.displayName,
          googleId: profile.id,
        });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));
}

// Routes
router.get('/login', (req, res) => {
  const error = req.query.error || null;
  res.render('login', { error, user: req.user || null });
});

router.get('/register', (req, res) => {
  const error = req.query.error || null;
  res.render('register', { error, user: req.user || null });
});

router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.redirect('/auth/login?error=' + encodeURIComponent(info.message));
    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.redirect('/');
    });
  })(req, res, next);
});

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, display_name } = req.body;
    if (!email || !password) {
      return res.redirect('/auth/register?error=' + encodeURIComponent('Email and password are required.'));
    }
    if (password.length < 6) {
      return res.redirect('/auth/register?error=' + encodeURIComponent('Password must be at least 6 characters.'));
    }
    const existing = await userDb.findUserByEmail(email.toLowerCase());
    if (existing) {
      return res.redirect('/auth/register?error=' + encodeURIComponent('An account with that email already exists.'));
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await userDb.createUser({
      email: email.toLowerCase(),
      passwordHash,
      displayName: display_name || email.split('@')[0],
    });
    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.redirect('/');
    });
  } catch (err) {
    next(err);
  }
});

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/login?error=Google+login+failed' }),
  (req, res) => {
    res.redirect('/');
  }
);

router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect('/');
  });
});

module.exports = router;
