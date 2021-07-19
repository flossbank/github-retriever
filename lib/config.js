class Config {
  constructor ({ kms }) {
    this.kms = kms
    this.configCache = new Map()
  }

  getFlossbankOrgId () {
    return process.env.FLOSSBANK_ORG_ID
  }

  async decrypt (data) {
    return this.kms.decrypt({
      CiphertextBlob: Buffer.from(data, 'base64')
    }).promise().then(decrypted => decrypted.Plaintext.toString())
  }

  async getMongoUri () {
    if (this.configCache.has('mongoUri')) {
      return this.configCache.get('mongoUri')
    }
    const mongoUri = await this.decrypt(process.env.MONGO_URI)
    this.configCache.set('mongoUri', mongoUri)
    return mongoUri
  }

  async getGithubAppConfig () {
    if (this.configCache.has('githubAppConfig')) {
      return this.configCache.get('githubAppConfig')
    }

    const ghAppId = await this.decrypt(process.env.GITHUB_APP_ID)
    const ghAppPem = await this.decrypt(process.env.GITHUB_APP_PEM)

    const ghConfig = { id: ghAppId, privateKey: ghAppPem }
    this.configCache.set('githubAppConfig', ghConfig)

    return ghConfig
  }
}

module.exports = Config
