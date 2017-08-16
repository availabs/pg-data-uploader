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


const VERSION = '2015'
const STATE = 'US'

const dataDirRoot = join(__dirname, '../data/BTS/shapefile/')

const urls = {
  freight_analysis_framework_polygon: 'https://www.bts.gov/sites/bts.dot.gov/files/legacy/AdditionalAttachmentFiles/faf_regions.zip',
  hydrographic_features: 'https://www.bts.gov/sites/bts.dot.gov/files/legacy/AdditionalAttachmentFiles/hydro.zip',
  military_installations: 'https://www.bts.gov/sites/bts.dot.gov/files/legacy/AdditionalAttachmentFiles/milbase.zip',
  non_attainment_areas: 'https://www.bts.gov/sites/bts.dot.gov/files/legacy/AdditionalAttachmentFiles/naa_1.zip',
  airports: 'https://www.bts.gov/sites/bts.dot.gov/files/legacy/AdditionalAttachmentFiles/airports.zip',
  amtrak_stations: 'https://www.bts.gov/sites/bts.dot.gov/files/legacy/AdditionalAttachmentFiles/amtrak_sta.zip',
  intermodal_terminal_facilities: 'https://www.bts.gov/sites/bts.dot.gov/files/legacy/AdditionalAttachmentFiles/facilty_freight.zip',
  intermodal_passenger_connectivity: 'https://www.bts.gov/sites/bts.dot.gov/files/legacy/AdditionalAttachmentFiles/facility_passenger.zip',
  crash_characteristics_and_environment_conditions: 'https://www.bts.gov/sites/bts.dot.gov/files/legacy/AdditionalAttachmentFiles/fars.zip',
  bridge_inventory: 'https://www.bts.gov/sites/bts.dot.gov/files/legacy/AdditionalAttachmentFiles/nbi_1.zip',
  populated_places: 'https://www.bts.gov/sites/bts.dot.gov/files/legacy/AdditionalAttachmentFiles/place.zip',
  us_army_core_of_engineers_ports: 'https://www.bts.gov/sites/bts.dot.gov/files/legacy/AdditionalAttachmentFiles/ports.zip',
  top_150_major_ports: 'https://www.bts.gov/sites/bts.dot.gov/files/legacy/AdditionalAttachmentFiles/ports_major.zip',
  railroad_grade_crossings: 'https://www.bts.gov/sites/bts.dot.gov/files/legacy/AdditionalAttachmentFiles/rr_crossings.zip',
}


Object.entries(urls).forEach(([geoType, url]) => {
  const downloadDir = join(dataDirRoot, geoType, VERSION, STATE)
  const { pathname } = parse(url)

  const filename = basename(pathname)
  const filepath = join(downloadDir, filename)

  mkdirpSync(downloadDir)	
  console.log(`Downloading ${geoType}`)
  execSync(`curl -o '${filepath}' '${url}'`)
})

