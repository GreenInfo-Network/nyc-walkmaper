/*
 * Bar-style basemap picker by GreenInfo Network
 */

L.linklistcontrol = function (options) {
    return new L.Control.LinkList(options);
};


L.Control.LinkList = L.Control.extend({
    options: {
        position: 'bottomleft',
        links: [],
    },
    initialize: function(options) {
        L.setOptions(this,options);

        this._map = null; // linkage to our containing L.Map instance
    },
    onAdd: function (map) {
        // add a linkage to the map
        this._map = map;

        // the container
        this._container = L.DomUtil.create('div', 'leaflet-control-linklist');
        L.DomEvent.disableScrollPropagation(this._container);
        L.DomEvent.disableClickPropagation(this._container);

        // the inner content and title bar
        this._content = L.DomUtil.create('div', '', this._container);

        // the list of links, and a registry of them by ID
        this._links = {};
        this.options.links.forEach((linkinfo) => {
            const newlink = L.DomUtil.create('a', '', this._content);
            newlink.className = 'leaflet-control-linklist-link';
            newlink.innerHTML = '<span class="fa fa-download"></span> '+linkinfo.label;
            newlink.href = linkinfo.href;
            newlink.target = '_blank';

            this._links[linkinfo.id] = newlink;
        });

        // done!
        return this._container;
    },
    setLinkUrl: function (linkid, newurl) {
        const link = this._links[linkid];
        if (!link) throw new Error(`L.Control.LinkList setLinkUrl() unknown link ID: ${linkid}`);
        link.href = newurl;
    },
});
