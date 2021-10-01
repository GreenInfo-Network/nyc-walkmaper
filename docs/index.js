// CARTO DB info
// see also https://chekpeds.carto.com/tables/walkmapper_obstructions
const CARTO_USERNAME = 'chekpeds';
const CARTO_OBSTRUCTIONS_TABLE = 'walkmapper_obstructions';
const CARTO_SQL_URL = `https://${CARTO_USERNAME}.carto.com/api/v2/sql`;
const CARTO_QUERY_METERS = 15;
const OBSTRUCTION_IMAGE_BASEURL = 'http://walkmapper.sunnysiderecords.com/uploads/';
const OBSTRUCTION_IMAGE_THUMB_SIZE = 85;

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
const SOCRATA311_QUERY_METERS = 15;

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
        tileLayerOptions: {
            maxZoom: MAX_ZOOM,
            attribution: 'Base map &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        },
    },
    {
        type: 'xyz',
        label: 'Photo',
        url: 'http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        tileLayerOptions: {
            maxZoom: MAX_ZOOM,
            attribution: 'Base map &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        },
    },
];


//
// READY, GO!
//

$(document).ready(function () {
    initMap();
    initLoadUrlParamsAndStart();
});


function initLoadUrlParamsAndStart () {
    const params = new URLSearchParams(window.location.search);

    const obstructionid = params.get('id');
    const latlng = params.get('latlng') ? params.get('latlng').match(/^([\d\.\-]+),([\d\.\-]+)$/) : null;
    const lnglat = params.get('lnglat') ? params.get('lnglat').match(/^([\d\.\-]+),([\d\.\-]+)$/) : null;

    if (latlng) {
        const lat = parseFloat(latlng[1]);
        const lng = parseFloat(latlng[2]);
        initGetStarted(lat, lng, undefined);
    }
    else if (lnglat) {
        const lat = parseFloat(lnglat[2]);
        const lng = parseFloat(lnglat[1]);
        initGetStarted(lat, lng, undefined);
    }
    else if (obstructionid) {
        const sql = `SELECT ST_X(the_geom) AS lng, ST_Y(the_geom) AS lat FROM ${CARTO_OBSTRUCTIONS_TABLE} WHERE id=${obstructionid}`;
        const params = {
            q: sql,
        };

        $.getJSON(CARTO_SQL_URL, params, function (data) {
            const point = data.rows[0];
            if (point) initGetStarted(point.lat, point.lng, obstructionid);
        });
    }
}


function initGetStarted (lat, lng, obstructionid) {
    // the real startup, now that we have a lat,lng to get started

    // reset the zoom-home control to this latlng & max-zoom
    // then zoom there
    MAP.zoombar.options.homeBounds = null;
    MAP.zoombar.options.homeLatLng = [lat, lng];
    MAP.zoombar.options.homeZoom = MAX_ZOOM;
    MAP.zoombar._zoomHome();

    // lay down a simple marker at the given latlng
    L.marker([lat, lng], {
        title: 'Selected location',
        zIndexOffset: 10000,  // very high on the stack, always on top
    }).addTo(MAP);

    // fetch & draw the 311 complaints nearby
    loadThreeOneOneComplaintsByLatLng(lat, lng, SOCRATA311_QUERY_METERS);

    // fetch & draw the obstruction points nearby
    loadObstructionPointsByLatLng(lat, lng, CARTO_QUERY_METERS, obstructionid);
}


