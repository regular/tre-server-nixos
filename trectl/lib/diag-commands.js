const debug = require('debug')('provctli:org')
const chalk = require('chalk');
const pull = require('pull-stream')
const file = require('pull-file')
const {stdin} = require('pull-stdio')

module.exports = function makeCommands(argv, ssb) {
  return {
    whoami
  }

  async function whoami() {
    return new Promise( (resolve, reject) => {
      ssb.whoami( (err, result)=>{
        if (err) return reject(err)
        resolve(result.id)
      })
    })
  }
}

// -- util

function revRoot(kv) {
  return kv.value.content.revisionRoot || kv.key
}

