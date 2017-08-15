#!/usr/bin/env node

/*
  data
    FHWA
      shapefiles
        geoType
          2016
            state
              .zip
*/

const { promisify } = require('util')

const {
  exec,
  execSync,
} = require('child_process')

const {
  readdir,
  unlink,
} = require('fs')

const {
  join,
  extname,
} = require('path')

const extract = require('extract-zip')


const readdirAsync = promisify(readdir)
const unlinkAsync = promisify(unlink)
const extractAsync = promisify(extract)
const execAsync = promisify(exec)

const argv = require('minimist')(process.argv.slice(2));
const { cleanup } = argv

const envFile = require('node-env-file')
envFile(join(__dirname, '../config/postgres_db.env'))

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


const shapefilesDir = join(__dirname, '../data/FHWA/shapefiles/')

const pgfutterPath = join(__dirname, '../lib/pgfutter')


const geographyTypes = [
  'mpo',
]

const SHP = 'shapefile'

const dtos = {
  [SHP]: {
    dir: shapefilesDir,
    tableNamePrefix: 'fwha_shp_',
    loader: shapeFileLoader,
  },
};


async function loadShapefiles () {
  [SHP].forEach(async dataType => {
    try {

      geographyTypes.forEach(async (geoType) => {

        const geoTypeDir = join(dtos[dataType].dir, geoType)

        let versions
        try {
          versions = await readdirAsync(geoTypeDir)
        } catch (err) {
          if (err.code === 'ENOENT') {
            console.warn(`WARNING: no ${dataType} ${geoType} directory.`)
          } else {
            console.log(err.message)
          }
          return
        }

        versions.forEach(async (yr) => {
          const versionDir = join(geoTypeDir, yr)
          const states = await readdirAsync(versionDir)

          states.forEach(async (state) => {
            const stateDataDir = join(versionDir, state)
            const filenames = (await readdirAsync(stateDataDir))

            const zipFiles = filenames.filter(fname => extname(fname) === '.zip')

            if (zipFiles.length) {
              if (zipFiles.length > 1) {
                console.error(
                  `INVARIANT BROKEN: more than one zip in shapefile subdirectory ${stateDataDir}`
                )
                return
              }

              await execAsync(`unzip -o ${join(stateDataDir, zipFiles[0])} -d ${stateDataDir}`)
            }

            const dataDir = stateDataDir
            const schema = state.toLowerCase()
            const tableNameBase = `${dtos[dataType].tableNamePrefix}${geoType}`
            const tableName = `${tableNameBase}_v${yr}`

            try {
              const msg = `LOADED: "${schema}".${tableName}`
              console.time(msg)
              await dtos[dataType].loader({ dataDir, schema, tableNameBase, tableName })
              console.timeEnd(msg)
            } catch (err) {
              console.error(err)
            }

            await deleteShapefiles({ dataDir })
          })
        })
      })
    } catch (err) {
      console.error(err)
    }
  })
}


async function shapeFileLoader (params) {

  const {
    dataDir,
    schema,
    tableNameBase,
    tableName,
  } = params

  try {
    await execAsync(`psql -c 'CREATE SCHEMA IF NOT EXISTS "${schema}";'`, { env: pgEnv })
  } catch (err) {
    // Race-condition error: IF NOT EXISTS is not thread-safe
    if (err.message.match(/ERROR:  duplicate key value violates unique constraint/)) {
      throw err
    }
  }

  await execAsync(`psql -c 'DROP TABLE IF EXISTS "${schema}".${tableName};'`, { env: pgEnv })

  const cmd = `ogr2ogr -f PostgreSQL "${pgConnectStr}" ${dataDir} -lco SCHEMA=${schema} -nln ${tableName} -nlt MULTILINESTRING`

  await execAsync(cmd)

  await handleTableInheritanceHierarchy(params)
}


async function handleTableInheritanceHierarchy (params) {

  const {
    schema,
    tableNameBase,
    tableName,
  } = params

  // Create the state's parent table
  await execAsync(
    `psql -c 'CREATE TABLE IF NOT EXISTS "${schema}".${tableNameBase} (LIKE "${schema}".${tableName});'`,
    { env: pgEnv }
  )

  // Create the root table
  await execAsync(
    `psql -c 'CREATE TABLE IF NOT EXISTS public.${tableNameBase} (LIKE "${schema}".${tableNameBase});'`,
    { env: pgEnv }
  )

  // State's subset inherits from parent.
  await execAsync(
    `psql -c 'ALTER TABLE "${schema}".${tableName} INHERIT "${schema}".${tableNameBase};'`,
    { env: pgEnv }
  )

  // State's parent inherits from root.
  try {
    await execAsync(
      `psql -c 'ALTER TABLE "${schema}".${tableNameBase} INHERIT public.${tableNameBase};'`,
      { env: pgEnv }
    )
  } catch (err) {
    if (!err.message.match(/would be inherited from more than once/)) {
      console.error(err)
    }
  }
}


async function deleteShapefiles ({ dataDir }) {

  if (!cleanup) {
    return
  }

  const files = await readdirAsync(dataDir)
  const toDelete = files.filter(f => extname(f) !== '.zip')

  await Promise.all(toDelete.map(f => unlinkAsync(join(dataDir, f))))
}

Promise.all([
  loadShapefiles()
]).catch(console.error.bind(console))
