const debug = require('debug')('ssb-authorized-keys')

module.exports = {
  /*
  permissions: {
    anonymous: {
      allow: ['manifest']  
    }
  },
  */
  init: (ssk, conf) => {
    let {authorizedKeys} = conf
    ssk.auth.hook( (fn, args)=>{
      const [id, cb] = args
      fn(id, (err, p)=>{
        if (err) return cb(err)
        if (conf.keys.id == id) {
          p = {allow: null, deny: null}
        } else if (authorizedKeys) {
          authorizedKeys = [authorizedKeys].flat()
          let allow = authorizedKeys.find(x=>x.startsWith(id))
          if (allow) {
            allow = allow.split(':')[1]
            if (allow == '*') {
              allow = null
            } else {
              allow = allow.split(',').map(x=>x.trim())
            }
            p = {allow, deny: null} 
            debug('authorizedKey %s permissions: %O', id, p)
          }
        }
        cb(null, p)
      })
    })
  }
}
