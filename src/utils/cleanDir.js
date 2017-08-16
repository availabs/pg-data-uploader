'use strict'


const { promisify } = require('util')

const {
  readdir,
  unlink,
} = require('fs')

const {
  join,
  extname,
} = require('path')

const readdirAsync = promisify(readdir)
const unlinkAsync = promisify(unlink)


async function cleanDir (dir) {
  const files = await readdirAsync(dir)
  const toDelete = files.filter(f => extname(f) !== '.zip')

  await Promise.all(toDelete.map(f => unlinkAsync(join(dir, f))))
}


module.exports = cleanDir
