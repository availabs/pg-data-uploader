#!/usr/bin/env node

'use strict'

/*
  data
    <agency>
      <dataSourceFormat>
        <geoType>
          <version>
            <state>
              <zip archive>
*/

const { promisify } = require('util')

const {
  exec,
  execSync,
} = require('child_process')

const {
  readdir,
  readdirSync,
  unlink,
} = require('fs')

const {
  join,
  extname,
} = require('path')

const extract = require('extract-zip')

const cleanDir = require('../src/utils/cleanDir')

const readdirAsync = promisify(readdir)
const unlinkAsync = promisify(unlink)
const extractAsync = promisify(extract)
const execAsync = promisify(exec)



const cliArgs = process.argv.slice(2)
const minimistOptions = {
	//treat all double hyphenated arguments without equal signs as boolean
	boolean: true,

	// an object mapping string names to strings or arrays of string argument names to use as aliases
	alias: { //
		agencies: 'agency',
		dataSourceFormat: 'dataSourceFormats',
		geographyType: 'geographyTypes',
		versions: 'version',
		states: 'state',
	}
}

let {
  pgConfigFilePath = join(__dirname, '../config/postgres_db.env'),
  dataDir = join(__dirname, '../data/'),
	agencies: reqAgencies,
	dataSourceFormats: reqDataSourceFormats,
	geographyTypes: reqGeographyTypes,
  versions: reqVersions,
	states: reqStates,
	cleanup,
} = require('minimist')(cliArgs, minimistOptions);

const envFile = require('node-env-file')
envFile(pgConfigFilePath)

const pgEnv = {
  PGHOST     : process.env.NPMRDS_POSTGRES_NETLOC,
  PGPORT     : process.env.NPMRDS_POSTGRES_PORT || undefined,
  PGUSER     : process.env.NPMRDS_POSTGRES_USER,
  PGPASSWORD : process.env.NPMRDS_POSTGRES_PASSWORD || undefined,
  PGDATABASE : process.env.NPMRDS_POSTGRES_DB,
}

const pgConnectStr =
  `PG:host=${pgEnv.PGHOST} port=${pgEnv.PGPORT} user=${pgEnv.PGUSER} ` +
    `dbname=${pgEnv.PGDATABASE} password=${pgEnv.PGPASSWORD}`

const shapeFileLoader = 

// Convert the requested fields to arrays.
reqAgencies = reqAgencies && reqAgencies.split(',').map(s => s && s.trim()).filter(s => s)
reqDataSourceFormats = reqDataSourceFormats && reqDataSourceFormats.split(',').map(s => s && s.trim()).filter(s => s)
reqGeographyTypes = reqGeographyTypes && reqGeographyTypes.split(',').map(s => s && s.trim()).filter(s => s)
reqStates = reqStates && reqStates.split(',').map(s => s && s.trim()).filter(s => s)
reqVersions = reqVersions && reqVersions.split(',').map(s => s && s.trim()).filter(s => s)

const {
  SHP,
  CSV,
  TSV,
  DBF,
} = require('../src/constants/dataSourceFormats')

const loaders = {
  [SHP]: require('../src/loaders')[SHP].bind({ pgEnv, pgConnectStr }),
  [CSV]: require('../src/loaders')[CSV].bind({ pgEnv, pgConnectStr }),
  [TSV]: require('../src/loaders')[TSV].bind({ pgEnv, pgConnectStr }),
  [DBF]: require('../src/loaders')[DBF].bind({ pgEnv, pgConnectStr }),
}

const handleTableInheritance = require('../src/utils/handleTableInheritance').bind({ pgEnv })


