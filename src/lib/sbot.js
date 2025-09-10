const debug = require('debug')('tre-erver:sbot')
const Log = require('./log')

module.exports = function(config, keys, cb) {
  const createSbot = require('./tre-bot')()

  createSbot(config, keys, (err, ssb) => {
    if (err) return cb(err)
    const {notice} = Log(ssb, 'tre-server')
    //debug('sbot manifest %O', ssb.getManifest())
    notice(`public key ${keys.id}`)
    debug(`network key ${config.caps.shs}`)
    notice(`datapath: ${config.path}`)
    if (config.autoconnect) {
      let ac = config.autoconnect
      if (typeof ac == 'string') ac = [ac]
      ac.forEach(address => {
        notice(`auto-connecting to ${address}`)
        ssb.conn.remember(address)
        ssb.conn.connect(address)
      })
    }
    cb(null, ssb)
  })
}
