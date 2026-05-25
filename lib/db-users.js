const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = process.env.SQLITE_DB_PATH || './data/db/';
const DB_PATH = path.join(DB_DIR, 'users.db');

let db;

function getDb() {
  if (!db) {
    // Ensure directory exists
    fs.mkdirSync(DB_DIR, { recursive: true });
    db = new sqlite3.Database(DB_PATH);
    db.run('PRAGMA journal_mode=WAL');
  }
  return db;
}

function initDb() {
  const database = getDb();
  return new Promise((resolve, reject) => {
    database.serialize(() => {
      database.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE,
          password_hash TEXT,
          display_name TEXT,
          google_id TEXT UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      database.run(`
        CREATE TABLE IF NOT EXISTS user_progress (
          user_id INTEGER NOT NULL,
          region TEXT NOT NULL DEFAULT 'US',
          locations TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, region),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);
      database.run(`
        CREATE TABLE IF NOT EXISTS password_resets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          token TEXT NOT NULL UNIQUE,
          expires_at DATETIME NOT NULL,
          used INTEGER DEFAULT 0,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

function findUserByEmail(email) {
  return new Promise((resolve, reject) => {
    getDb().get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function findUserByGoogleId(googleId) {
  return new Promise((resolve, reject) => {
    getDb().get('SELECT * FROM users WHERE google_id = ?', [googleId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function findUserById(id) {
  return new Promise((resolve, reject) => {
    getDb().get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function createUser({ email, passwordHash, displayName, googleId }) {
  return new Promise((resolve, reject) => {
    getDb().run(
      'INSERT INTO users (email, password_hash, display_name, google_id) VALUES (?, ?, ?, ?)',
      [email, passwordHash || null, displayName || null, googleId || null],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, email, displayName, googleId });
      }
    );
  });
}

function getProgress(userId, region = 'US') {
  return new Promise((resolve, reject) => {
    getDb().get(
      'SELECT locations FROM user_progress WHERE user_id = ? AND region = ?',
      [userId, region],
      (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.locations : null);
      }
    );
  });
}

function saveProgress(userId, locations, region = 'US') {
  return new Promise((resolve, reject) => {
    getDb().run(
      `INSERT OR REPLACE INTO user_progress (user_id, region, locations, updated_at) 
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [userId, region, locations],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function createResetToken(userId, token, expiresAt) {
  return new Promise((resolve, reject) => {
    getDb().run(
      'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, token, expiresAt],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function findValidResetToken(token) {
  return new Promise((resolve, reject) => {
    getDb().get(
      'SELECT * FROM password_resets WHERE token = ? AND used = 0 AND expires_at > datetime("now")',
      [token],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

function markResetTokenUsed(token) {
  return new Promise((resolve, reject) => {
    getDb().run(
      'UPDATE password_resets SET used = 1 WHERE token = ?',
      [token],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function updatePassword(userId, passwordHash) {
  return new Promise((resolve, reject) => {
    getDb().run(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [passwordHash, userId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

module.exports = {
  initDb,
  findUserByEmail,
  findUserByGoogleId,
  findUserById,
  createUser,
  getProgress,
  saveProgress,
  createResetToken,
  findValidResetToken,
  markResetTokenUsed,
  updatePassword,
};