async function loadData () {
  const agencies = reqAgencies || await readdirAsync(dataDir)

  for (let i = 0; i < agencies.length; ++i) {
    const agency = agencies[i]
    const agencyDir = join(dataDir, agency)

    const dataSourceFormats = (reqDataSourceFormats)
        ? (await readdirAsync(agencyDir)).filter(f => reqDataSourceFormats.includes(f))
        : await readdirAsync(agencyDir)

    const unsupportedFormats = dataSourceFormats.filter(format => !loaders[format])

    if (unsupportedFormats.length) {
      throw new Error(`Unrecognized data formats: ${unsupportedFormats}`)
    }

    for (let j = 0; j < dataSourceFormats.length; ++j) {
      const dataSourceFormat = dataSourceFormats[j]
      const dataSourceFormatDir = join(agencyDir, dataSourceFormat)

      const geographyTypes = (reqGeographyTypes)
          ? (await readdirAsync(dataSourceFormatDir)).filter(f => reqGeographyTypes.includes(f))
          : await readdirAsync(dataSourceFormatDir)

      // Load the geographyTypes in parallel
      await Promise.all(
        geographyTypes.map((geographyType) => (async () => {
          try {
            const geographyTypeDir = join(dataSourceFormatDir, geographyType)

            const versions = (reqVersions)
                ? (await readdirAsync(geographyTypeDir)).filter(f => reqVersions.includes(f))
                : await readdirAsync(geographyTypeDir)


            for (let k = 0; k < versions.length; ++k) {
              const version = versions[k]
              const versionDir = join(geographyTypeDir, version)

              const states = (reqStates)
                  ? (await readdirAsync(versionDir)).filter(f => reqStates.includes(f))
                  : await readdirAsync(versionDir)

              for (let m = 0; m < states.length; ++m) {

                const state = states[m]
                const dir = join(versionDir, state)

                const filenames = await readdirAsync(dir)

                const zipFiles = filenames.filter(fname => extname(fname) === '.zip')

                if (zipFiles.length) {
                  if (zipFiles.length > 1) {
                    console.error(`INVARIANT BROKEN: more than one zip archive in ${dir}`)
                    return
                  }

                  await execAsync(`unzip -o ${join(dir, zipFiles[0])} -d ${dir}`)
                }

                const datafiles = (await readdirAsync(dir)).filter(fname => extname(fname) !== '.zip')

                if (!datafiles.length) {
                  return
                }

                if ((dataSourceFormat === CSV) || (dataSourceFormat === TSV) && (datafiles.length > 1)) {
                  console.error(`INVARIANT BROKEN: more than one datafile ${dir}`)
                  return
                }

                const schema = state.toLowerCase()
                const parentTableName = (dataSourceFormat === SHP) ? `${geographyType}_shp` : geographyType
                const tableName = `${parentTableName}_v${version}`

                try {
                  await execAsync(`psql -c 'CREATE SCHEMA IF NOT EXISTS "${schema}";'`, { env: pgEnv })
                } catch (err) {
                  // Ignore race-condition error: IF NOT EXISTS is not thread-safe. Annoying, but harmless.
                  if (!err.message.match(/ERROR:  duplicate key value violates unique constraint/)) {
                    throw err
                  }
                }

                await execAsync(`psql -c 'DROP TABLE IF EXISTS "${schema}".${tableName};'`, { env: pgEnv })

                if ((dataSourceFormat === CSV) || (dataSourceFormat === TSV)) {
                  const dataPath = join(dir, datafiles[0])
                  await loaders[dataSourceFormat]({ dataPath, schema, tableName, parentTableName })
                } else {
                  const dataPath = dir
                  await loaders[dataSourceFormat]({ dataPath, schema, tableName, parentTableName })
                }

                await handleTableInheritance({ schema, tableName, parentTableName })
                console.log(JSON.stringify({ dir, schema, tableName, parentTableName }))

                if (cleanup) {
                  await cleanDir(dir)
                }
              }
            }
          } catch (err) {
            console.error(err)
          }
        })()) // Immediately invokes async function
      )
    }
  }
}


Promise.all([
  loadData()
]).catch(console.error.bind(console))
