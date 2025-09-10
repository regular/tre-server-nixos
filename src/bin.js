#!/usr/bin/node
require('./extra-modules-path')

const fs = require('fs')
const {join} = require('path')
const sdNotify = require('sd-notify-lite')
//const journal = new (require('systemd-journald'))({syslog_identifier: 'tre-server'})

const Log = require('./lib/log')

const argv = require('minimist')(process.argv.slice(2))
if (!process.env.DEBUG && argv._.length == 0) {
  process.env.DEBUG='multiserver*,tre-server:*'
}
const debug = require('debug')('tre-server:bin')
debug('parsed command line arguments: %O', argv)

if (argv._.length > 0) {
  const {socketPath} = argv
  if (!socketPath) {
    console.error('Please specofy --socketPath')
    process.exit(1)
  }
  const client = require('./client')
  client( `${socketPath}/socket`, (err, ssb)=>{
    const command = argv._[0]
    if (ssb[command] == undefined) {
      console.error(`Not in manifest: ${command}`)
      process.exit(1)
    }
    ssb[command]( (err, res)=>{
      if (err) console.error(err)
      else console.log(JSON.stringify(res, null, 2))
      ssb.close()
    })
  })
} else {
  const server = require('.')

  server(argv, (err, ssb) =>{
    if (err) {
      console.error(err.message)
      process.exit(1)
    }
    const address = ssb.getAddress('device')
    const {notice} = Log(ssb, 'tre-server')
    notice(`server started at ${address}`)

    function exit(err0) {
      if (err0) console.error(err0.message)
      const code = err0 ? err0.exitCode : 0
      sdNotify.notifyStopping()
      setTimeout( ()=>{
        ssb.close( err=>{
          if (err) console.error(err.message)
          process.exit(code)
        })
      }, 700) // get rid of the timeout
    }
    handleSignals(exit)
    sdNotify.notifyReady()
  })
}

function handleSignals(exit) {
  function signalHandler(signal) {
    console.log('Received signal', signal)
    console.error(`Received signal ${signal}`)
    const err = new Error(`Received ${signal}`)
    err.exitCode = 0
    exit(err)
  }
  process.on('SIGTERM', signalHandler)
  process.on('SIGINT', signalHandler)
}

