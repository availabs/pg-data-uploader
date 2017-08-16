'use strict'


const {
  SHP,
  CSV,
  TSV,
  DBF,
} = require('../constants/dataSourceFormats')


module.exports = Object.freeze({
  [SHP]: require('./shapefileLoader'),
  [CSV]: require('./csvLoader'),
  [TSV]: require('./tsvLoader'),
  [DBF]: require('./dbfLoader'),
})
