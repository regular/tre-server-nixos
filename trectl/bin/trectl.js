require('../extra-modules-path')

const fs = require('fs')
const {resolve, join} = require('path')
const debug = require('debug')('trectl')
const SSBClient = require('../lib/tre-client')

const diagCommands = require('../lib/diag-commands')

const argv = require('rc')('trectl', {})

debug('argv is %O', argv)

if (!argv.socketPath) {
  bail_if(new Error('socketPath not specified'))
}

main(argv)

async function main(argv) {
  const ssb = await SSB()

  const commands = Object.assign({},
    diagCommands(argv, ssb),
  )

  const command = argv._[0]
  if (!command || !commands[command]) {
    console.error(`Valid subcommands:
    `)
    process.exit(2)
  }

  try {
    const result = await commands[command](argv)
    console.log(result)
  } catch(err) {
    bail_if(err)
  } finally {
    ssb.close(()=>{})
  }
}

function SSB() {
  return new Promise( (resolve, reject) => {
    SSBClient(`${argv.socketPath}/socket`, (err, api) => {
      if (err) return reject(err)
      resolve(api)
    })
  })
}

function bail_if(err) {
  if (err) {
    if (argv.v) {
      console.error(err)
    } else {
      console.error(err.message)
    }
    process.exit(1)
  }
}
