# CHECKPEDS:NYC Walkmapper

A simple client-side map that accepts either a latlng or an ID of a complaint from the Walkmapper system (MySQL DB), and then shows that on a map alongside 311 reports from NYC Socrata loaded live via API call.


### GreenInfo Internal Things

**Github**: https://github.com/GreenInfo-Network/nyc-walkmaper/

**Timesheets:**  `CHEKPEDS:Walkmapper Phase 2`

[**Google Drive Folder**](https://drive.google.com/drive/folders/1r-1BhH087l6z-Tb_XRdIWlYI3kwRHdcG)

[**Statement of Work**](https://docs.google.com/spreadsheets/d/1oCblwfg2ddVrbfQ9TJFAMmPQSIvZvhh6VvCKcH9UIxQ/edit#gid=75779139)

**1Password** Walk Mapper CHEKPEDS app DB credentials


## Hosting and Website

Hosted on Github Pages. Accepts URL params to focus a specific point.

* https://greeninfo-network.github.io/nyc-walkmapper/
* https://greeninfo-network.github.io/nyc-walkmapper/?id=790
* https://greeninfo-network.github.io/nyc-walkmapper/?latlng=40.757012,-73.991635
* https://greeninfo-network.github.io/nyc-walkmapper/?lnglat=-73.991635,40.757012
* https://greeninfo-network.github.io/nyc-walkmapper/iframe-examples.html

Their main website at http://walkmapper-admin.chekpeds.com/ will embed iframes which use these params.



## Data and ETL

CARTO table of obstruction points is **walkmapper_obstructions** This table is public https://chekpeds.carto.com/tables/walkmapper_obstructions

That table is loaded from a MySQL database hosted by client (see 1Password) using a ETL script at https://github.com/GreenInfo-Network/nyc-crash-mapper-etl-script/tree/master/walkmapper This is run on a schedule by https://dashboard.heroku.com/apps/nyc-crash-mapper-etl/scheduler to load the data into CARTO.



## Web Development

Front-end only. Hosted on Github Pages from the selfsame Github repo, using the `docs/` folder.

All files are in the `docs/` folder. Plain JS/CSS/HTML with no build system.

Uses CARTO APIs to read the **walkmapper_obstructions** DB table.

Development instructions:
* Go into the `docs/` subfolder which contains the web files.
* Run a local HTTP server with Python: `python3 -m http.server 6745`
* Visit the site at http://localhost:6745/
* Make edits to **index.html** et al.
