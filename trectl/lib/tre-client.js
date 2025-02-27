const ssbClient = require('ssb-client')
const debug = require('debug')('provisioner:tre-client')

module.exports = function(socketPath, cb) {
  const remote = `unix:${socketPath}~noauth`
  debug(`remote: ${remote}`)
  const keys = {
    public: 'foobaz',
    private: 'foobaz'
  }
  const conf = {
    remote,
    caps: {shs: 'foobar'},
    manifest: {manifest: 'async'}
  }

  ssbClient(keys, conf, (err, ssb) => {
    if (err) return cb(err)
    debug('getting manifest ...')
    ssb.manifest( (err, manifest) => {
      if (err) return cb(err)
      debug('got manifest')
      ssb.close()
      ssbClient(keys, Object.assign(
        conf,
        {manifest} 
      ), (err, ssb) => {
        if (err) return cb(err)
        cb(null, ssb, conf)
      })
    })
  })
}
