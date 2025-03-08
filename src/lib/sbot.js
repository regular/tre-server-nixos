const debug = require('debug')('tre-erver:sbot')

module.exports = function(config, keys, cb) {
  const createSbot = require('./tre-bot')()

  createSbot(config, keys, (err, ssb) => {
    if (err) return cb(err)
    //debug('sbot manifest %O', ssb.getManifest())
    debug(`public key ${keys.id}`)
    debug(`network key ${config.caps.shs}`)
    debug(`datapath: ${config.path}`)
    if (config.autoconnect) {
      let ac = config.autoconnect
      if (typeof ac == 'string') ac = [ac]
      ac.forEach(address => {
        debug(`auto-connecting to ${address}`)
        ssb.conn.remember(address)
        ssb.conn.connect(address)
      })
    }
    cb(null, ssb)
  })
}


