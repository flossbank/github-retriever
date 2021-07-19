const test = require('ava')
const sinon = require('sinon')
const { MongoMemoryServer } = require('mongodb-memory-server')
const Mongo = require('../lib/mongo')
const Config = require('../lib/config')

test.before(async (t) => {
  const config = new Config({
    kms: {}
  })

  const mongo = new MongoMemoryServer()
  const mongoUri = await mongo.getUri()

  config.decrypt = sinon.stub().returns(mongoUri)
  t.context.mongo = new Mongo({ config, log: { info: sinon.stub() } })
  await t.context.mongo.connect()

  const { insertedId: defaultOrgId } = await t.context.mongo.db.collection('organizations').insertOne({
    name: 'azalias',
    installationId: 'abc',
    host: 'GitHub'
  })

  t.context.organizationId = defaultOrgId.toString()
})

test.after(async (t) => {
  await t.context.mongo.close()
})

test('close', async (t) => {
  const mongo = new Mongo({})
  await mongo.close() // nothing to close

  mongo.mongoClient = { close: sinon.stub() }
  await mongo.close()

  t.true(mongo.mongoClient.close.calledOnce)
})

test('get org', async (t) => {
  const { mongo } = t.context
  const { insertedId: orgId1 } = await mongo.db.collection('organizations').insertOne({
    name: 'flossbank',
    installationId: 'abc',
    host: 'GitHub'
  })

  const res = await mongo.getOrg({ organizationId: orgId1.toString() })
  t.deepEqual(res, { name: 'flossbank', host: 'GitHub', installationId: 'abc' })
})

test('get org | no org', async (t) => {
  const { mongo } = t.context
  const res = await mongo.getOrg({ organizationId: 'aaaaaaaaaaaa' })
  t.is(res, null)
})
