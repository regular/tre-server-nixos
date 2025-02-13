const {join} = require('path')
const pull = require('pull-stream')
const muxrpc = require('muxrpc')
const debug = require('debug')('tre-server:rpc')
const SocketClient = require('pull-unix/client')

const manifest = {manifest: 'async'}

module.exports = function(argv) {
  const api = runMuxrpc(argv)()
  console.log('calling manifest ...')
  debug('%O', api)
  api.manifest( (err, m) => {
    console.log(err, JSON.stringify(m, null, 2))
  })
}

function runMuxrpc(argv) {
  const unixSocketPath = join(argv.socketPath, 'socket')
  const rpc  = muxrpc(manifest, null)
  const stream = SocketClient({path: unixSocketPath})
  pull(
    stream,
    pull.through( (d)=> debug(`from socket ${d}`) ),
    rpc.stream,
    pull.through( (d)=> debug(`to socket ${d}`) ),
    stream
  )
  return rpc
}

