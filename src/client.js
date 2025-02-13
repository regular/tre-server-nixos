const ssbClient = require('ssb-client')
const retry = require('dont-stop-believing')
const debug = require('debug')('tre-server:client')

const retryClient = retry(ssbClient)

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

  retryClient(keys, conf, (err, ssb) => {
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
        cb(null, ssb)
      })
    })
  })
}
