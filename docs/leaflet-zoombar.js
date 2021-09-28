// custom zoom bar control that includes the Zoom Home function in addition to the + and - to zoom in and out
// external dependency: this has a glyphicon class so does require Bootstrap glyphicons in order to look right
L.zoombar = function (options) {
    return new L.Control.ZoomBar(options);
};

L.Control.ZoomBar = L.Control.extend({
    options: {
        position: 'topright',
        zoomInText: '+',
        zoomInTitle: 'Zoom in',
        zoomOutText: '-',
        zoomOutTitle: 'Zoom out',
        homeIconUrl: '',
        zoomHomeTitle: 'Zoom home',
        homeBounds: null,
        homeLatLng: null,
        homeZoom: 1,
        controlid: null,  // specific to this project: things with `id` will be scrolled-to when tab-focused
    },

    initialize: function(options) {
        if (! options.homeBounds && ! options.homeLatLng ) throw "ZoomBar missing required homeBounds or homeLatLng";
        L.Util.setOptions(this, options);
    },

    onAdd: function (map) {
        var controlName = 'leaflet-control-zoom',
            container = L.DomUtil.create('div', controlName + ' leaflet-bar'),
            options = this.options;

        var zoomHomeText = '<img src="' + options.homeIconUrl + '" alt="Zoom home icon" title="Zoom home" alt="Zoome home" />';

        this._zoomInButton = this._createButton(options.zoomInText, options.zoomInTitle, controlName + '-in', container, this._zoomIn);
        this._zoomHomeButton = this._createButton(zoomHomeText, options.zoomHomeTitle, controlName + '-home', container, this._zoomHome);
        this._zoomOutButton  = this._createButton(options.zoomOutText, options.zoomOutTitle, controlName + '-out',  container, this._zoomOut);

        this._updateDisabled();
        map.on('zoomend zoomlevelschange', this._updateDisabled, this);

        return container;
    },

    onRemove: function (map) {
        map.off('zoomend zoomlevelschange', this._updateDisabled, this);
    },

    _zoomIn: function (e) {
        this._map.zoomIn(e.shiftKey ? 3 : 1);
    },

    _zoomOut: function (e) {
        this._map.zoomOut(e.shiftKey ? 3 : 1);
    },

    _zoomHome: function (e) {
        if (this.options.homeBounds) {
            this._map.fitBounds(this.options.homeBounds);
        }
        else if (this.options.homeLatLng) {
            this._map.setView(this.options.homeLatLng,this.options.homeZoom);
        }
    },

    _createButton: function (html, title, className, container, fn) {
        var link = L.DomUtil.create('a', className, container);
        link.innerHTML = html;
        link.href = '#';
        link.title = title;

        if (this.options.controlid) {
            link.id = 'zoombar-' + this.options.controlid + '-' + className;
        }

        L.DomEvent.on(link, 'click', fn, this);

        // stop click & scroll propagation
        L.DomEvent.disableScrollPropagation(link);
        L.DomEvent.disableClickPropagation(link);

        return link;
    },

    _updateDisabled: function () {
        var map = this._map,
            className = 'leaflet-disabled';

        L.DomUtil.removeClass(this._zoomInButton, className);
        L.DomUtil.removeClass(this._zoomOutButton, className);

        if (map._zoom === map.getMinZoom()) {
            L.DomUtil.addClass(this._zoomOutButton, className);
        }
        if (map._zoom === map.getMaxZoom()) {
            L.DomUtil.addClass(this._zoomInButton, className);
        }
    }
});
