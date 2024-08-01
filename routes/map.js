var express = require("express");
var router = express.Router();
const jsdom = require("jsdom");
const fs = require("fs");
var Jimp = require("jimp");
const stateHelper = require("./helpers/states");

var loopCount = 0;
const backgroundImgPath = '/Users/thfalgou/git/lastcoolnameleft/capeetal-tracker/public/images/share/capeetal_lookatmemap.png';

/* GET home page. */
router.get("/:region/:states.png", function (req, res, next) {
  console.log("map route");
  var region = req.params.region;
  const statesParam = req.params.states;
  sendImageBuffer(region, statesParam, res);
});

// We want to store 2 different files.  The background image and the generated map
// We overlay the generated map on top of the background image and then save each file separately
// That way if we update the background image, we don't need to re-generate that (which takes about 1-2 sec and makes sharing seem slow)
// NOTE:  It takes about 4.2 seconds to generate the image from scratch.  3 sec to perform the overlay
function sendImageBuffer(region, statesParam, res) {
  const gchartBasePath = process.env.MAP_CACHE_PATH + 'gchart/' + region;
  const overlayBasePath = process.env.MAP_CACHE_PATH + 'overlay/' + region;
  const emptyStatePath = process.env.MAP_CACHE_PATH + 'empty.png';

  // We send back a different file if there's no states
  if (!statesParam || statesParam == 'empty') {
    returnMapFile(res, emptyStatePath);
    return;
  }

  var states = statesParam.split("-");
  states = stateHelper.filterStates(states);
  var stateStr = '[\'' + states.join('\',\'') + '\']';
  overlayImgPath = overlayBasePath + '/' + states.join('-').toLocaleLowerCase() + '.png';
  gchartImgPath = gchartBasePath + '/' + states.join('-').toLocaleLowerCase() + '.png';

  // Send the overlay image if it exists
  if (fs.existsSync(overlayImgPath)) {
    console.log(`sending overlay cache for ${overlayImgPath}`);
    returnMapFile(res, overlayImgPath);
  } 
  // If the overlay doesn't exist, but the gchart does, we need to generate the overlay
  else if (fs.existsSync(gchartImgPath)) { 
    console.log(`overlay cache doesn't exist, but gchart does: ${gchartImgPath}`);
    imageOverlay(gchartImgPath).then((imgOverlayBuffer) => {
      console.log(`Saving overlay image at ${overlayImgPath}`);
      fs.writeFile(overlayImgPath, imgOverlayBuffer, (err) => {
        if (err) {
          console.error(err);
          return;
        }
        returnMapFile(res, overlayImgPath);
      });
    })
  } 
  // If neither the overlay or gchart exists, we need to generate both
  else {
    console.log("no cache exists.  Starting from scratch");
    const domObj = getDOMObj(stateStr);
    waitForElement(domObj, res, gchartImgPath, overlayImgPath);
  }
}


function returnMapFile(res, imgPath) {
    console.log(`sending ${imgPath}`);
    res.sendFile(imgPath);
    return;
}

function waitForElement(dom, res, gchartImgPath, overlayImgPath) {
  loopCount++;
  console.log("loop");
  //console.log(dom.window.document.getElementById('chart_img'));
  //console.log(dom.window.document.getElementById('chart_img').src);
  if (
    dom.window.document.getElementById("chart_img") === null ||
    dom.window.document.getElementById("chart_img").src === null
  ) {
    //console.log('waiting!');
    if (loopCount > 50) {
      console.log("timeout");
      res.send("timeout");
      return;
    }
    setTimeout(waitForElement.bind(null, dom, res, gchartImgPath, overlayImgPath), 100);
  } else {
    console.log("it exists now!");
    //console.log(dom.window.document.getElementById('chart_img'));
    //console.log(dom.window.document.getElementById('chart_img').src);
    const gchartImgBuffer = Buffer.from(
      dom.window.document.getElementById("chart_img").src.split(",")[1],
      "base64"
    );

    // Change this to write gchart cache
    fs.writeFile(gchartImgPath, gchartImgBuffer, (err) => {
      console.log(`Saving gchart at ${gchartImgPath}`);
      if (err) {
        console.error(err);
        return;
      }
    });
    
    imageOverlay(gchartImgBuffer).then((imgOverlayBuffer) => {
      console.log(`Saving overlay image at ${overlayImgPath}`);
      fs.writeFile(overlayImgPath, imgOverlayBuffer, (err) => {
        if (err) {
          console.error(err);
          return;
        }
        returnMapFile(res, overlayImgPath);
      });
    })
  }
}

async function imageOverlay(imageOverlayFile) { // Function name is same as of file
  // Reading watermark Image
  let watermark = await Jimp.read(imageOverlayFile);
  watermark = watermark.resize(4700, 3125); // Resizing watermark image
  // Reading original image
  const image = await Jimp.read(backgroundImgPath);
  watermark = await watermark
  image.composite(watermark, 250, 1500, {
    mode: Jimp.BLEND_SOURCE_OVER,
    opacityDest: 1,
    opacitySource: 1
  })
  //await image.writeAsync('/Users/thfalgou/git/lastcoolnameleft/capeetal-tracker/tmp/overlay.png');
  return await image.getBufferAsync(Jimp.MIME_PNG);
  //   await image.writeAsync('/Users/thfalgou/git/lastcoolnameleft/capeetal-tracker/data/map/us/ne.png');
}

function getDOMObj(stateStr) {
  const { JSDOM } = jsdom;

  const domOptions = {
    url: "https://capeetal-tracker.lastcoolnameleft.com/",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    resources: "usable",
  };


  const domStr = `
<html>
    <head>
      <script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
      <script type="text/javascript">
        google.charts.load('current', {
          'packages':['geochart'],
          'mapsApiKey': 'AIzaSyCARIrIRh4GT-7tD7dVTmB2_nK3DzvNMuk'
        });
        google.charts.setOnLoadCallback(drawRegionsMap);
  
        var chart;
        function drawRegionsMap() {
          var states = ${stateStr};
          var stateData = states.map((x) => ['US-' + x, 1])
          stateData.unshift(['State', 'Peed']);
          var data = google.visualization.arrayToDataTable(stateData);
  
          var options = {
            region: 'US',
            displayMode: 'regions',
            resolution: 'provinces',
            enableRegionInteractivity: true,
            legend: 'none',
            colorAxis: {
                colors: ['#f5f5f5', '#e0b336'],
            },
        };  
          var chart_div = document.getElementById('chart_div')
          chart = new google.visualization.GeoChart(chart_div);
  
          google.visualization.events.addListener(chart, 'ready', function () {
          chart_div.innerHTML = '<img id="chart_img" src="' + chart.getImageURI() + '">';
          //console.log(chart_div.innerHTML);
        })
  
          chart.draw(data, options);
        }
      </script>
    </head>
    <body>
      <div id="chart_div" style="width: 900px; height: 500px;"></div>
    </body>
  </html>
  `;
  
  const dom = new JSDOM(domStr, domOptions);
  return dom;
}

module.exports = router;
