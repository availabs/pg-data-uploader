'use strict'


const { promisify } = require('util')

const { exec } = require('child_process')

const { join } = require('path')


const execAsync = promisify(exec)

const {
  CSV,
  TSV,
} = require('../constants/dataSourceFormats')

const pgfutterPath = join(__dirname, '../../lib/pgfutter')


async function pgfutterLoader ({ pgEnv, dataPath, schema, tableName, dataSourceFormat = CSV }) {

  const delimiterArg = (dataSourceFormat === TSV)
    ? " -d '\t'"
    : ''

  const cmd = `
    ${pgfutterPath} \
      --dbname ${pgEnv.PGDATABASE} \
      --table ${tableName} \
      --host ${pgEnv.PGHOST} \
      --port ${pgEnv.PGPORT} \
      --schema ${schema} \
      --username ${pgEnv.PGUSER} \
      --pass ${pgEnv.PGPASSWORD} \
      csv ${delimiterArg} '${dataPath}'
  `

  const output = await execAsync(cmd)

  if (output.stderr) {
    throw new Error(output.stderr)
  }
}


module.exports = pgfutterLoader

