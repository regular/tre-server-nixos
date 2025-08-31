const SecretStack = require('secret-stack')
const SSB = require('ssb-db')
const custom = require('./ssb-custom')

module.exports = function(config) {
  const createSbot = SecretStack()
    .use(SSB)
    .use(require('ssb-conn'))
    .use(require('ssb-autoname'))
    .use(require('ssb-autoinvite'))
    .use(require('ssb-autofollow'))
    .use(require('ssb-replicate'))
    .use(require('ssb-friends'))
    .use(require('ssb-private'))
    .use(require('ssb-blobs'))
    .use(require('ssb-invite'))
    .use(require('ssb-lan'))
    //.use(require('ssb-ooo'))
    .use(require('ssb-logging'))
    .use(require('ssb-query'))
    .use(require('ssb-links'))
    .use(require('ssb-ws'))
    .use(require('ssb-ebt'))
    .use(require('ssb-backlinks'))
    .use(require('ssb-social-index')({
      namespace: 'about',
      type: 'about',
      destField: 'about'
    }))
    .use(require('ssb-revisions'))
    .use(require('ssb-sandboxed-views'))
    .use(require('tre-boot'))
    .use(require('./ssb-authorized-keys'))

  custom(createSbot)

  const ret = function(config, keys, cb) {
    const ssb = createSbot(Object.assign({}, config, {keys}))

    // wait for the server to listen
    const timeout = setTimeout( ()=>{
      cb(new Error('timeout while waiting for multiserver:listening event'))
    }, 2000)

    ssb.once('multiserver:listening', e=>{
      clearTimeout(timeout)
      cb(null, ssb)
    })
  }
  ret.use = function(x) {
    createSbot.use(x)
    return ret
  }
  return ret
}
