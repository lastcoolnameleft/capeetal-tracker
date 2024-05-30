var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  var states = req.query['active'];

  // Expecting a string like 'US-CA,US-NY'
  if (states) {
    states = states.split(',').map(state => state.slice(3));
  } else {
    states = [];
  }
  imgPath = '/map/us/' + states.join('-') + '.png';
  var imgUrl = req.protocol + '://' + req.get('host') + imgPath;

  res.render('index', { 
    title: 'Ca-PEE-tal Tracker',
    fullUrl,
    imgUrl,
  });
});

module.exports = router;
