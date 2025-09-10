const fs = require('fs')
const {join} = require('path')
const merge = require('deep-extend')
const debug = require('debug')('tre-server:index')
const ssbKeys = require('ssb-keys')
const rc = require('rc')

//const netDefaults = require('./lib/network-config-defaults')
const Sbot = require('./lib/sbot')

module.exports = function(argv, cb) {
  getConfig( (err, conf) =>{
    if (err) return cb(err)
    debug(`Keypair is ${conf.keys ? '':'not '}provided in the configuration`)
    const keys = conf.keys 
    delete conf.keys

    if (conf.network && !conf.caps) {
      conf.caps = {
        shs: conf.network.replace('*','').split('.')[0]
      }
    }

    conf.ws = conf.ws || {}

    conf.connections = {
      outgoing: {
        net: [{transform: "shs"}]
      },
      incoming: {
        net: conf.host || conf.fqdn ? [{
          host: conf.host,
          port: conf.port,
          scope: conf.fqdn ? "public" : "local",
          external: conf.fqdn,
          transform: "shs"
        }] : [],
    
        ws: conf.ws.host ? [{host: conf.ws.host, port: conf.ws.port, scope: "device", transform: "shs"}] : [],
        unix: conf.socketPath ? [{path: conf.socketPath, scope: "device", transform: "noauth"}] : []
      }
    }

    debug('Config is: %s', JSON.stringify(conf, null, 2))
    debug('sbot id: %s', keys.id)
    Sbot(conf, keys, (err, ssb) =>{
      if (err) return cb(err)
      cb(null, ssb, conf)
    })
  })
}

// -- utils

function getConfig(cb) {
  let conf = rc('tre-server')
  //const keys = conf.keys
  if (!conf.path) {
    return cb(new Error('Path must be specified, use --path DATAPATH'))
  }
  if (!conf.keys) {
    return cb(new Error('No keys specified.'))
  }

  const SEC = 1000
  const MIN = SEC * 60

  const baseDefaults = {
    party: true,
    timeout: 0,
    pub: true,
    local: true,
    friends: {
      dunbar: 150,
      hops: 2
    },
    gossip: {
      connections: 3
    },
    timers: {
      connection: 0,
      reconnect: 5 * SEC,
      ping: 2 * MIN,
      handshake: 5 * SEC
    },
    logging: { level: 'info' },
    lan: {
      legacy: false
    },
    conn: {
      autostart: true,
      hops: 2,
      populatePubs: true
    }
  }

  conf = merge(baseDefaults, conf || {})

  cb(null, conf)
}
