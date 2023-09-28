/**
 * @description Tests for the DHT
 */

const fs = require('fs');
const { fork } = require('child_process');
const { expect } = require('chai');

const DHT = require('../src/network/dht');

const { Database } = require('../src/database/database');
const { generateRandomDocument, generateRandomUser } = require('./scripts/generate');
const { Types } = require('../src/models/types');
const { ResponseTypes } = require('../src/models/response');

let dhtApp;

describe('DHT Tests', () => {
  let testDB; // test database
  let node; // dht node

  before(function (done) {
    this.timeout(5000);
    // Code to run before all tests in this test suite

    // Check if dht is already running

    // Create a bootstrap node
    createDHTBootstrap();

    // Create an empty test database
    // testDB = new Database('./tests/data/test_database.db');
    testDB = new Database(':memory:');
    DHT.setDb(testDB);

    expect(testDB).to.be.an.instanceof(Database);

    setTimeout(() => {
      // Shut down the dht test node
      done();
    }, 1500);
  });

  after(() => {
    // Destroy the bootstrap node
    destroyDHTBootstrap();

    // Shut down the dht test node
    DHT.shutdownDHT();

    // Close the database connection
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

  it('should set up a dht node', () => {
    node = DHT.initDHTNode();

    expect(node).to.exist;
  });

  it('should fail a query for non exising document', async function () {
    this.timeout(10000);
    const doc = generateRandomDocument();

    const response = await DHT.queryDHT(doc.key, Types.Document);
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

  it('should fail to put a document in the dht', async function () {
    this.timeout(10000);
    const doc = generateRandomDocument();
    doc.key = 'invalid key';

    const response = await DHT.storeDHT(doc.key, doc);
    expect(response).to.exist;

    expect(response.responseType).to.equal(ResponseTypes.Error);
    expect(response.responseData).to.equal('Invalid key.');
  });

  it('should query for an existing document', async function () {
    this.timeout(10000);
    const doc = generateRandomDocument();
    const put = await DHT.storeDHT(doc.key, doc);
    expect(put).to.exist;
    expect(put.key).to.equal(doc.key);

    const response = await DHT.queryDHT(put.key, put.type);
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

function createDHTBootstrap() {
  const commandOptions = ['-ltests/data/dht.log']; // '-ltests/data/dhtlog'
  dhtApp = fork('./tests/scripts/testDHTnet.js', commandOptions, { silent: true });

  dhtApp.on('error', (err) => {
    console.log('DHT node error:', err);
  });

  dhtApp.stderr.on('data', (data) => {
    // console.log(`stdout: ${data}`);
    // const str = data.toString();
    if (data.toString().includes('EADDRINUSE')) {
      // It is already online so keep silent.
    } else {
      console.log(`Error init DHT network: ${data}`);
    }
  });
}

function destroyDHTBootstrap() {
  dhtApp.kill();
}
