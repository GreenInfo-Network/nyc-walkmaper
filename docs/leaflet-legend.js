/*
 * Bar-style basemap picker by GreenInfo Network
 */

L.staticlegendcontrol = function (options) {
    return new L.Control.StaticLegend(options);
};


L.Control.StaticLegend = L.Control.extend({
    options: {
        position: 'bottomleft',
        htmlcontent: 'Legend',
    },
    initialize: function(options) {
        L.setOptions(this,options);

        this._map = null; // linkage to our containing L.Map instance
    },
    onAdd: function (map) {
        // add a linkage to the map
        this._map = map;

        // the container and its simple static HTML
        this._container = L.DomUtil.create('div', 'leaflet-control-legend');
        this._container.innerHTML = this.options.htmlcontent;

        // stop click & scroll propagation; Leaflet 1.0
        L.DomEvent.disableScrollPropagation(this._container);
        L.DomEvent.disableClickPropagation(this._container);

        // done!
        return this._container;
    },
});
