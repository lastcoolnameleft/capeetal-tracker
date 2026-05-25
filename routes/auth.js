const express = require('express');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const validator = require('validator');
const userDb = require('../lib/db-users');
const { sendPasswordResetEmail } = require('../lib/email');

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
  const { csrfProtection, authLimiter } = req.app.locals;
  authLimiter(req, res, () => {
    csrfProtection(req, res, () => {
      // Sanitize input
      const email = validator.trim(req.body.email || '').toLowerCase();
      if (!validator.isEmail(email)) {
        return res.redirect('/auth/login?error=' + encodeURIComponent('Please enter a valid email.'));
      }
      req.body.email = email;

      passport.authenticate('local', (err, user, info) => {
        if (err) return next(err);
        if (!user) return res.redirect('/auth/login?error=' + encodeURIComponent(info.message));
        req.logIn(user, (err) => {
          if (err) return next(err);
          return res.redirect('/');
        });
      })(req, res, next);
    });
  });
});

router.post('/register', (req, res, next) => {
  const { csrfProtection, authLimiter } = req.app.locals;
  authLimiter(req, res, () => {
    csrfProtection(req, res, async () => {
      try {
        const email = validator.trim(req.body.email || '').toLowerCase();
        const password = req.body.password || '';
        const displayName = validator.trim(validator.escape(req.body.display_name || ''));

        if (!validator.isEmail(email)) {
          return res.redirect('/auth/register?error=' + encodeURIComponent('Please enter a valid email address.'));
        }
        if (password.length < 8) {
          return res.redirect('/auth/register?error=' + encodeURIComponent('Password must be at least 8 characters.'));
        }
        if (displayName.length > 50) {
          return res.redirect('/auth/register?error=' + encodeURIComponent('Display name must be 50 characters or less.'));
        }
        const existing = await userDb.findUserByEmail(email);
        if (existing) {
          return res.redirect('/auth/register?error=' + encodeURIComponent('An account with that email already exists.'));
        }
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        const user = await userDb.createUser({
          email,
          passwordHash,
          displayName: displayName || email.split('@')[0],
        });
        req.logIn(user, (err) => {
          if (err) return next(err);
          return res.redirect('/');
        });
      } catch (err) {
        next(err);
      }
    });
  });
});

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/login?error=Google+login+failed' }),
  (req, res) => {
    res.redirect('/');
  }
);

// Forgot password
router.get('/forgot', (req, res) => {
  const error = req.query.error || null;
  const success = req.query.success || null;
  res.render('forgot', { error, success, user: req.user || null });
});

router.post('/forgot', (req, res, next) => {
  const { csrfProtection, authLimiter } = req.app.locals;
  authLimiter(req, res, () => {
    csrfProtection(req, res, async () => {
      try {
        const email = validator.trim(req.body.email || '').toLowerCase();
        if (!validator.isEmail(email)) {
          return res.redirect('/auth/forgot?error=' + encodeURIComponent('Please enter a valid email.'));
        }
        const user = await userDb.findUserByEmail(email);
        // Always show success to prevent email enumeration
        if (!user) {
          return res.redirect('/auth/forgot?success=1');
        }
        // Generate token (1 hour expiry)
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        await userDb.createResetToken(user.id, token, expiresAt);

        const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset?token=${token}`;
        await sendPasswordResetEmail(user.email, resetUrl);

        return res.redirect('/auth/forgot?success=1');
      } catch (err) {
        next(err);
      }
    });
  });
});

// Reset password
router.get('/reset', (req, res) => {
  const token = req.query.token || '';
  const error = req.query.error || null;
  res.render('reset', { token, error, user: req.user || null });
});

router.post('/reset', (req, res, next) => {
  const { csrfProtection, authLimiter } = req.app.locals;
  authLimiter(req, res, () => {
    csrfProtection(req, res, async () => {
      try {
        const token = req.body.token || '';
        const password = req.body.password || '';
        if (password.length < 8) {
          return res.redirect(`/auth/reset?token=${token}&error=` + encodeURIComponent('Password must be at least 8 characters.'));
        }
        const resetRecord = await userDb.findValidResetToken(token);
        if (!resetRecord) {
          return res.redirect('/auth/forgot?error=' + encodeURIComponent('Invalid or expired reset link. Please try again.'));
        }
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        await userDb.updatePassword(resetRecord.user_id, passwordHash);
        await userDb.markResetTokenUsed(token);
        return res.redirect('/auth/login?error=' + encodeURIComponent('Password updated! Please log in.'));
      } catch (err) {
        next(err);
      }
    });
  });
});

router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect('/');
  });
});

module.exports = router;
