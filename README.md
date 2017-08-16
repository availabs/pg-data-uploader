# Metadata & Attribute Data Sources

---

## US Census

### Census Shapefiles

* [TIGER](https://www.census.gov/geo/maps-data/data/tiger-line.html)

  * [block group](https://www2.census.gov/geo/tiger/TIGER2016/BG/tl_2016_36_bg.zip)
  * [block](https://www2.census.gov/geo/tiger/TIGER2016/TABBLOCK/tl_2016_36_tabblock10.zip)
  * [county](https://www2.census.gov/geo/tiger/TIGER2016/COUNTY/tl_2016_us_county.zip)
  * [county subdivision](https://www2.census.gov/geo/tiger/TIGER2016/COUSUB/tl_2016_36_cousub.zip)
  * [place](https://www2.census.gov/geo/tiger/TIGER2016/PLACE/tl_2016_36_place.zip)
  * [puma](https://www2.census.gov/geo/tiger/TIGER2016/PUMA/tl_2016_36_puma10.zip)
  * [state](https://www2.census.gov/geo/tiger/TIGER2016/STATE/tl_2016_us_state.zip)
  * [tract](https://www2.census.gov/geo/tiger/TIGER2016/TRACT/tl_2016_36_tract.zip)
  * [urban area](https://www2.census.gov/geo/tiger/TIGER2016/UAC/tl_2016_us_uac10.zip)
  * [zip](https://www2.census.gov/geo/tiger/TIGER2016/ZCTA5/tl_2016_us_zcta510.zip)

### Census Gazetteers

* [TIGER]()

  * [county](http://www2.census.gov/geo/docs/maps-data/data/gazetteer/Gaz_counties_national.zip)
  * [cbsa\_combined](https://www2.census.gov/geo/tiger/TIGER2016/CSA/tl_2016_us_csa.zip)
  * [cbsa\_metro](https://www2.census.gov/geo/tiger/TIGER2016/METDIV/tl_2016_us_metdiv.zip)
  * [cbsa\_metro\_micro](https://www2.census.gov/geo/tiger/TIGER2016/CBSA/tl_2016_us_cbsa.zip)
  * [cbsa\_new\_england](https://www2.census.gov/geo/tiger/TIGER2016/NECTA/tl_2016_us_necta.zip)
  * [cbsa\_new\_england\_div](https://www2.census.gov/geo/tiger/TIGER2016/NECTADIV/tl_2016_us_nectadiv.zip)
  * [tract](http://www2.census.gov/geo/docs/maps-data/data/gazetteer/Gaz_tracts_national.zip)
  * [county subdivision](http://www2.census.gov/geo/docs/maps-data/data/gazetteer/Gaz_cousubs_national.zip)
  * [place](http://www2.census.gov/geo/docs/maps-data/data/gazetteer/Gaz_places_national.zip)
  * [puma](https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2010_Gaz_PUMAs_national.zip)
  * [urban area](http://www2.census.gov/geo/docs/maps-data/data/gazetteer/Gaz_ua.zip)
  * [zip](http://www2.census.gov/geo/docs/maps-data/data/gazetteer/Gaz_zcta_national.zip)

### Census American Community Survey (ACS)

* [PUMS](https://www.census.gov/programs-surveys/acs/technical-documentation/pums.html)

  * [data](https://www.census.gov/programs-surveys/acs/data/pums.html)

---

## FHWA

### FHWA Shapefiles

* [FHWA GIS](https://hepgis.fhwa.dot.gov/fhwagis/#)

  * [download form](https://hepgis.fhwa.dot.gov/fhwagis/DownloadForm.html) for

    * MPOBoundary
    * AltFuelCorridors

## NYSMPOS

The shapes were taken from the FHWA Shapefiles.

* [Map of MPOs](http://nysmpos.org/wordpress/wp-content/uploads/2012/06/Map-of-MPOs-1024x791.jpg)
* [TEA-21 Brochure](http://www.smtcmpo.org/docs/publications/NYS_MPO_brochure.pdf)

  * Used to get the abbreviations

## etc

* [State Abbreviations](https://statetable.com/)

## `data/` directory structure

### The `bin/load-*` scripts assume the following directory structure

```
data
├── Census
│   ├── gazetteers
│   │   ├── county
│   │   │   └── 2010
│   │   │       └── US
│   │   │           └── Gaz_counties_national.zip
│   │   ├── county_subdivision
│   │   │   └── 2010
│   │   │       └── US
│   │   │           └── Gaz_cousubs_national.zip
│   │   ├── place
│   │   │   └── 2016
│   │   │       └── US
│   │   │           └── Gaz_places_national.zip
│   │   ├── puma
│   │   │   └── 2010
│   │   │       └── US
│   │   │           └── 2010_Gaz_PUMAs_national.zip
│   │   ├── tract
│   │   │   └── 2010
│   │   │       └── US
│   │   │           └── Gaz_tracts_national.zip
│   │   ├── urban_area
│   │   │   └── 2010
│   │   │       └── US
│   │   │           └── Gaz_ua.zip
│   │   └── zip
│   │       └── 2010
│   │           └── US
│   │               └── Gaz_zcta_national.zip
│   └── shapefiles
│       ├── block
│       │   └── 2016
│       │       └── NY
│       │           └── tl_2016_36_tabblock10.zip
│       ├── block_group
│       │   └── 2016
│       │       └── NY
│       │           └── tl_2016_36_bg.zip
│       ├── county
│       │   └── 2016
│       │       └── US
│       │           └── tl_2016_us_county.zip
│       ├── county_subdivision
│       │   └── 2016
│       │       └── NY
│       │           └── tl_2016_36_cousub.zip
│       ├── place
│       │   └── 2016
│       │       └── NY
│       │           └── tl_2016_36_place.zip
│       ├── puma
│       │   └── 2010
│       │       └── NY
│       │           └── tl_2016_36_puma10.zip
│       ├── state
│       │   └── 2016
│       │       └── US
│       │           └── tl_2016_us_state.zip
│       ├── tract
│       │   └── 2016
│       │       └── NY
│       │           └── tl_2016_36_tract.zip
│       ├── urban_area
│       │   └── 2016
│       │       └── US
│       │           └── tl_2016_us_uac10.zip
│       └── zip
│           └── 2016
│               └── US
│                   └── tl_2016_us_zcta510.zip
├── HERE
│   ├── shapefiles
│   │   └── 2016Q2
│   │       └── US
│   │           └── NHS_NPMRDS_Shapefile_HERE_2016Q2.zip
│   └── static_files
│       └── 2016Q2
│           └── US
│               └── FHWA_Monthly_Static_File_2016Q2.csv.zip
└── INRIX
    └── shapefiles
        └── 201707
            └── NY
                └── NY.zip
```


