#!/usr/bin/env node


const {
	parse,
} = require('url')

const {
	join,
	basename,
} = require('path')

const { execSync } = require('child_process')
const { sync: mkdirpSync } = require('mkdirp')


const VERSION = '2016'

const dataDirRoot = join(__dirname, '../data/CENSUS/')

const stateCodes = {
  us: 'US',
  36: 'NY',
}

const shapefileURLs = {
  cbsa_combined: 'https://www2.census.gov/geo/tiger/TIGER2016/CSA/tl_2016_us_csa.zip',
  cbsa_metro: 'https://www2.census.gov/geo/tiger/TIGER2016/METDIV/tl_2016_us_metdiv.zip',
  cbsa_metro_micro: 'https://www2.census.gov/geo/tiger/TIGER2016/CBSA/tl_2016_us_cbsa.zip',
  cbsa_new_england: 'https://www2.census.gov/geo/tiger/TIGER2016/NECTA/tl_2016_us_necta.zip',
  cbsa_new_england_div: 'https://www2.census.gov/geo/tiger/TIGER2016/NECTADIV/tl_2016_us_nectadiv.zip',
  census_block: 'https://www2.census.gov/geo/tiger/TIGER2016/TABBLOCK/tl_2016_36_tabblock10.zip',
  census_block_group: 'https://www2.census.gov/geo/tiger/TIGER2016/BG/tl_2016_36_bg.zip',
  census_place: 'https://www2.census.gov/geo/tiger/TIGER2016/PLACE/tl_2016_36_place.zip',
  census_tract: 'https://www2.census.gov/geo/tiger/TIGER2016/TRACT/tl_2016_36_tract.zip',
  county: 'https://www2.census.gov/geo/tiger/TIGER2016/COUNTY/tl_2016_us_county.zip',
  county_subdivision: 'https://www2.census.gov/geo/tiger/TIGER2016/COUSUB/tl_2016_36_cousub.zip',
  puma: 'https://www2.census.gov/geo/tiger/TIGER2016/PUMA/tl_2016_36_puma10.zip',
  state: 'https://www2.census.gov/geo/tiger/TIGER2016/STATE/tl_2016_us_state.zip',
  urban_area: 'https://www2.census.gov/geo/tiger/TIGER2016/UAC/tl_2016_us_uac10.zip',
  zip_code: 'https://www2.census.gov/geo/tiger/TIGER2016/ZCTA5/tl_2016_us_zcta510.zip',
}

const tsvURLs = {
  county: 'http://www2.census.gov/geo/docs/maps-data/data/gazetteer/Gaz_counties_national.zip',
  census_tract: 'http://www2.census.gov/geo/docs/maps-data/data/gazetteer/Gaz_tracts_national.zip',
  county_subdivision: 'http://www2.census.gov/geo/docs/maps-data/data/gazetteer/Gaz_cousubs_national.zip',
  census_place: 'http://www2.census.gov/geo/docs/maps-data/data/gazetteer/Gaz_places_national.zip',
  puma: 'https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2010_Gaz_PUMAs_national.zip',
  urban_area: 'http://www2.census.gov/geo/docs/maps-data/data/gazetteer/Gaz_ua.zip',
  zip_code: 'http://www2.census.gov/geo/docs/maps-data/data/gazetteer/Gaz_zcta_national.zip',
}

Object.entries(shapefileURLs).forEach(([geoType, url]) => {
  const dataDir = join(dataDirRoot, 'shapefile')
  const { pathname } = parse(url)
  const filename = basename(pathname)

  const stateCode = filename.replace(new RegExp(`tl_${VERSION}_`), '').replace(/_.*/, '')
  const state = stateCodes[stateCode]

  const downloadDir = join(dataDir, geoType, VERSION, state)
  const filepath = join(downloadDir, filename)

  mkdirpSync(downloadDir)	
  console.log(`Downloading ${geoType}`)
  execSync(`curl -o '${filepath}' '${url}'`)
})

Object.entries(tsvURLs).forEach(([geoType, url]) => {
  const dataDir = join(dataDirRoot, 'tsv')
  const { pathname } = parse(url)
  const filename = basename(pathname)

  const state = stateCodes.us

  const downloadDir = join(dataDir, geoType, VERSION, state)
  const filepath = join(downloadDir, filename)

  mkdirpSync(downloadDir)	
  console.log(`Downloading ${geoType}`)
  execSync(`curl -o '${filepath}' '${url}'`)
})

