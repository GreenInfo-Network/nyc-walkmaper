// CARTO DB info
// see also https://chekpeds.carto.com/tables/walkmapper_obstructions
const CARTO_USERNAME = 'chekpeds';
const CARTO_VIZ_ID = 'a71e66b8-cb4b-4c0a-aee7-3ef79a3f4b1a';
const CARTO_VIZJSON_URL = `https://${CARTO_USERNAME}.carto.com/api/v2/viz/${CARTO_VIZ_ID}/viz.json`;
const CARTO_DB_TABLE = 'walkmapper_obstructions';

// Socrata API for 311, the URL and filters
const SOCRATA311_URL = 'https://data.cityofnewyork.us/resource/erm2-nwe9.json';
const SOCRATA311_COMPLAINTYPES = [
    'Catch Basin Complaint',
    'Building Construction Complaint',
    'Idling Vehicle',
    'Trash or Recycling Storage Complaint',
    'Dirty Sidewalk',
    'Litter Basket Complaint',
    'Bike Rack Complaint',
    'Blocked Sidewalk or Street',
    'Broken Sidewalk',
    'Bus Stop Shelter Complaint',
    'Chained Bike',
    'Curb Complaint',
    'Dead Tree',
    'Dirty Sidewalk',
    'Fallen Tree or Branch',
    'LinkNYC',
    'Littering',
    'Newspaper Box Complaint',
    'Outdoor Dining Complaint',
    'Pay Phone Complaint',
    'Pedestrian Ramp Complaint',
    'Scaffold or Sidewalk Shed Complaint',
    'Sidewalk Cellar Door Complaint',
    'Sidewalk Collapsed',
    'Sidewalk Grating Complaint',
    'Sidewalk Utility Hardware Complaint',
    'Snow or Ice on Sidewalk',
    'Streetlight Complaint',
    'Traffic or Pedestrian Signal Complaint',
    'Tree Destruction',
    'Tree Planting',
    'Tree Pruning',
    'Vendor Complaint',
    'Car Service Complaint',
    'Taxi Complaint',
    'Bike Rack Complaint',
    'City Vehicle Complaint',
];
const SOCRATA_QUERY_METERS = 250; // GDA

// the L.Map and some settings
let MAP;
const START_BBOX = [[40.580, -74.005], [40.880, -73.885]];
const MIN_ZOOM = 10;
const MAX_ZOOM = 19;

// the options for the basemap bar
const MAP_BASEMAPS = [
    {
        // Voyager only goes to 19 but has address numbers!
        type: 'xyz',
        label: 'Map',
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        attrib: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        tileLayerOptions: { maxZoom: MAX_ZOOM, },
    },
    {
        type: 'xyz',
        label: 'Photo',
        url: 'http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attrib: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        tileLayerOptions: { maxZoom: MAX_ZOOM, },
    },
];


//
// READY, GO!
//

$(document).ready(function () {
    initMap();
    initThreeOneOneMarkerLegendHack();

    setTimeout(function () {
        initLoadInitialState();
    }, 1 * 1000);
});


function initLoadInitialState () {
    const params = new URLSearchParams(window.location.search);

    const complaintid = params.get('id');
    const latlng = params.get('latlng') ? params.get('latlng').match(/^([\d\.\-]+),([\d\.\-]+)$/) : null;
    const lnglat = params.get('lnglat') ? params.get('lnglat').match(/^([\d\.\-]+),([\d\.\-]+)$/) : null;

    if (complaintid) {
        zoomToObstructionPoint(complaintid);
        loadThreeOneOneComplaintsByObstructionPoint(complaintid);
    }
    else if (latlng) {
        const lat = parseFloat(latlng[1]);
        const lng = parseFloat(latlng[2]);
        zoomToLatLng(lat, lng);
        loadThreeOneOneComplaintsByLatLng(lat, lng, SOCRATA_QUERY_METERS);
    }
    else if (lnglat) {
        const lat = parseFloat(lnglat[2]);
        const lng = parseFloat(lnglat[1]);
        zoomToLatLng(lat, lng);
        loadThreeOneOneComplaintsByLatLng(lat, lng, SOCRATA_QUERY_METERS);
    }
}


