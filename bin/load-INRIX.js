#!/usr/bin/env node

/*
  data
    INRIX
      2016Q2
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
  lstat,
  rename,
} = require('fs')

const {
  join,
  extname,
} = require('path')

const mkdirp = require('mkdirp')
const rimraf = require('rimraf')

const extract = require('extract-zip')


const readdirAsync = promisify(readdir)
const lstatAsync = promisify(lstat)
const renameAsync = promisify(rename)
const unlinkAsync = promisify(unlink)
const extractAsync = promisify(extract)
const execAsync = promisify(exec)
const mkdirpAsync = promisify(mkdirp)
const rimrafAsync = promisify(rimraf)


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


const inrixDataDir = join(__dirname, '../data/INRIX')
const shapefilesDir = join(inrixDataDir, 'shapefiles')

const pgfutterPath = join(__dirname, '../lib/pgfutter')

const SHP = 'shp'

const tableNameBase = 'inrix_shapefile'


async function loadShapefiles () {
  let versions = []

  try {
    const files = await readdirAsync(shapefilesDir)
    for (let i = 0; i < files.length; ++i) {
      if ((await lstatAsync(join(shapefilesDir, files[i]))).isDirectory()) {
        versions.push(files[i]) 
      }
    }
    if (!versions.length) {
      console.warn(`No version directory in ${shapefilesDir}.`)
      return
    }
  } catch (err) {
    console.error(err)
    process.exit(1)
  }

  versions.forEach(async (ver) => {
    const versionDir = join(shapefilesDir, ver)

    const states = await readdirAsync(versionDir)

    states.forEach(async (state) => {
      const stateDataDir = join(versionDir, state)
      try {

        let filenames = (await readdirAsync(stateDataDir))

        const zipFiles = filenames.filter(fname => extname(fname) === '.zip')

        if (zipFiles.length) {
          if (zipFiles.length > 1) {
            console.error(
              `INVARIANT BROKEN: more than one zip in INRIX version directory: ${stateDataDir}`
            )
            return
          }

          console.log(`extracting ${zipFiles[0]}`)
          await execAsync(`unzip -o ${join(stateDataDir, zipFiles[0])} -d ${stateDataDir}`)
        }

        const msg = `LOADED: INRIX shapefiles data for version ${ver}`
        console.time(msg)

        const dir = join(stateDataDir, state)

        await shpFileLoader({ state, dir, ver })

        console.timeEnd(msg)

        await rimrafTmpFiles(dir)
      } catch (err) {
        console.error(err)
      }
    })
  })
}


async function shpFileLoader ({ state, dir, ver }) {

  const schema = state.toLowerCase()

  try {
    await execAsync(`psql -c 'CREATE SCHEMA IF NOT EXISTS "${schema}";'`, { env: pgEnv })
  } catch (err) {
    // Race-condition error: IF NOT EXISTS is not thread-safe
    if (err.message.match(/ERROR:  duplicate key value violates unique constraint/)) {
      throw err
    }
  }

  try {
    const tableName = `${tableNameBase}_${ver.toLowerCase()}`

    await execAsync(`psql -c 'DROP TABLE IF EXISTS "${schema}".${tableName};'`, { env: pgEnv })

    const cmd =
      `ogr2ogr -f PostgreSQL "${pgConnectStr}" ${dir} -lco SCHEMA="${schema}" ` +
      `-nln ${tableName} -nlt MULTILINESTRING`

    console.log(cmd)
    console.log(`loading ${dir.replace(/^.*INRIX\//, '')} into PostgreSQL`)

    await execAsync(cmd)

    await handleTableInheritanceHierarchy({ schema, tableName })
  } catch (err) {
    console.error(err)
    throw err
  }
}


async function handleTableInheritanceHierarchy ({ schema, tableName }) {
  // Create the schema's parent table
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


async function rimrafTmpFiles (files) {
  if (!(cleanup && files)) {
    return
  }

  files = (Array.isArray(files)) ? files : [files]

  await Promise.all(
    files.map(f => {
      // console.log(`rimrafAsync(${f})`);
      return rimrafAsync(f)
    })
  )
}


// Run it

Promise.all([ 
  loadShapefiles(),
])
  .catch(console.error.bind(console))
