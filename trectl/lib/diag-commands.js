const {promisify} = require('util')
const debug = require('debug')('provctli:org')
const {DateTime} = require('luxon')
const chalk = require('chalk');
const pull = require('pull-stream')
const file = require('pull-file')
const {stdin} = require('pull-stdio')

module.exports = function makeCommands(argv, ssb, ssb_config) {
  return {
    config: ()=>ssb_config,
    whoami,
    log,
    types,
    manifest,
    address,
    help: promisify(ssb.help),
    status: promisify(ssb.status),
    progress: promisify(ssb.progress),
    version: promisify(ssb.version)
  }

  async function types() {
    return new Promise( (resolve, reject) => {
      pull(
        ssb.createLogStream({keys: false}),
        pull.map( ({content})=>content.type),
        pull.unique(),
        pull.drain( t =>{
          console.log(t)
        }, err => {
          if (err) return reject(err)
          resolve()
        })
      )
    })
  }

  async function log() {
    const live = argv.follow
    const {reverse, type, since, until, limit, comment} = argv

    const opts = {live, reverse, limit}
    if (since) opts.gte = since
    if (until) opts.lt = until

    const source = type ? ssb.messagesByType(type, opts) : ssb.createLogStream(opts)

    return new Promise( (resolve, reject) => {
      let count = 0;
      pull(
        source,
        pull.drain( kv=>{
          if (kv.sync) return
          count++
          let j = JSON.stringify(kv, null, 2)
          if (comment) {
            j = j.replace(/\s*\"timestamp\":\s+([0-9.]+),?/g, (x,y)=>{
              const s = DateTime.fromMillis(Number(y)).toString() 
              return `${x} // ${s}`
            })
          }
          console.log(j)
          console.log()
        }, err => {
          if (err) return reject(err)
          resolve(count)
        })
      )
    })
  }

  async function whoami() {
    return new Promise( (resolve, reject) => {
      ssb.whoami( (err, result)=>{
        if (err) return reject(err)
        resolve(result.id)
      })
    })
  }

  async function address() {
    const scopes = 'device local private public'.split(' ')
    return Promise.all(scopes.map(scope=>{
      return new Promise( (resolve, reject) => {
        ssb.multiserver.address( 'device', (err, result)=>{
          if (err) return reject(err)
          resolve({[scope]: result})
        })
      })
    }))
  }

  async function manifest() {
    return new Promise( (resolve, reject) => {
      ssb.manifest( (err, result)=>{
        if (err) return reject(err)
        resolve(result)
      })
    })
  }

}

// -- util

function revRoot(kv) {
  return kv.value.content.revisionRoot || kv.key
}

