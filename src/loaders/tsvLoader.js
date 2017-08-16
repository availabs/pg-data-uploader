'use strict'

const { TSV } = require('../constants/dataSourceFormats')

const pgfutterLoader = require('./pgfutterLoader')


function tsvLoader (params) {
  return pgfutterLoader(Object.assign({}, params, { pgEnv: params.TSV || this.pgEnv, dataSourceFormat: TSV }))
}

module.exports = tsvLoader

