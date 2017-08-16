'use strict'


const { promisify } = require('util')

const { exec } = require('child_process')

const execAsync = promisify(exec)


async function shapeFileLoader ({ dataPath, schema, tableName }) {

  /* Sample output of ogrinfo:

			INFO: Open of `.'
						using driver `ESRI Shapefile' successful.
			1: milbase (3D Polygon)
	*/
  // const ogrinfo = await execAsync(`ogrinfo ${dataPath}`)

  // const shapeFileInfo = ogrinfo.stdout.split('\n').filter(line => line.match(/\d+:/))
	
	// if (shapeFileInfo.length < 1) {
		// throw new Error(ogrinfo.stderr || `No ogrinfo for ${tableName}`)
	// } else if (shapeFileInfo.length > 1) {
		// throw new Error(`The shapefile loader currently does not support multiple shapes per shapefile: ${tableName}`)
	// }
	

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
			const output = await execAsync(`${cmd} -nlt PROMOTE_TO_MULTI`)
			if (output.stderr) {
				throw new Error(output.stderr)
			}
		}

	} catch (err) {
		throw err
	}
}


module.exports = shapeFileLoader

