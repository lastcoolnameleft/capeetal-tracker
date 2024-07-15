var express = require('express');
var router = express.Router();
const sqlite3 = require('sqlite3');

/* GET users listing. */
router.post('/save', function(req, res, next) {
  const session = req.body.session;
  const locations = req.body.locations;
  const region = req.body.region;
  const dbPath = process.env.SQLITE_DB_PATH + region.toLowerCase() + '.db';
  console.log('region:', region);
  console.log('session:', session);
  console.log('locations:', locations);
  console.log('dbPath:', dbPath);
  const db = new sqlite3.Database(dbPath);
  db.run(`INSERT OR REPLACE INTO locations(session, last_update, locations) VALUES(?, CURRENT_TIMESTAMP, ?)`, 
      [session, locations],
      function(error){
          console.log(error);
      }
  );
  res.send('OK');
});

module.exports = router;
