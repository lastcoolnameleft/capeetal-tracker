var express = require('express');
var router = express.Router();
var pluralize = require('pluralize')
const stateHelper = require('./helpers/states');

/* GET home page. */
router.get('/', function(req, res, next) {
  var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  var states = req.query['active'];

  var imgPath;
  // Expecting a string like 'US-CA,US-NY'
  if (states) {
    states = states.split(',').map(state => state.slice(3).toUpperCase());
    states = stateHelper.filterStates(states);
    imgPath = '/map/us/' + states.join('-') + '.png';
    imgWidth = 556; // overlay = 521;
    imgHeight = 347; // overlay = 777;
  } else {
    states = [];
    imgPath = '/map/us/empty.png';
    imgWidth = 521;
    imgHeight = 320;
  }
  var imgUrl = req.protocol + '://' + req.get('host') + imgPath;

  var stateListStr = states.join(', ');
  var stateCount = states.length;
  res.render('index', { 
    title: 'Ca-PEE-tal Tracker',
    fullUrl,
    imgUrl,
    imgWidth,
    imgHeight,
    stateListStr,
    stateCount,
    capitalStr: pluralize('capital', stateCount),
  });
});

router.get('/about', function(req, res, next) {
  res.render('about');
});

router.get('/privacy', function(req, res, next) {
  res.render('privacy');
});

router.get('/contact', function(req, res, next) {
  res.render('contact');
});

router.get('/terms', function(req, res, next) {
  res.render('terms');
});

router.get('/stats', function(req, res, next) {
  res.render('stats');
});


module.exports = router;