function initMap () {
    // the basic Leaflet map and controls
    MAP = L.map('themap', {
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        keyboard: true,
        zoomControl: false,
        attributionControl: false,
    })
    .fitBounds(START_BBOX);

    MAP._container.ariaLabel = 'Map showing retailer location. Pan with arrow keys. Zoom in with + key. Zoom out with - key.';

    MAP.attribution = L.control.attribution().addTo(MAP);
    MAP.attribution.setPrefix('');
    MAP.attribution.addAttribution('Powered by <a href="https://leafletjs.com/">Leaflet</a> and <a href="https://carto.com/">CARTO</a>');
    MAP.attribution.addAttribution('311 Data from <a href="https://portal.311.nyc.gov/">NYC311</a>');

    MAP.basemapbar = L.basemapbar({
      layers: MAP_BASEMAPS,
    }).addTo(MAP).selectLayer(MAP_BASEMAPS[0].label);

    MAP.zoombar = L.zoombar({
      position: 'topright',
      homeBounds: START_BBOX,
      homeIconUrl: './home.svg',
    }).addTo(MAP);

    L.control.scale({
        position: 'bottomleft',
        updateWhenIdle: true,
    }).addTo(MAP);

    L.ginfocredits({
        image: './greeninfo.png',
        link: 'http://www.greeninfo.org/',
        text: 'Interactive mapping<br/>by GreenInfo Network',
        position: 'bottomright',
    }).addTo(MAP);

    // a simple static legend
    L.staticlegendcontrol({
        position: 'bottomleft',
        htmlcontent: `
        <div>
            <ul style="list-style-type: none; padding-left: 0; margin: 0;">
                <li><div style="display: inline-block; vertical-align: text-top; width: 15px; height: 15px; border-radius: 50%; background: #b81609;"></div> Crossing</li>
            	<li><div style="display: inline-block; vertical-align: text-top; vertical-align: text-top; width: 15px; height: 15px; border-radius: 50%; background: #7b00b4;"></div> Curb</li>
                <li><div style="display: inline-block; vertical-align: text-top; width: 15px; height: 15px; border-radius: 50%; background: #136400;"></div> Sidewalk</li>
                <li><img src="nyc311.png" style="vertical-align: text-top; width: 15px; height: 15px;"> 311 Complaint</li>
            </ul>
        </div>
        `,
    }).addTo(MAP);

    // L.FeatureGroup for the obstruction markers and the 311 complaint markers
    MAP.markers = L.featureGroup([]).addTo(MAP);
}


function loadThreeOneOneComplaintsByLatLng (lat, lng, meters) {
    const url = SOCRATA311_URL;

    const sincewhen = new Date(new Date().setFullYear(new Date().getFullYear() - 2)).toISOString().substr(0, 19);
    const complaintypes = SOCRATA311_COMPLAINTYPES.map(function (word) {
        const escaped = word.replace("'", "\\'");
        return `'${escaped}'`;
    }).join(',');
    const whereclause = `complaint_type IN (${complaintypes}) AND created_date >= '${sincewhen}' AND within_circle(location, ${lat}, ${lng}, ${meters})`;

    const params = {
        $where: whereclause,
    };

    $.getJSON(url, params, function (threeoneonepoints) {
        threeoneonepoints.forEach(function (point) {
            const marker = makeThreeOneOneMarker(point);
            marker.addTo(MAP.markers);
        });
    });
}


function loadObstructionPointsByLatLng (lat, lng, meters, obstructionid) {
    // fetch the nearby points from CARTO as a GeoJSON document
    // we don't use cartodb.js cuz that includes their bundled Leaflet 0.7 and we only need a couple of simple SELECT queries
    const sql = `
    SELECT *, ST_X(the_geom) AS lng, ST_Y(the_geom) AS lat
    FROM ${CARTO_OBSTRUCTIONS_TABLE}
    WHERE ST_DWITHIN(ST_SETSRID(ST_MAKEPOINT(${lng}, ${lat}), 4326)::geography, the_geom::geography, ${meters})
    `;
    const params = {
        q: sql,
        format: 'GeoJSON',
    };

    $.getJSON(CARTO_SQL_URL, params, function (gjdoc) {
        // this adds a whole L.geoJSON featuregroup to MAP.markers, not individual markers
        // for now this is okay since we have no need to refer back to markers, reload them, ...
        const newmarkers = L.geoJSON(gjdoc, {
            pointToLayer: function (point, latlng) {
                const isfocused = obstructionid && obstructionid == point.properties.id;
                const marker = makeObstructionMarker(point, latlng, isfocused);
                return marker;
            },
        });

        newmarkers.addTo(MAP.markers);
    });
}


