const debug = require('debug')('tre-server:custom')

module.exports = function(createSbot) {
  return createSbot
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
            debug('getting config')
            const ret = Object.assign({}, config, {keys: {}})
            return ret
          }
        }
      }
    })
    /*
    .use({
      permissions: {
        anonymous: {
          allow: ['manifest']  
       }
      },
      init: (ssk, conf) => {
        const keys = conf.keys
        debug('hooking auth')
        ssk.auth.hook( (fn, args)=>{
          const [id, cb] = args
          fn(id, (err, p)=>{
            if (err) return cb(err)
            debug('XXX id=%s', id)
            debug('conf: %O', conf)
            debug('ssk: %O', ssk)
            debug('permissions: %O', p)
            if (keys.id == id) {
              debug('it is self')
              p = {allow: null, deny: null}
            }
            cb(null, p)
          })
        })
      }
    })
    */
}

// ---

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

