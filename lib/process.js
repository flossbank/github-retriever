exports.process = async ({ log, record, db, retriever, resolver, config }) => {
  const { organizationId } = JSON.parse(record.body)

  // If no org id, throw
  if (!organizationId) throw new Error('undefined organization id passed in')
  log.info({ organizationId })

  // a list of { language: string, registry: string, deps: string[] }
  const org = await db.getOrg({ organizationId })
  if (!org) throw new Error(`could not find org with id ${organizationId}`)

  // this is an org that hasn't installed our Github App; we will only be scraping their public repos,
  // and we'll authenticate via Flossbank's installation ID
  if (!org.installationId) {
    const flossbank = await db.getOrg({ organizationId: config.getFlossbankOrgId() })
    org.installationId = flossbank.installationId

    // this shouldn't ever happen, so if it does we'll be noisy
    if (!org.installationId) throw new Error('no installation id found on flossbank org')
  }

  // call the code host (e.g. GitHub) to search all the org's repos for each of the search patterns
  // this call returns a list of [{ registry, language, manifest }, ...] -- that is, a separate
  // object for each manifest file found, alongside its registry and language. the manifest is unparsed (raw utf8)
  const packageManifests = await retriever.getAllManifestsForOrg(org, resolver.getSupportedManifestPatterns())
  log.info('Downloaded %d package manifests', packageManifests.length)

  // now ask the registry resolver to parse the manifest files according to whichever registry/language they are
  // so, for example, { registry: npm, language: javascript, manifest: <some JSON string> } will be parsed as
  // JSON and the dependencies+devDependencies fields will be extracted as top level dependencies.
  // this call returns a list of [{ registry, language, deps }, ...] for each registry and language -- even if
  // there are many unique manifests passed in for the registry and language. it will group all the deps for
  // the registry/language combination into a single list.
  const extractedDependencies = resolver.extractDependenciesFromManifests(packageManifests)
  extractedDependencies.forEach(({ registry, language, deps }) => {
    log.info({ registry, language, deps: deps.length })
  })

  // save the top level packages for each supported registry/language in S3
  // and kick off next lambda via SQS message

  return { success: true }
}
