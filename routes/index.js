var express = require('express');
var router = express.Router();
const stateHelper = require('./helpers/states');

/* GET home page. */
router.get('/', function(req, res, next) {
  var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  var states = req.query['active'];

  // Expecting a string like 'US-CA,US-NY'
  if (states) {
    states = states.split(',').map(state => state.slice(3).toUpperCase());
    states = stateHelper.filterStates(states);
  } else {
    states = [];
  }
  imgPath = '/map/us/' + states.join('-') + '.png';
  var imgUrl = req.protocol + '://' + req.get('host') + imgPath;

  var stateListStr = states.join(', ');
  var stateCount = states.length;
  res.render('index', { 
    title: 'Ca-PEE-tal Tracker',
    fullUrl,
    imgUrl,
    stateListStr,
    stateCount,
  });
});

module.exports = router;
