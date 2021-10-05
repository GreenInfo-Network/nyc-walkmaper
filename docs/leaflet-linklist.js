/*
 * highly custom map contyrol for this one use case,
 * draw some hyperlinks in a panel (easy)
 * then allow them to have a data-blob reassigned via setLinkDataBlob() e.g. when some CSV / GeoJSON data are had
 * on clicking a link, trigger a false download of that blob data
 *
 * this used to be simple hyperlinks out to data service URLs, but Safari has a bug that it shows data instead of downloading it
 * so we need this heroic workaround
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
            newlink.innerHTML = `<span class="fa fa-download"></span> ${linkinfo.label}`;
            newlink.href = '#';

            newlink._linkid = linkinfo.id;
            newlink._blobdata = undefined;
            newlink._filename = linkinfo.filename;
            newlink._mimetype = linkinfo.mimetype;

            newlink.addEventListener('click', () => {
                this.handleLinkClick(newlink._linkid);
            });

            this._links[linkinfo.id] = newlink;
        });

        // done!
        return this._container;
    },
    setBlobData: function (linkid, blobdata) {
        const link = this._links[linkid];
        if (!link) throw new Error(`L.Control.LinkList setLinkUrl() unknown link ID: ${linkid}`);

        link._blobdata = blobdata;
    },
    handleLinkClick: function (linkid) {
        const link = this._links[linkid];
        if (!link) throw new Error(`L.Control.LinkList handleLinkClick() unknown link ID: ${linkid}`);

        // confirmed bug in FileSaver that saveAs() is ion window instead of in FileSaver
        // https://github.com/eligrey/FileSaver.js/issues/500#issuecomment-447744521
        const blob = new Blob([link._blobdata], {
            type: link._mimetype,
        });
        // FileSaver.saveAs(blob, link._filename);
        window.saveAs(blob, link._filename);
    },
});
