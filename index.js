const AWS = require('aws-sdk')
const Pino = require('pino')
const RegistryResolver = require('@flossbank/registry-resolver')
const Process = require('./lib/process')
const Config = require('./lib/config')
const Db = require('./lib/mongo')
const GitHub = require('./lib/github')

const kms = new AWS.KMS({ region: 'us-west-2' })

/*
- Get event info from SQS event
- Look up organization in mongo to get installation ID (or use Flossbank's)
- Request temporary access from github using GH App PEM and installation ID
- Search organization's repositories for supported manifests (packages.jsons)
- Download all supported manifests, grouped by registry/language (e.g. NPM+JS)
- Merge grouped manifests into single list of Top Level Pkgs (maintaining duplicates)
- Write TLPs to S3
- Trigger registry-resolver lambda
*/
exports.handler = async (event) => {
  const log = Pino()
  const config = new Config({ log, kms })

  const retriever = new GitHub({ log, config })
  await retriever.init()

  const db = new Db({ log, config })
  await db.connect()

  const resolver = new RegistryResolver({ log, epsilon: 0 }) // epsilon not used in this case

  let results
  try {
    results = await Promise.all(
      event.Records.map(record => Process.process({ record, db, resolver, retriever, log, config }))
    )
    if (!results.every(result => result.success)) {
      throw new Error(JSON.stringify(results))
    }
    return results
  } finally {
    await db.close()
  }
}
