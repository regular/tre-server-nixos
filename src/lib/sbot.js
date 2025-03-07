const debug = require('debug')('tre-erver:sbot')

module.exports = function(config, keys, cb) {
  const createSbot = require('./tre-bot')()

  createSbot
    .use({
      init: ssk => {
        const Unix = require('multiserver/plugins/unix-socket')
        ssk.multiserver.transport({
          name: 'unix',
          create: conf => Unix(conf || {})
        })
      }
    })
    .use({
      init: (ssk, conf) => {
        const keys = toSodiumKeys(conf.keys)
        const NoAuth = require('multiserver/plugins/noauth')
        ssk.multiserver.transform({
          name: 'noauth',
          create: opts => {
            return NoAuth(Object.assign({}, conf || {}, opts || {}, {keys} ))
          }
        })
      }
    })
    .use({
      manifest: {
        getConfig: 'sync'
      },
      permissions: {
        anonymous: { allow: [], deny: null }
      },
      init: function (api, config) {
        return {
          getConfig: () => {
            const ret = Object.assign({}, config, {keys: {}})
            return ret
          }
        }
      }
    })
    /*.use({
      manifest: {getAddress: "sync"},
      init: ssb => ({getAddress: scope => ssb.multiserver.address(scope)})
    })*/
    .use(require('ssb-sandboxed-views'))
    .use(require('tre-boot'))
    .use(require('ssb-backlinks'))
    .use(require('ssb-social-index')({
      namespace: 'about',
      type: 'about',
      destField: 'about'
    }))

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

// copied from shs plugin :/

function toBuffer(base64) {
  if(Buffer.isBuffer(base64)) return base64
  var i = base64.indexOf('.')
  return new Buffer(~i ? base64.substring(0, i) : base64, 'base64')
}

function toSodiumKeys (keys) {
  return {
    publicKey: toBuffer(keys.public),
    secretKey: toBuffer(keys.private)
  }
}

