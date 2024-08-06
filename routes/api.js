var express = require('express');
var router = express.Router();
const sqlite3 = require('sqlite3');
const fs = require("fs");

/* GET users listing. */
router.post('/save', function(req, res, next) {
  const session = req.body.session;
  const locations = req.body.locations;
  const region = req.body.region;
  const dbPath = process.env.SQLITE_DB_PATH + region.toLowerCase() + '.db';
  /*
  console.log('region:', region);
  console.log('session:', session);
  console.log('locations:', locations);
  console.log('dbPath:', dbPath);
  */
  const db = new sqlite3.Database(dbPath);
  db.run(`INSERT OR REPLACE INTO locations(session, last_update, locations) VALUES(?, CURRENT_TIMESTAMP, ?)`, 
      [session, locations],
      function(error){
          if (error) {
              console.log(error);
              next(error);
          } else {
              res.send('OK');
          }
      }
  );
});

router.get('/refresh-stats/:region', function(req, res, next) {

  const region = req.params.region;

  const regionHash = require(`../public/json/region/${region}.json`)
  Object.keys(regionHash).forEach((i) => regionHash[i] = 0);

  const dbPath = process.env.SQLITE_DB_PATH + region.toLowerCase() + '.db';
  const db = new sqlite3.Database(dbPath);
  db.all(`SELECT locations FROM locations`, function(error, rows){
      if (error) {
          console.log('SQL ERROR: ' + error);
          next(error);
      } else {
          var regionCount = 0;
          rows.forEach(row => {
              var locations = row.locations.split(',');
              locations.forEach(location => {
                  regionHash[location] += 1;
              });
              regionCount++;
          });
          const statfile = process.env.STATS_PATH + region.toLowerCase() + '.json';
          console.log('Writing stats to ' + statfile);
          const statHash = {
            regionHash,
            regionCount
         };
          fs.writeFileSync(statfile, JSON.stringify(statHash));
          // /data/stats/us.json
          res.send(statHash);
      }
  });
});

module.exports = router;
