var express = require("express");
var router = express.Router();
const jsdom = require("jsdom");
const fs = require("fs");
const stateHelper = require("./helpers/states");

var loopCount = 0;
/* GET home page. */
router.get("/:region/:states.png", function (req, res, next) {
  console.log("map route");
  var region = req.params.region;
  const statesParam = req.params.states;

  var imgPath, stateStr;
  if (!statesParam || statesParam == 'empty') {
    imgPath = process.env.MAP_CACHE_PATH + region + '/empty.png';
    stateStr = '[]';
  } else {
    var states = req.params.states.split("-");
    states = stateHelper.filterStates(states);  
    stateStr = '[\'' + states.join('\',\'') + '\']';
    imgPath = process.env.MAP_CACHE_PATH + region + '/' + states.join('-').toLocaleLowerCase() + '.png';
  }
  console.log(imgPath);

  if (fs.existsSync(imgPath)) {
    console.log("sending cache");
    res.sendFile(imgPath);
    return;
  } else {
    console.log("creating map");

  const { JSDOM } = jsdom;

  domOptions = {
    url: "https://capeetal-tracker.lastcoolnameleft.com/",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    resources: "usable",
  };

  dom = new JSDOM(`
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
  `, domOptions);
  // The script will not be executed, by default:
  }

  function waitForElement() {
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
      setTimeout(waitForElement, 100);
    } else {
      console.log("it exists now!");
      //console.log(dom.window.document.getElementById('chart_img'));
      //console.log(dom.window.document.getElementById('chart_img').src);
      const img = Buffer.from(
        dom.window.document.getElementById("chart_img").src.split(",")[1],
        "base64"
      );
      res.set("Content-Disposition", "inline");
      res.set("Accept-Ranges", "bytes");
      res.set("Cache-Control", "public, max-age=0");
      res.set("Last-Modified", "Thu, 30 May 2024 00:31:55 GMT");
      res.contentType("image/png");
      saveImage(imgPath, img)
      res.send(img);
    }
  }

  function saveImage(imgPath, img) {
    fs.writeFile(imgPath, img, (err) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log("file saved:" + imgPath);
    });
  }
  waitForElement();
});

module.exports = router;
