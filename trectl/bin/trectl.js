require('../extra-modules-path')

const {inspect} = require('util')
const fs = require('fs')
const {resolve, join} = require('path')
const debug = require('debug')('trectl')
const SSBClient = require('../lib/tre-client')

const diagCommands = require('../lib/diag-commands')

const argv = require('rc')('trectl', {})

debug('argv is %O', argv)

if (!argv.socketPath && !(argv.remote && argv.network)) {
  bail_if(new Error('Either --remote or --socketPath and --network must be specified'))
}

main(argv)

async function main(argv) {
  const r = await SSB()
  const ssb = r.api
  const ssb_config = r.conf

  const commands = Object.assign({},
    diagCommands(argv, ssb, ssb_config),
  )

  const command = argv._[0]
  if (!command || !commands[command]) {
    console.error(`Valid subcommands are:
    ${Object.keys(commands).join(', ')} `)
    process.exit(2)
  }

  try {
    const result = await commands[command](argv)
    console.log(inspect(result, {color: true, depth: 10}))
  } catch(err) {
    bail_if(err)
  } finally {
    ssb.close(()=>{})
  }
}

function SSB() {
  return new Promise( (resolve, reject) => {
    const remote = argv.remote || `unix:${argv.socketPath}~noauth`
    SSBClient(remote, argv, (err, api, conf) => {
      if (err) return reject(err)
      resolve({api, conf})
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
