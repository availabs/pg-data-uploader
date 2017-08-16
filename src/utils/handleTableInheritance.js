'use strict'


const { promisify } = require('util')

const { exec } = require('child_process')

const execAsync = promisify(exec)



async function handleTableInheritance (params) {

  const {
    schema,
    parentTableName,
    tableName,
  } = params

  // Create the state's parent table
  await execAsync(
    `psql -c 'CREATE TABLE IF NOT EXISTS "${schema}".${parentTableName} (LIKE "${schema}".${tableName});'`,
    { env: this.pgEnv }
  )

  // Create the root table
  await execAsync(
    `psql -c 'CREATE TABLE IF NOT EXISTS public.${parentTableName} (LIKE "${schema}".${parentTableName});'`,
    { env: this.pgEnv }
  )

  // State's subset inherits from parent.
  await execAsync(
    `psql -c 'ALTER TABLE "${schema}".${tableName} INHERIT "${schema}".${parentTableName};'`,
    { env: this.pgEnv }
  )

  // State's parent inherits from root.
  try {
    await execAsync(
      `psql -c 'ALTER TABLE "${schema}".${parentTableName} INHERIT public.${parentTableName};'`,
      { env: this.pgEnv }
    )
  } catch (err) {
    if (!err.message.match(/would be inherited from more than once/)) {
      console.error(err)
    }
  }
}


module.exports = handleTableInheritance
