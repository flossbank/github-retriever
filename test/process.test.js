const test = require('ava')
const sinon = require('sinon')
const Process = require('../lib/process')

test.beforeEach((t) => {
  const db = {
    getOrg: sinon.stub().resolves({ name: 'flossbank', installationId: 'asdf', billingInfo: {} })
  }
  const resolver = {
    getSupportedManifestPatterns: sinon.stub().resolves(['package.json']),
    extractDependenciesFromManifests: sinon.stub().returns([{
      language: 'javascript',
      registry: 'npm',
      deps: ['standard', 'js-deep-equals', 'yttrium-server']
    }, {
      language: 'php',
      registry: 'idk',
      deps: ['some-php-dep']
    }, {
      language: 'haskell',
      registry: 'idk',
      deps: []
    }])
  }
  const retriever = {
    getAllManifestsForOrg: sinon.stub().returns([{
      language: 'javascript',
      registry: 'npm',
      manifest: JSON.stringify({ dependencies: { standard: '12.0.1' } })
    }, {
      language: 'php',
      registry: 'idk',
      manifest: 'asdf'
    }])
  }
  const log = { info: sinon.stub() }

  const config = {
    getFlossbankOrgId: sinon.stub().returns('aaaaaaaaaaaa')
  }

  t.context.services = {
    db,
    resolver,
    retriever,
    log,
    config
  }

  t.context.recordBody = {
    organizationId: 'test-org-id'
  }
  t.context.testRecord = {
    body: JSON.stringify(t.context.recordBody)
  }

  t.context.undefinedOrgRecordBody = {
    organizationId: undefined
  }
  t.context.undefinedOrgTestBody = {
    body: JSON.stringify(t.context.undefinedOrgRecordBody)
  }
})

test('process | success', async (t) => {
  const { services, testRecord } = t.context
  const res = await Process.process({
    record: testRecord,
    ...services
  })

  t.deepEqual(res, { success: true })
  t.true(services.resolver.getSupportedManifestPatterns.calledOnce)
  t.true(services.retriever.getAllManifestsForOrg.calledOnce)
  t.true(services.resolver.extractDependenciesFromManifests.calledOnce)
})

test('process | success | org with no installation id authenticates with flossbank installation id', async (t) => {
  const { services, testRecord } = t.context

  // the returned org has no installation id
  services.db.getOrg.onFirstCall().resolves({ name: 'sony' })
  services.db.getOrg.onSecondCall().resolves({ name: 'flossbank', installationId: 'flossbank-install-id' })

  const res = await Process.process({
    record: testRecord,
    ...services
  })

  t.deepEqual(res, { success: true })

  t.true(services.config.getFlossbankOrgId.calledOnce)
  t.true(services.retriever.getAllManifestsForOrg.calledWith({
    name: 'sony',
    installationId: 'flossbank-install-id'
  }, services.resolver.getSupportedManifestPatterns()))
})

test('process | failure | flossbank org does not have an installation id', async (t) => {
  const { services, testRecord } = t.context

  // the returned org has no installation id
  services.db.getOrg.onFirstCall().resolves({ name: 'sony' })
  // flossbank also doesn't have an installation id
  services.db.getOrg.onSecondCall().resolves({ name: 'flossbank' })

  await t.throwsAsync(() => Process.process({
    record: testRecord,
    ...services
  }), { message: 'no installation id found on flossbank org' })
})

test('process | failure, undefined org id', async (t) => {
  const { services } = t.context
  await t.throwsAsync(Process.process({
    ...services,
    record: t.context.undefinedOrgTestBody
  }))
})
