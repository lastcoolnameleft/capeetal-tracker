function getOptions(states) {
    var colors = ['#f5f5f5', '#e0b336'];
    // This is hacky, but if there's no states selected, then Google Charts will show ALL states as selected.
    if (countActiveLocations(states) == 0) {
        colors = ['#f5f5f5'];
    }
    var options = {
        region: 'US',
        displayMode: 'regions',
        resolution: 'provinces',
        enableRegionInteractivity: true,
        legend: 'none',
        colorAxis: {
            colors: colors,
        },
    };
    return options;
}

function findLocationIndex(states, value) {
    for (var i = 0; i < states.length; i++) {
        if (states[i][0].v === value) {
            return i;
        }
    }
    return -1; // Return -1 if no match is found
}

function countActiveLocations(states) {
    let count = 0;
    for (let i = 0; i < states.length; i++) {
        if (states[i][1] === 1) {
            count++;
        }
    }
    return count;
}

function toggleRegion(states, region) {
    console.log("swapping " + region);
    stateIndex = findLocationIndex(states, region);
    if (stateIndex == -1) {
        console.log("Could not find location " + region);
        return states;
    }
    if (states[stateIndex][1] == 0)
        states[stateIndex][1] = 1
    else
        states[stateIndex][1] = 0
    return states;
}

function generateData(states) {
    var data = new google.visualization.DataTable();
    data.addColumn('string', 'State');
    data.addColumn('number', 'Value');
    data.addColumn({ type: 'string', role: 'tooltip' });
    data.addRows(states);
    return data;
}

function updateView(states) {
    activeStates = countActiveLocations(states);
    totalStates = states.length;
    $('#active_states').html(activeStates);
    $('#total_states').html(totalStates);
    $('#amount').html(getAmount(activeStates, totalStates, volumes, activeStates * 8));

    // Update the URL
    const stateStr = states.filter(state => state[1] === 1).map(state => state[0].v).join(',');
    var url = window.location.origin + window.location.pathname;
    if (stateStr)
            url += '?active=' + stateStr;
    window.history.replaceState(null, null, url);
    saveLocation(stateStr);
}

function getAmount(activeStates, totalStates, volumes, amount) {
    var percent = Math.round(activeStates / totalStates * 100);
    var volKeys = Object.keys(volumes);
    var randKey = volKeys[volKeys.length * Math.random() << 0];
    var volume = Math.round(1000 * amount / volumes[randKey]) / 1000;
    return `You've peed in ${percent}% of states.  That is ~${amount} fluid ounces or ${volume} ${pluralize(randKey, volume)}.`;
}

function addVisitedLocations() {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const visitedLocationsParam = urlParams.get('active');
    if (!visitedLocationsParam) { return }
    const visitedLocations = visitedLocationsParam.split(',');
    if (!visitedLocations) { return }
    for (var locationIdx in visitedLocations) {
        var location = visitedLocations[locationIdx];
        console.log(location);
        toggleRegion(states, location);
    }
}


function initMap() {
    drawRegionsMap();
    // Create session
    localStorage.setItem('SESSION', window.crypto.randomUUID());
}

// Don't care about response.  Just save the location and session (for de-dupe)
function saveLocation(locations) {
    $.ajax({
        type: "POST",
        url: '/api/save',
        data: {
            session: localStorage.getItem('SESSION'),
            region: 'US',
            locations,
        },
      });
}

function drawRegionsMap() {
    addVisitedLocations();
    var data = generateData(states);

    var chart = new google.visualization.GeoChart(document.getElementById('regions_div'));
    chart.draw(data, getOptions(states));
    updateView(states);

    google.visualization.events.addListener(chart, 'regionClick', function (r) {
        console.log('You clicked on ' + r.region);
        states = toggleRegion(states, r.region);
        var newData = generateData(states);
        chart.draw(newData, getOptions(states));
        updateView(states);
    });
}
