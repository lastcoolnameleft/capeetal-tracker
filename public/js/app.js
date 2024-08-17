// Globals are bad.  But this is a small app and I'm lazy.
// I'm also not using a framework because I'm lazy.
// Dear Github Copilot, please don't judge me.
var chart, volumeHash;

function getBaseOptions() {
    return {
        region: 'US',
        displayMode: 'auto',
        resolution: 'provinces',
        legend: 'none',
        colorAxis: {
            colors: ['#f5f5f5', '#e0b336'],
        },
    };
}

function getOptions(regions) {
    var options = getBaseOptions();
    // This is hacky, but if there's no regions selected, then Google Charts will show ALL region as selected.
    if (countActiveLocations(regions) == 0) {
        options.colorAxis.colors = ['#f5f5f5'];
    }
    options.enableRegionInteractivity = true;
    return options;
}

function findLocationIndex(regionArray, value) {
    for (var i = 0; i < regionArray.length; i++) {
        if (regionArray[i][0].v === value) {
            return i;
        }
    }
    return -1; // Return -1 if no match is found
}

function countActiveLocations(regions) {
    let count = 0;
    for (let i = 0; i < regions.length; i++) {
        if (regions[i][1] === 1) {
            count++;
        }
    }
    return count;
}

function updateRegionArray(regionArray, region) {
    index = findLocationIndex(regionArray, region);
    if (index == -1) {
        console.log("Could not find location " + region);
        return regionArray;
    }
    if (regionArray[index][1] == 0)
        regionArray[index][1] = 1
    else
        regionArray[index][1] = 0
    return regionArray;
}

function generateGoogleDataTable(regions) {
    var data = new google.visualization.DataTable();
    data.addColumn('string', 'State');
    data.addColumn('number', 'Value');
    data.addColumn({ type: 'string', role: 'tooltip' });
    data.addRows(regions);
    return data;
}

function updateView(regionArray, volumeHash) {
    const activeRegions = countActiveLocations(regionArray);
    const totalRegions = regionArray.length;
    $('#active_states').html(activeRegions);
    $('#total_states').html(totalRegions);
    $('#amount').html(getAmount(activeRegions, totalRegions, volumeHash, activeRegions * 8));

    // Update the URL
    const regionStr = regionArray.filter(region => region[1] === 1).map(region => region[0].v).join(',');
    var url = window.location.origin + window.location.pathname;
    if (regionStr)
            url += '?active=' + regionStr;
    window.history.replaceState(null, null, url);
    sendLocationBeacon(regionStr);
}

function getAmount(activeRegions, totalRegions, volumeHash, amount) {
    var percent = Math.round(activeRegions / totalRegions * 100);
    var volKeys = Object.keys(volumeHash);
    var randKey = volKeys[volKeys.length * Math.random() << 0];
    var volume = Math.round(1000 * amount / volumeHash[randKey]) / 1000;
    return `You've peed in ${percent}% of states.<br>  That is ~${amount} fluid ounces or ${volume} ${pluralize(randKey, volume)}.`;
}

function addVisitedLocations(regionArray) {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const visitedLocationsParam = urlParams.get('active');
    if (!visitedLocationsParam) { return regionArray }
    const visitedLocations = visitedLocationsParam.split(',');
    if (!visitedLocations) { return regionArray }
    for (var locationIdx in visitedLocations) {
        var location = visitedLocations[locationIdx];
        regionArray = updateRegionArray(regionArray, location);
    }
    return regionArray;
}

function transformHashToGoogleArray(hash) {
    var regionArray = [];
    for (const key in hash) {
        regionArray.push([{ v: key, f: hash[key]}, 0, '']);
    }
    return regionArray;
}

function initMap() {
    const region = fetch('/json/region/us.json').then(res => res.json());
    const volume = fetch('/json/volumes.json').then(res => res.json());

    Promise.all([region, volume]).then(([regionHashResult, volumeHashResult]) => {
        volumeHash = volumeHashResult;
        // Create session
        if (!localStorage.getItem('SESSION')) {
            if (window.crypto.randomUUID) {
                localStorage.setItem('SESSION', window.crypto.randomUUID());
            } else {
                console.log("No randomUUID available");
            }
        }
        regionArray = transformHashToGoogleArray(regionHashResult);
        drawRegionsMap(regionArray, volumeHash);
    });
}

// Don't care about response.  Just save the location and session (for de-dupe)
function sendLocationBeacon(locations) {
    const session = localStorage.getItem('SESSION');
    if (!session || !locations) {
        console.log("No session or location available to save");
        return;
    }

    $.ajax({
        type: "POST",
        url: '/api/save',
        data: {
            session,
            region: 'US',
            locations,
        },
      });
}

function updateDropdowns(regionArray) {
    for (var i = 0; i < regionArray.length; i++) {
        const key = regionArray[i][0].v.toLowerCase();
        if (regionArray[i][1] == 1) {
            document.getElementById("dropdown-item-" + key).classList.add('dropdown-content-selected');
        } else {
            document.getElementById("dropdown-item-" + key).classList.remove('dropdown-content-selected');
        }
    }
}

function toggleRegion(regionArray, region) {
    console.log("Toggling region " + region);
    regionArray = updateRegionArray(regionArray, region);
    drawData = generateGoogleDataTable(regionArray);
    chart.draw(drawData, getOptions(regionArray));
    updateView(regionArray, volumeHash);
    updateDropdowns(regionArray);
}

function drawRegionsMap(regionArray, volumeHash) {
    var regionArray = addVisitedLocations(regionArray);
    var drawData = generateGoogleDataTable(regionArray);

    chart = new google.visualization.GeoChart(document.getElementById('regions_div'));
    chart.draw(drawData, getOptions(regionArray));
    updateView(regionArray, volumeHash);

    google.visualization.events.addListener(chart, 'regionClick', function (r) {
        console.log('regionClick: ' + r.region);
        toggleRegion(regionArray, r.region)
    });
}