function makeObstructionMarker (point, latlng, isfocused) {
    // compose the icon, which depends on whether we're focusing a specific obstruction
    const iconsize = isfocused ? [39, 39] : [19, 19];
    const zindex = isfocused ? -100 : 0;
    let classnames = ['obstruction-marker-icon', `obstruction-marker-icon-${point.properties.topcategory.toLowerCase().replace(/\W/, '')}`, ];
    if (isfocused) classnames.push('obstruction-marker-icon-focused');

    const circle = L.divIcon({
        className: classnames.join(' '),
        iconSize: iconsize,
    });

   // for the popup/infowindow, compose a HTML template, then slot in the values
    const $html = $(`
    <table class="table table-sm table-striped mb-0">
        <thead>
            <tr>
                <th colspan="2">WalkMapper Obstruction</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="fw-bold">Type</td>
                <td>
                    <span data-slot="topcategory">-</span>
                    <br/>
                    <span data-slot="subcategory">-</span>
                </td>
            </tr>
            <tr>
                <td class="fw-bold">Location</td>
                <td>
                    <span data-slot="address">-</span>
                    <br/>
                    <span data-slot="locationdetail">-</span>
                </td>
            </tr>
            <tr>
                <td class="fw-bold">Reported</td>
                <td><span data-slot="isfirsttime">-</span></td>
            </tr>
            <tr>
                <td class="fw-bold">Completed</td>
                <td><span data-slot="completeddate">-</span></td>
            </tr>
            <tr>
                <td class="fw-bold">Photos</td>
                <td>
                    <span data-slot="image1">-</span>
                    <span data-slot="image2">-</span>
                    <span data-slot="image3">-</span>
                    <span data-slot="image4">-</span>
                    <span data-slot="image5">-</span>
                </td>
            </tr>
         </tbody>
    </table>
    `);

    for (const [fieldname, value] of Object.entries(point.properties)) {
        let displayvalue = value;

        switch (fieldname) {
            case 'createdat':
            case 'completeddate':
                displayvalue = displayvalue ? displayvalue.substr(0, 10) : '-';
                $html.find(`span[data-slot="${fieldname}"]`).text(displayvalue);
                break;
            case 'isfirsttime':
                if (point.properties.isthirdtime && point.properties.thirdtimesenddate) {
                    displayvalue = [
                        '3+ times',
                        point.properties.createdat.substr(0, 10),
                        point.properties.secondtimesenddate.substr(0, 10),
                        point.properties.thirdtimesenddate.substr(0, 10),
                    ].join('<br/>');
                }
                else if (point.properties.issecondtime && point.properties.secondtimesenddate) {
                    displayvalue = [
                        '2 times',
                        point.properties.createdat.substr(0, 10),
                        point.properties.secondtimesenddate.substr(0, 10),
                    ].join('<br/>');
                }
                else if (point.properties.isfirsttime) {
                    displayvalue = [
                        '1 time',
                        point.properties.createdat.substr(0, 10),
                    ].join('<br/>');
                }

                $html.find(`span[data-slot="${fieldname}"]`).html(displayvalue);
                break;
            case 'image1':
            case 'image2':
            case 'image3':
            case 'image4':
            case 'image5':
                if (value) {
                    const url = `${OBSTRUCTION_IMAGE_BASEURL}/${value}`;
                    displayvalue = `<a href="${url}" target="_blank" rel="nofollow noopener noreferrer"><img src="${url}" style="width: ${OBSTRUCTION_IMAGE_THUMB_SIZE}px; max-height: ${OBSTRUCTION_IMAGE_THUMB_SIZE}px;" /></a>`;
                }

                $html.find(`span[data-slot="${fieldname}"]`).html(displayvalue);
                break;
            default:
                $html.find(`span[data-slot="${fieldname}"]`).text(displayvalue);
                break;
        }
    }

    // create and return the obstruction marker
    const tooltip = `${point.properties.topcategory} - ${point.properties.locationdetail}`;
    const marker = L.marker(latlng, {
        icon: circle,
        zIndexOffset: zindex,
    })
    .bindTooltip(tooltip)
    .bindPopup($html.get(0));

    return marker;
}


function makeThreeOneOneMarker (point) {
    // for the popup/infowindow, compose a HTML template, then slot in the values
    const $html = $(`
    <table class="table table-sm table-striped mb-0">
        <thead>
            <tr>
                <th colspan="2">NYC311 Complaint</th>
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
                displayvalue = displayvalue ? displayvalue.substr(0, 10) : '-';
                break;
        }

        $html.find(`span[data-slot="${fieldname}"]`).text(displayvalue);
    }

    // the icon for the ThreeOneOne marker
    const xicon = L.icon({
        iconUrl: 'nyc311.png',
        iconSize: [19, 19],
    });

    // create and return the ThreeOneOne marker
    const lat = parseFloat(point.latitude);
    const lng = parseFloat(point.longitude);
    const tooltip = `${point.complaint_type} - ${point.status}`;
    const marker = L.marker([lat, lng], {
        icon: xicon,
        zIndexOffset: 1000,
    })
    .bindTooltip(tooltip)
    .bindPopup($html.get(0));

    return marker;
}
