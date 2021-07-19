const test = require('ava')
const sinon = require('sinon')
const Config = require('../lib/config')

test.beforeEach((t) => {
  t.context.config = new Config({
    kms: {
      decrypt: sinon.stub().returns({
        promise: sinon.stub().resolves({
          Plaintext: Buffer.from('abc')
        })
      })
    }
  })
})

test('getFlossbankOrgId returns from env', (t) => {
  const { config } = t.context
  process.env.FLOSSBANK_ORG_ID = 'aaaaaaaaaaaa'

  t.is(config.getFlossbankOrgId(), 'aaaaaaaaaaaa')
})

test('getMongoUri decrypts with kms and caches result', async (t) => {
  const { config } = t.context
  process.env.MONGO_URI = Buffer.from('abc').toString('base64')
  t.is(await config.getMongoUri(), 'abc')
  t.true(config.kms.decrypt.calledOnce)
  config.kms.decrypt.resetHistory()

  t.is(await config.getMongoUri(), 'abc')
  t.true(config.kms.decrypt.notCalled)
})

test('getGithubAppConfig decrypts with kms and caches result', async (t) => {
  const { config } = t.context
  process.env.GITHUB_APP_PEM = Buffer.from('ghapppem').toString('base64')
  process.env.GITHUB_APP_ID = Buffer.from('ghappid').toString('base64')
  t.deepEqual(await config.getGithubAppConfig(), { id: 'abc', privateKey: 'abc' })
  t.true(config.kms.decrypt.calledTwice) // PEM + ID
  config.kms.decrypt.resetHistory()

  t.deepEqual(await config.getGithubAppConfig(), { id: 'abc', privateKey: 'abc' })
  t.true(config.kms.decrypt.notCalled)
})
