'use strict'


const { promisify } = require('util')

const { exec } = require('child_process')

const execAsync = promisify(exec)


async function shapeFileLoader ({ dataPath, schema, tableName }) {

  let cmd =
		`ogr2ogr -f PostgreSQL "${this.pgConnectStr}" ${dataPath} ` +
		`-lco SCHEMA=${schema} -lco OVERWRITE=YES -nln ${tableName}`

	try {
		try {  // First try without PROMOTE_TO_MULTI
			const output = await execAsync(cmd)
			if (output.stderr) {
				throw new Error(output.stderr)
			}
		} catch (err) { // If above failed, retry with PROMOTE_TO_MULTI
			const output = await execAsync(`${cmd} -nlt PROMOTE_TO_MULTI -lco PRECISION=NO`)
			if (output.stderr) {
				throw new Error(output.stderr)
			}
		}

	} catch (err) {
		throw err
	}
}


module.exports = shapeFileLoader

