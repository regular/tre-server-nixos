const Journal = require('systemd-journald')

const ssb_log_levels = 'error warning notice info'.split(' ')
//const journald_prios = 'emerg alert crit err warning notice linfo debug'.split(' ')

module.exports.init = module.exports
module.exports = function (server, conf) {
  const journal = new Journal({syslog_identifier: 'tre-server'})
  
  ssb_log_levels.forEach(level=>{
    server.on(`log:${level}`, makeLogHandler(level))
  })

  function makeLogHandler(level) {
    const prio = journaldPriorityFromSSBLevel(level)
    return function (ary) {
      let [plug, id, verb, ...data] = ary
      if (data.length == 0) data = ''
      else data = data.length == 1 ? data[0] : JSON.stringify(data)

      const message = `${plug} ${verb} ${data}`

      journal[prio](message, {
        SSB_PLUGIN: plug,
        SSB_ID: id,
        SSB_VERB: verb,
        STACK_TRACE: data.stack
        /* TODO: parse from stack trace
        CODE_FILE: file,
        CODE_LINE: line
        */
      })
    }
  }
}

function journaldPriorityFromSSBLevel(t) {
  switch(t) {
    case 'info':
      return 'info'
    case 'notice':
      return 'notice'
    case 'warning':
      return 'warning'
    case 'error':
      return 'err'
  }
}

