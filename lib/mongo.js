const { MongoClient, ObjectId } = require('mongodb')

const MONGO_DB = 'flossbank_db'
const ORGS_COLLECTION = 'organizations'

class Mongo {
  constructor ({ config, log }) {
    this.log = log
    this.config = config
    this.db = null
    this.mongoClient = null
  }

  async connect () {
    const mongoUri = await this.config.getMongoUri()
    this.mongoClient = new MongoClient(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    await this.mongoClient.connect()

    this.db = this.mongoClient.db(MONGO_DB)
  }

  async close () {
    if (this.mongoClient) return this.mongoClient.close()
  }

  async getOrg ({ organizationId }) {
    this.log.info('Retrieving org from DB', organizationId)

    const org = await this.db.collection(ORGS_COLLECTION).findOne({
      _id: ObjectId(organizationId)
    })

    if (!org) return org

    const { name, host, installationId } = org

    return { name, host, installationId }
  }
}

module.exports = Mongo
