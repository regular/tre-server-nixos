const fs = require('fs')
const crypto = require('crypto')
const {spawnSync} = require('child_process')
const {generate} = require('ssb-keys')
const conf = require('rc')('tre_creds')

if (conf._.length < 1) {
  console.error(`Usage: tre-creds NETWORK_NAME [--caps NETWORK_CAPS] [--keys SECRET_KEYFILE] --authority --print`)
  process.exit(1)
}
const [name] = conf._
let {caps, keys, authority} = conf
let network
if (keys && typeof keys == 'string') {
  try {
    keys = JSON.parse(fs.readFileSync(keys))
  } catch(err) {
    console.error(err.message)
    process.exit(1)
  }
}

if (!keys || conf['new-keys']) {
  keys = generate()
  console.error(`Generated new keypair. Public key: ${keys.id}`)
}

if (caps.shs) caps = caps.shs

if (!caps) {
  if (authority) {
    console.error("Using public key as caps value.")
    console.error("This ssb identity will have network authority")
    network = keys.public
    caps = network.split('.')[0]
  } else {
    caps = crypto.randomBytes(32).toString('base64')
    network = caps + '.random'
    console.error(`Generated new random network id (caps value): ${caps}`)
  }
} else {
  network = conf.network || caps
}

const secret = {
  appname: name,
  network: `${network[0]!=='*' ? '*' : ''}${network}`,
  caps: { shs: caps, },
  keys,
  remote: conf.remote
}

if (conf.print) {
  console.log(JSON.stringify(secret, null, 2))
  process.exit(0)
}

const outPath = `/etc/tre-creds/${name}`
const {SYSTEMD_CREDS} = process.env
if (!SYSTEMD_CREDS) {
  console.error('Environment variable SYSTEMD_CREDS must be set')
  process.exit(1)
}
const {status} = spawnSync(SYSTEMD_CREDS, [
  'encrypt', '-', outPath
], {
  input: JSON.stringify(secret),
  stdio: ['pipe', 'inherit', 'inherit']
})

if (status == 0) {
  console.error(`written secrets to ${outPath}`)
  console.error(`public key: ${secret.keys.id}`)
}
process.exit(status)