function initThreeOneOneMarkerLegendHack () {
    // CARTO's auto-generated legend doesn't have our ThreeOneOne markers, of course
    // so we need to hack the DOM to splice it in there

    const waitforit = setInterval(watchUntilInsert, 0.1 * 1000);

    function watchUntilInsert () {
        const $legend = $('#themap div.cartodb-legend.category ul');
        if (! $legend.length) return;
        clearInterval(waitforit);

        const $threeoneone = $('<li><img src="nyc311.png" style="width: 15px; height: 15px;"></div> 311 Complaint</li>');
        $threeoneone.appendTo($legend);
    }
}


function initMap () {
    // the basic Leaflet map and controls
    MAP = L.map('themap', {
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        keyboard: true,
        zoomControl: false,
    })
    .fitBounds(START_BBOX);

    MAP._container.ariaLabel = 'Map showing retailer location. Pan with arrow keys. Zoom in with + key. Zoom out with - key.';

    MAP.basemapbar = L.basemapbar({
      layers: MAP_BASEMAPS,
    })
      .addTo(MAP)
      .selectLayer(MAP_BASEMAPS[0].label);

    MAP.zoombar = L.zoombar({
      position: 'topright',
      homeBounds: START_BBOX,
      homeIconUrl: './home.svg',
    }).addTo(MAP);

    L.control
      .scale({
        position: 'bottomright',
        updateWhenIdle: true,
      })
      .addTo(MAP);

    // add the CARTO viz for the WalkMapper obstructions
    // keep a reference as MAP.obstructions
    cartodb.createLayer(MAP, CARTO_VIZJSON_URL, { https: true })
    .addTo(MAP)
    .on('done', function (layer) {
        MAP.obstructions = layer;
// GDA TODO improve the popups? hasn't been requested but seems like that's coming
    })
    .on('error', function (err) {
        console.error(`cartodb.createLayer: ${err}`);
        alert("Could not load the visualization. Please try again.");
    });

    // add a L.FeatureGroup for 311 complaint markers
    // see loadThreeOneOneComplaints*() functions
    // and stick it onto a pane so we can control stacking between this and MAP.threeoneone markers
    MAP.threeoneone = L.featureGroup([]).addTo(MAP);
}


function fetchObstructionPointAndThen (complaintid, onsuccess) {
    // tip: obstruction points "id" is its MySQL ID used by the website; known unique, preferred as the PK
    const sql = `SELECT * FROM ${CARTO_DB_TABLE} WHERE id={{ complaintid }}`
    const vars = { complaintid: complaintid };
    new cartodb.SQL({ user: CARTO_USERNAME })
    .execute(sql, vars)
    .done(function(data) {
        onsuccess(data.rows[0]);  // may be undefined if 0 match, caller should expect that        
    });
}


function zoomToLatLng (lat, lng) {
    MAP.setView([lat, lng], MAX_ZOOM);
}


function zoomToObstructionPoint (complaintid) {
    fetchObstructionPointAndThen(complaintid, function (point) {
        if (! point) return;

        // zoom to that point's latlng
        MAP.setView([point.obstructionlat, point.obstructionlong], MAX_ZOOM);

        // click it to make its infowindow
        setTimeout(function () {
            const latlng = [point.obstructionlat, point.obstructionlong];
            MAP.obstructions.trigger('featureClick', null, latlng, null, { cartodb_id: point.cartodb_id }, 0);
        }, 1 * 1000);

        // make the point stand out by making it larger,
        // but then also change our SQL to ORDER BY so this now-large marker comes at the bottom and won't obscure others
        MAP.obstructions.getSubLayer(0).setSQL(`SELECT * FROM ${CARTO_DB_TABLE} ORDER BY CASE WHEN id=${complaintid} THEN 0 ELSE 1 END`);

        let cartocss = MAP.obstructions.getSubLayer(0).getCartoCSS();
        cartocss += `
        #${CARTO_DB_TABLE}[id=${complaintid}] {
            marker-width: 30;
            marker-line-color: black;
            marker-line-width: 2;
        }
        `;
        MAP.obstructions.getSubLayer(0).setCartoCSS(cartocss);
    });
}


