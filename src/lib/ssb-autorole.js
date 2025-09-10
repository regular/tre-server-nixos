const pull = require('pull-stream')
const Log = require('./log')

exports.name = 'autorole'
exports.version = '1.0.0'
exports.manifest = {}

exports.init = function (ssb, config) {
  const {error, warning, notice, info} = Log(ssb, exports.name)
  let role = config?.autorole
  if (role) {
    ssb.whoami( (err, feed) => {
      if (err) throw err
      pull(
        ssb.createUserStream({
          id: feed.id,
          values: true,
          keys: false
        }),
        pull.asyncMap( (value, cb) => {
          const {content{ = value
          if (content?.type == 'role' && content?.about == feed.id ) {
            if (role == content?.station) {
              notice(`Already has role: ${role}`)
              return cb(true)
            }
          }
          cb(null, value)
        }),
        pull.onEnd( err => {
          if (err) throw err
          pull(
            pull.values([role]),
            pull.map( station => {
              return {
                type: 'role',
                about: feed.id,
                station
              }
            }),
            pull.asyncMap( (content, cb) => {
              ssb.publish(content, cb)
            }),
            pull.drain( msg => {
              notice(`published role message for ${msg.value.content.about}  => ${msg.value.content.station}`)
            }, err => {
              if (err) {
                error(err.message)
              }
            })
          )
        })
      )
    })
  } else {
    notice('No autorole in config')
  }
  return {}
}

