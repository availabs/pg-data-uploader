#!/usr/bin/env node

/*
  data
    HERE
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


const hereDataDir = join(__dirname, '../data/HERE')
const shapefilesDir = join(hereDataDir, 'shapefiles')
const staticFilesDir = join(hereDataDir, 'static_files')

const pgfutterPath = join(__dirname, '../lib/pgfutter')


const SHP = 'shp'
const LUT = 'lut'
const STATIC = 'static'

const dtos = {
  [SHP]: {
    filePattern: /_shapefile_/i,
    dir: SHP,
    tableNameBase: 'here_shapefile',
    loader: shpFileLoader,
  },

  [LUT]: {
    filePattern: /_tmc_lut_/i,
    dir: LUT,
    tableNameBase: 'here_tmc_lut',
    loader: shpFileLoader, // no actual shape, but need to use ogr2ogr since it's a .dbf file.
  },

  [STATIC]: {
    filePattern: /_static_file_/i,
    dir: STATIC,
    tableNameBase: 'here_static_file',
    loader: loadStaticFile,
  },
};


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
    try {
      const versionDir = join(shapefilesDir, ver)

      let filenames = (await readdirAsync(versionDir))

      const zipFiles = filenames.filter(fname => extname(fname) === '.zip')

      if (zipFiles.length) {
        if (zipFiles.length > 1) {
          console.error(`INVARIANT BROKEN: more than one zip in HERE version directory: ${versionDir}`)
          return
        }

        await execAsync(`unzip -o ${join(versionDir, zipFiles[0])} -d ${versionDir}`)
      }

      // After extracting the ZIP archive, read the dir again
      filenames = (await readdirAsync(versionDir))

      const dirs = {
        [SHP]: join(versionDir, dtos[SHP].dir),
        [LUT]: join(versionDir, dtos[LUT].dir),
      }

      // Make the tmp subdirs
      await Promise.all(Object.values(dirs).map(d => mkdirpAsync(d)))

      // Move all the datafiles into their respective tmp directories.
      // This make using ogr2ogr easier.
      await Promise.all(
        filenames.map(async f => {
          if ((await lstatAsync(join(versionDir, f))).isDirectory()) {
            return
          }

          if (extname(f) === '.zip') {
            return
          }

          let dataType = Object.keys(dtos).find(dt => f.match(dtos[dt].filePattern))

          if (dataType) {
            return renameAsync(join(versionDir, f), join(versionDir, dtos[dataType].dir, f))
          }

          return
        })
      )
      
      const msg = `LOADED: HERE shapefiles data for version ${ver}`
      console.time(msg)

      await Promise.all([SHP, LUT].map(dataType => {
        const dir = dirs[dataType]
        return dtos[dataType].loader({ dataType, dir, ver })
      }))

      console.timeEnd(msg)

      await rimrafTmpFiles(Object.values(dirs))
    } catch (err) {
      console.error(err)
    }
  })
}


async function loadStaticFile () {
  let versions = []

  try {
    const files = await readdirAsync(staticFilesDir)
    for (let i = 0; i < files.length; ++i) {
      if ((await lstatAsync(join(staticFilesDir, files[i]))).isDirectory()) {
        versions.push(files[i]) 
      }
    }

    if (!versions.length) {
      console.warn(`No version directory in ${staticFilesDir}.`)
      return
    }
  } catch (err) {
    console.error(err)
    process.exit(1)
  }

  versions.forEach(async (ver) => {
    try {
      const versionDir = join(staticFilesDir, ver)

      let filenames = await readdirAsync(versionDir)

      const zipFiles = filenames.filter(fname => extname(fname) === '.zip')


      if (zipFiles.length) {
        if (zipFiles.length > 1) {
          console.error(`INVARIANT BROKEN: more than one zip in HERE version directory: ${versionDir}`)
          return
        }

        await execAsync(`unzip -o ${join(versionDir, zipFiles[0])} -d ${versionDir}`)
      }

      // After extracting the ZIP archive, read the dir again
      filenames = (await readdirAsync(versionDir)).filter(fname => extname(fname) !== '.zip')

      if (filenames.length === 0) {
        console.error(`No datafile in ${versionDir}`)
        return
      } else if (filenames.length > 1) {
        console.error(`INVARIANT BROKEN: more than one data file in: ${versionDir}`)
        return
      }

      const staticFilePath = join(versionDir, filenames[0])
      
      const msg = `LOADED: HERE static_file data for version ${ver}`
      console.time(msg)

      await staticFileLoader({ staticFilePath, ver })

      console.timeEnd(msg)

      await rimrafTmpFiles(staticFilePath)
    } catch (err) {
      console.error(err)
    }
  })
}


async function shpFileLoader ({ dataType, dir, ver }) {
  try {
    await execAsync(`psql -c 'CREATE SCHEMA IF NOT EXISTS us;'`, { env: pgEnv })
  } catch (err) {
    // Race-condition error: IF NOT EXISTS is not thread-safe
    if (err.message.match(/ERROR:  duplicate key value violates unique constraint/)) {
      throw err
    }
  }

  const tableName = `${dtos[dataType].tableNameBase}_${ver.toLowerCase()}`

  await execAsync(`psql -c 'DROP TABLE IF EXISTS us.${tableName};'`, { env: pgEnv })

  const cmd =
    `ogr2ogr -f PostgreSQL "${pgConnectStr}" ${dir} -lco SCHEMA=us ` +
    `-nln ${tableName} ${ (dataType === SHP) ? '-nlt MULTILINESTRING' : ''}`

  console.log(`loading ${dir.replace(/^.*HERE\//, '')} into PostgreSQL`)
  await execAsync(cmd)

  await handleTableInheritanceHierarchy({ tableName, tableNameBase: dtos[dataType].tableNameBase })
}


async function staticFileLoader ({ staticFilePath, ver }) {

  const tableNameBase = dtos[STATIC].tableNameBase
  const tableName = `${tableNameBase}_${ver}`

  await execAsync(`psql -c 'CREATE SCHEMA IF NOT EXISTS us;'`, { env: pgEnv })
  await execAsync(`psql -c 'DROP TABLE IF EXISTS us.${tableName};'`, { env: pgEnv })

  const cmd = `
    ${pgfutterPath} \
      --dbname ${pgEnv.PGDATABASE} \
      --table ${tableName} \
      --host ${pgEnv.PGHOST} \
      --port ${pgEnv.PGPORT} \
      --schema us \
      --username ${pgEnv.PGUSER} \
      --pass ${pgEnv.PGPASSWORD} \
      csv '${staticFilePath}'
  `

  try {
    console.log(`loading ${staticFilePath.replace(/^.*HERE\//, '')} into PostgreSQL`)
    await execAsync(cmd)
  } catch (err) {
    console.error(err)
    return
  }

  await handleTableInheritanceHierarchy({ tableName, tableNameBase })
}


async function handleTableInheritanceHierarchy ({ tableName, tableNameBase }) {
  // Create the state's parent table
  await execAsync(
    `psql -c 'CREATE TABLE IF NOT EXISTS us.${tableNameBase} (LIKE us.${tableName});'`,
    { env: pgEnv }
  )

  // Create the root table
  await execAsync(
    `psql -c 'CREATE TABLE IF NOT EXISTS public.${tableNameBase} (LIKE us.${tableNameBase});'`,
    { env: pgEnv }
  )

  // State's subset inherits from parent.
  await execAsync(
    `psql -c 'ALTER TABLE us.${tableName} INHERIT us.${tableNameBase};'`,
    { env: pgEnv }
  )

  // State's parent inherits from root.
  try {
    await execAsync(
      `psql -c 'ALTER TABLE us.${tableNameBase} INHERIT public.${tableNameBase};'`,
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
  loadStaticFile(),
])
  .catch(console.error.bind(console))