function loadThreeOneOneComplaintsByObstructionPoint (complaintid) {
    fetchObstructionPointAndThen(complaintid, function (point) {
        if (! point) return;
        loadThreeOneOneComplaintsByLatLng(point.obstructionlat, point.obstructionlong, SOCRATA_QUERY_METERS);
    });
}


function loadThreeOneOneComplaintsByLatLng (lat, lng, meters) {
    const sincewhen = new Date(new Date().setFullYear(new Date().getFullYear() - 2)).toISOString().substr(0, 19);
    const complaintypes = SOCRATA311_COMPLAINTYPES.map(function (word) {
        const escaped = word.replace("'", "\\'");
        return `'${escaped}'`;
    }).join(',');
    const apiurl = `${SOCRATA311_URL}?$where=complaint_type IN (${complaintypes}) AND created_date >= '${sincewhen}' AND within_circle(location, ${lat}, ${lng}, ${meters})`;

    $.getJSON(apiurl, function (threeoneonepoints) {
        threeoneonepoints.forEach(function (point) {
            const marker = makeThreeOneOneMarker(point);
            marker.addTo(MAP.threeoneone);
        });
    });
}


function makeThreeOneOneMarker (point) {
    const lat = parseFloat(point.latitude);
    const lng = parseFloat(point.longitude);
    const tooltip = `${point.complaint_type} - ${point.status}`;

    // compose a HTML template, then slot in the values
    const $html = $(`
    <table class="table table-sm table-striped mb-0">
        <thead>
            <tr>
                <th colspan="2">NYC 311 Complaint</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="fw-bold">Type</td>
                <td>
                    <span data-slot="complaint_type">-</span>
                    <br/>
                    <span data-slot="descriptor">-</span>
                </td>
            </tr>
            <tr>
                <td class="fw-bold">Status</td>
                <td><span data-slot="status">-</span></td>
            </tr>
            <tr>
                <td class="fw-bold">Resolution</td>
                <td>
                    <span data-slot="resolution_action_updated_date">-</span>
                    <br/>
                    <span data-slot="resolution_description">-</span>
                </td>
            </tr>
            <tr>
                <td class="fw-bold">Agency</td>
                <td><span data-slot="agency_name">-</span></td>
            </tr>
            <tr>
                <td class="fw-bold">Created</td>
                <td><span data-slot="created_date">-</span></td>
            </tr>
            <!--
            <tr>
                <td class="fw-bold">ID</td>
                <td><span data-slot="unique_key">-</span></td>
            </tr>
            -->
        </tbody>
    </table>
    `);

    for (const [fieldname, value] of Object.entries(point)) {
        let displayvalue = value;

        switch (fieldname) {
            case 'created_date':
            case 'resolution_action_updated_date':
                displayvalue = displayvalue.substr(0, 10);
                break;
        }

        $html.find(`span[data-slot="${fieldname}"]`).text(displayvalue);
    }

    // the icon for the ThreeOneOne Marker
    const xicon = L.icon({
        iconUrl: 'nyc311.png',
        iconSize: [19, 19],
        iconAnchor: [10, 10],
        popupAnchor: [0, 0],
    });

    // create the ThreeOneOne Marker
    const marker = L.marker([lat, lng], {
        icon: xicon,
        title: tooltip,
    })
    .bindPopup($html.get(0));

    return marker;
}
