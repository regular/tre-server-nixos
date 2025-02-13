const fs = require('fs')
const {join} = require('path')
const merge = require('lodash.merge')
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

    conf.connections = {
      outgoing: {
        net: [{transform: "shs"}]
      },
      incoming: {
        net: [{
          host: conf.host,
          port: conf.port,
          scope: "local",
          transform: "shs"
        }],
    
        ws: [{host: conf.ws.host, port: conf.ws.port, scope: "device", transform: "shs"}],
        unix: conf.socketPath ? [{path: conf.socketPath, scope: "device", transform: "noauth"}] : []
      }
    }

    //debug('Config is: %s', JSON.stringify(conf, null, 2))
    debug('sbot id: %s', keys.id)
    Sbot(conf, keys, (err, ssb) =>{
      if (err) return cb(err)
      cb(null, ssb, conf)
    })
  })
}

// -- utils

//function mixinDefaults(conf) {
//  return merge({}, JSON.parse(fs.readFileSync(join(__dirname, 'default-config.json'))), conf || {})
//}
      
function getConfig(cb) {
  let conf = rc('tre-server')
  //const keys = conf.keys
  if (!conf.path) {
    return cb(new Error('Path must be specified, use --path DATAPATH'))
  }
  if (!conf.keys) {
    return cb(new Error('No keys specified.'))
  }

  //conf.path = conf.path || join(conf.config, '../.tre')
  //conf = mixinDefaults(conf)
  //debug('Conf from mixinDefaults: %s', JSON.stringify(conf, null, 2))
  //netDefaults(conf, (err, conf)=>{
    //if (err) return cb(err)
    //conf.keys = keys
    cb(null, conf)
  //})
}
