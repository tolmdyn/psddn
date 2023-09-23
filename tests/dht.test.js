/**
 * @description Tests for the DHT
 */

const fs = require('fs');
const { expect } = require('chai');

const DHT = require('../src/network/dht');

const { Database } = require('../src/database/database');
const { generateRandomDocument, generateRandomUser } = require('./scripts/generate');
const { Types } = require('../src/models/types');
const { ResponseTypes } = require('../src/models/response');

describe('DHT Tests', () => {
  let testDB; // test database
  let node; // dht node

  before(() => {
    // Code to run before all tests in this test suite
    // Create an empty test database
    // testDB = new Database('./tests/data/test_database.db');
    testDB = new Database(':memory:');
    DHT.setDb(testDB);
  });

  after(() => {
    DHT.shutdown();

    // Code to run after all tests in this test suite
    // Close the database connection after each test
    if (testDB) {
      testDB.closeDatabaseConnection();
    }

    // Delete the test database file, if it exists
    if (fs.existsSync('./tests/data/test_database.db')) {
      fs.unlinkSync('./tests/data/test_database.db');
    }
  });

  beforeEach(() => {
  });

  afterEach(() => {
  });

  it('should create a new database', () => {
    expect(testDB).to.be.an.instanceof(Database);

    // some other checks?
  });

  it('should set up a dht node', () => {
    node = DHT.initDHTNode();

    expect(node).to.exist;
  });

  it('should fail a query for non exising document', async function () {
    this.timeout(10000);
    const doc = generateRandomDocument();

    const response = await DHT.queryDHT(doc.key);
    expect(response).to.exist;
    expect(response.responseType).to.equal(ResponseTypes.Error);
    expect(response.responseData).to.equal('Item not found in DHT.');
  });

  it('should put a document in the dht', async function () {
    this.timeout(10000);
    const doc = generateRandomDocument();

    const response = await DHT.storeDHT(doc.key, doc);
    expect(response).to.exist;
    expect(response.key).to.equal(doc.key);
  });

  it('should query for an existing document', async function () {
    this.timeout(10000);
    const doc = generateRandomDocument();
    const put = await DHT.storeDHT(doc.key, doc);
    expect(put).to.exist;
    expect(put.key).to.equal(doc.key);

    const response = await DHT.queryDHT(put.key);
    expect(response).to.exist;
    expect(response.responseType).to.equal(ResponseTypes.Success);
    expect(response.responseData).to.deep.equal(doc);
  });

  it('should put a lot of documents in the dht', async function () {
    this.timeout(10000);
    const amount = 20;
    // generate documents
    const docs = [];
    for (let i = 0; i < amount; i += 1) {
      docs.push(generateRandomDocument());
    }

    // create 100 promises
    const promises = [];
    docs.forEach((doc) => {
      promises.push(DHT.storeDHT(doc.key, doc));
    });

    // wait for all promises to resolve
    const responses = await Promise.all(promises);

    // check that all responses are valid
    responses.forEach((response) => {
      expect(response).to.exist;
      expect(response.key).to.exist;
    });
  });
});
