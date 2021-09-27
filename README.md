# CHECKPEDS:NYC Walkmapper

## Project Summary (adapted from SOW)

We're going to build a simple client-side map that accepts either a latlng or an ID of a complaint from the Walkmapper system (MySQL DB), and then shows that on a map alongside 311 reports from NYC Socrata _loaded live via API call_


### GreenInfo Internal Things

**Github**: https://github.com/GreenInfo-Network/nyc-walkmaper/

**Timesheets:**  `CHEKPEDS:Walkmapper Phase 2`

[**Google Drive Folder**](https://drive.google.com/drive/folders/1r-1BhH087l6z-Tb_XRdIWlYI3kwRHdcG)

[**Statement of Work**](https://docs.google.com/spreadsheets/d/1oCblwfg2ddVrbfQ9TJFAMmPQSIvZvhh6VvCKcH9UIxQ/edit#gid=75779139)

**1Password** Walk Mapper CHEKPEDS app DB credentials



## Data and ETL

CARTO table is **walkmapper_obstructions** This table is public https://chekpeds.carto.com/tables/walkmapper_obstructions

MySQL database hosted by client, see 1Password.

ETL script https://github.com/GreenInfo-Network/nyc-crash-mapper-etl-script/tree/master/walkmapper This is run on a schedule by https://dashboard.heroku.com/apps/nyc-crash-mapper-etl/scheduler to load the data into CARTO.




## Web Development

Full front-end using CARTO APIs to read the **walkmapper_obstructions** DB table.

Hosted on Github Pages from the selfsame Github repo, using the `docs/` folder.

Plain JS/CSS/HTML with no build system.
