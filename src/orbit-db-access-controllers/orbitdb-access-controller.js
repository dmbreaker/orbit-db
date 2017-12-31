'use strict'

const path = require('path')
const AccessController = require('./access-controller')

class OrbitDBAccessController extends AccessController {
  constructor (orbitdb) {
    super()
    this._orbitdb = orbitdb
    this._db = null
    this.controllerType = 'orbitdb'
  }

  async init (name) {
    this._db = await this._orbitdb.keyvalue(name, {
      accessControllerType: 'ipfs', // the "root controller" should be immutable, use ipfs as the type
      write: [this._orbitdb.key.getPublic('hex')],
    })
    // Load locally persisted state
    await this._db.load()
    // Add the creator to the default write capabilities
    await this.add('write', this._orbitdb.key.getPublic('hex'))
    // Get list of capbalities from the database
    this._capabilities = this._db._index._index    
  }

  async close () {
    await this._db.close()
  }

  async load (address) {
    const suffix = address.toString().split('/').pop()
    const addr = suffix === '_access' ? address : path.join(address, '/_access')
    await this.init(addr)
  }

  async save () {
    return Promise.resolve(this._db.address.toString())
  }

  async add (capability, key) {
    let capabilities = new Set(this._db.get(capability) || [])
    capabilities.add(key)
    this._capabilities[capability] = capabilities
    try {
      await this._db.put(capability, Array.from(capabilities))
    } catch (e) {
      throw e
    }
  }

  async remove (capability, key) {
    let capabilities = new Set(this._db.get(capability) || [])
    capabilities.delete(key)
    this._capabilities[capability] = capabilities
    try {
      if (capabilities.size > 0) {
        await this._db.put(capability, Array.from(capabilities))
      } else {
        delete this._capabilities[capability]
        await this._db.del(capability)
      }
    } catch (e) {
      throw e
    }
  }
}

module.exports = OrbitDBAccessController
