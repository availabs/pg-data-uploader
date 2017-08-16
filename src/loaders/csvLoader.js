'use strict'

const { CSV } = require('../constants/dataSourceFormats')

const pgfutterLoader = require('./pgfutterLoader')


function csvLoader (params) {
  return pgfutterLoader(Object.assign({}, params, { pgEnv: params.CSV || this.pgEnv, dataSourceFormat: CSV }))
}

module.exports = csvLoader

