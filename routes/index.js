var path = require('path');
var fs = require('fs');
var express = require('express');
var router = express.Router();
var pluralize = require('pluralize')
const stateHelper = require('./helpers/states');

/* GET home page. */
router.get('/', function(req, res, next) {
  const renderObject = getMapRenderObject(req);
  renderObject.is_share_page = false;
  res.render('index', renderObject);
});

router.get('/share', function(req, res, next) {
  const renderObject = getMapRenderObject(req);
  renderObject.is_share_page = true;
  res.render('index', renderObject);
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

function getMapRenderObject(req) {
  const region = 'us';
  var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  var activeRegions = req.query['active'];

  var imgPath;
  // Expecting a string like 'US-CA,US-NY'
  if (activeRegions) {
    activeRegions = activeRegions.split(',').map(activeRegion => activeRegion.slice(3).toUpperCase());
    activeRegions = stateHelper.filterStates(activeRegions);
    imgPath = '/map/us/' + activeRegions.join('-') + '.png';
    imgWidth = 600;
    imgHeight = 894;
  } else {
    activeRegions = [];
    imgPath = '/map/us/empty.png';
    imgWidth = 521;
    imgHeight = 320;
  }
  var imgUrl = req.protocol + '://' + req.get('host') + imgPath;

  var activeRegionListStr = activeRegions.join(', ');
  var activeRegionCount = activeRegions.length;
  const regionHashPath = path.resolve(__dirname, `../public/json/region/${region}.json`);
  const regionHash = JSON.parse(fs.readFileSync(regionHashPath, 'utf-8'));
  return { 
    title: 'Ca-PEE-tal Tracker',
    fullUrl,
    imgUrl,
    imgWidth,
    imgHeight,
    regionHash,
    stateListStr: activeRegionListStr,
    stateCount: activeRegionCount,
    capitalStr: pluralize('capital', activeRegionCount),
  };
}

module.exports = router;
