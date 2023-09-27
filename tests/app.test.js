/* eslint-disable prefer-arrow-callback */
/* eslint-disable func-names */
/**
 * @description Tests for the main application
 */
const fs = require('fs');
const { fork } = require('child_process');
const { expect } = require('chai');

// Testing imports
const { TestApp } = require('./testApp');
const { generateRandomDocument, generateRandomUser } = require('./scripts/generate');

// Application imports
const { Database } = require('../src/database/database');
const { Types } = require('../src/models/types');
const { ResponseTypes } = require('../src/models/response');

// Test globals
const databasePath = './tests/data/app_test_database.db';

let bootstrapApp;
let dhtApp;
let testDatabase;

before(function (done) {
  this.timeout(5000);
  // Set Up Bootstrap app instance as a separate process (because it isnt a module yet)
  // Rather than using ipc messages, we could pass command line params...
  createBootstrapApp();

  // Set up DHT Bootstrap
  createDHTBootstrap();

  // wait for it to init
  setTimeout(() => {
    done();
  }, 2000);
});

after(() => {
  destroyBootstrapApp();
  destroyDHTBootstrap();
  try {
    fs.unlinkSync(databasePath);
  } catch {
    console.log('No test database to delete');
  }
  // It's not great but some of the tests can hang...
  // process.exit();
});

beforeEach(() => {

});

afterEach(() => {

});

describe('App Initialisation Tests', () => {
  it('should initialise the application without errors', function (done) {
    this.timeout(4000);
    const options = {
      port: 9091,
      interface: 'none',
      dbname: ':memory:',
      bootstrap: './tests/scripts/bootstrapTesting.json',
      name: 'Init Test Node',
    };

    const testApp = new TestApp();
    testApp.init(options);

    expect(testApp).to.be.an('object');
    const profile = testApp.client.getProfile();
    expect(profile).to.be.an('object');

    setTimeout(() => {
      testApp.shutdown();
      done();
    }, 1000);
  });

  it('should connect to bootstrap node', function (done) {
    this.timeout(4000);
    const options = {
      port: 9092,
      interface: 'none',
      dbname: ':memory:',
      bootstrap: './tests/scripts/bootstrapTesting.json',
      name: 'Bootstrap Test Node',
    };

    const testApp = new TestApp();
    testApp.init(options);

    expect(testApp).to.be.an('object');

    setTimeout(() => {
      const cache = testApp.client.getCache();
      expect(cache).to.be.a('Map');
      expect(cache.size).to.equal(1);

      const [value] = [...cache.values()];
      expect(value).to.be.an('object');
      expect(value.lastAddress).to.be.an('object');
      expect(value.lastAddress.port).to.equal(9090);

      testApp.shutdown();
      done();
    }, 3000);
  });
});

describe('App User Session Tests', () => {
  it('should create a new anon user account for headless mode', function (done) {
    this.timeout(3000);
    const options = {
      port: 9091,
      interface: 'none',
      dbname: ':memory:',
      name: 'UserNode1',
    };

    const testApp = new TestApp();
    testApp.init(options);

    // expect
    const profile = testApp.client.getProfile();
    expect(profile).to.be.an('object');
    expect(profile.type).to.equal('userProfile');
    expect(profile.userObject).to.be.an('object');
    expect(profile.userObject.type).to.equal('user');

    setTimeout(() => {
      testApp.shutdown();
      done();
    }, 1000);
  });

  it('should login an existing user account with the correct password', function (done) {
    this.timeout(3000);

    // inserting the test user profile into the database
    insertUserProfile();

    // logging in with the test user profile
    const options = {
      port: 9095,
      interface: 'none',
      dbname: databasePath,
      user: 'H1CtoVRCKP6c9bSLnGxnviqmiNqPJ2od46jD2it40aQ=',
      secret: 'password',
      name: 'UserNode2',
    };

    const testApp = new TestApp();
    testApp.init(options);

    setTimeout(() => {
      const profile = testApp.client.getProfile();
      expect(profile).to.be.an('object');
      expect(profile.type).to.equal('userProfile');
      expect(profile.key).to.equal('H1CtoVRCKP6c9bSLnGxnviqmiNqPJ2od46jD2it40aQ=');
      testApp.shutdown();
      done();
    }, 1000);
  });

  it('should not login an existing user account with the incorrect password', (done) => {
    const options = {
      port: 9096,
      interface: 'none',
      dbname: databasePath,
      user: 'H1CtoVRCKP6c9bSLnGxnviqmiNqPJ2od46jD2it40aQ=',
      secret: '1234',
      name: 'UserNode3',
    };

    const testApp = new TestApp();

    // This should throw an error, but it doesnt percolate up to here.
    // Something to do with async zalgo...
    testApp.init(options);
    // expect(() => testApp.init(options)).to.throw(Error);

    // However, this error is registered for some reason
    expect(() => testApp.cache.getProfile()).to.throw(Error);

    testApp.shutdown();
    done();
  });

  it('should not login a non-existent user account', (done) => {
    const options = {
      port: 9097,
      interface: 'none',
      dbname: databasePath,
      user: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdead',
      secret: 'passwordsaregood',
      name: 'UserNode3',
    };

    const testApp = new TestApp();

    // expect an error...
    // expect(() => testApp.init(options)).to.throw(Error);
    testApp.init(options);
    expect(() => testApp.cache.getProfile()).to.throw(Error);

    testApp.shutdown();
    done();
  });
});

describe('Client Put/Pub/New Item Tests', () => {
  it('should put a new document into the database', function (done) {
    this.timeout(2000);

    const options = {
      port: 9098,
      interface: 'none',
      dbname: ':memory:',
      bootstrap: './tests/scripts/bootstrapTesting.json',
      name: 'Put Test Node 1',
    };

    const testApp = new TestApp();
    testApp.init(options);

    expect(testApp).to.be.an('object');
    const profile = testApp.client.getProfile();
    expect(profile).to.be.an('object');
    const { key } = profile;

    const testDocument = generateRandomDocument();
    const response = testApp.client.putItem(testDocument);

    // console.log(response);
    expect(response).to.be.an('object');
    expect(response.responseType).to.equal(ResponseTypes.Success);
    expect(response.responseData).to.be.a('string');
    expect(response.responseData).to.equal(`Item ${testDocument.key} inserted into database.`);

    testApp.shutdown();
    setTimeout(() => {
      testApp.shutdown();
      done();
    }, 1000);
  });

  it('should publish a document to the network', async function () {
    this.timeout(3000);

    const options = {
      port: 9099,
      interface: 'none',
      dbname: ':memory:',
      bootstrap: './tests/scripts/bootstrapTesting.json',
      name: 'Put Test Node 2',
    };

    const testApp = new TestApp();
    testApp.init(options);

    expect(testApp).to.be.an('object');
    const profile = testApp.client.getProfile();
    expect(profile).to.be.an('object');
    const { key } = profile;

    const testDocument = generateRandomDocument();
    const response = await testApp.client.pubItem(testDocument);

    expect(response).to.be.an('array');
    expect(response.length).to.equal(3);

    response.forEach((item) => {
      expect(item).to.be.an('object');
      expect(item.responseType).to.equal(ResponseTypes.Success);
      expect(item.responseData).to.be.a('string');
    });

    testApp.shutdown();

    // setTimeout(() => {
    //   testApp.shutdown();
    // }, 1000);
  });

  it('should create a new document using newPost', async function () {
    this.timeout(3000);

    const options = {
      port: 9100,
      interface: 'none',
      dbname: ':memory:',
      bootstrap: './tests/scripts/bootstrapTesting.json',
      name: 'Put Test Node 3',
    };

    const testApp = new TestApp();
    testApp.init(options);

    expect(testApp).to.be.an('object');
    expect(testApp.client.getProfile()).to.be.an('object');

    const response = await testApp.client.createNewPost('Test Title', 'Test Content', ['test', 'content']);

    setTimeout(() => {
      // expect(response).to.not.be.undefined;
      expect(response).to.be.an('array');
      expect(response.length).to.equal(3);

      response.forEach((item) => {
        expect(item).to.be.an('object');
        expect(item.responseType).to.equal(ResponseTypes.Success);
        expect(item.responseData).to.be.a('string');
      });

      testApp.shutdown();
      testApp.shutdown();
      // done();
    }, 1000);
  });
});

describe('Client Get Item Tests', () => {
  it('should get a document from the database', async function () {
    this.timeout(3000);

    const options = {
      port: 9101,
      interface: 'none',
      dbname: ':memory:',
      bootstrap: './tests/scripts/bootstrapTesting.json',
      name: 'Get Test Node 1',
    };

    const testApp = new TestApp();
    testApp.init(options);

    expect(testApp).to.be.an('object');
    const profile = testApp.client.getProfile();
    expect(profile).to.be.an('object');
    // const { key } = profile;

    const testDocument = generateRandomDocument();
    const response = await testApp.client.pubItem(testDocument);

    expect(response).to.be.an('array');
    expect(response.length).to.equal(3);

    response.forEach((item) => {
      expect(item).to.be.an('object');
      expect(item.responseType).to.equal(ResponseTypes.Success);
      expect(item.responseData).to.be.a('string');
    });

    // get the document from the database
    const getItemResponse = await testApp.client.getItem(testDocument.key, Types.Document);

    expect(getItemResponse).to.be.an('object');
    expect(getItemResponse.responseType).to.equal(ResponseTypes.Success);
    expect(getItemResponse.responseData).to.be.an('object');
    expect(getItemResponse.responseData).to.deep.equal(testDocument);

    testApp.shutdown();
  });

  it('should get a document from the network', async function () {
    this.timeout(5000);

    const keys = await publishTestItems();
    expect(keys).to.be.an('array');
    expect(keys.length).to.equal(3);
    // console.log('keys:', keys);

    const options = {
      port: 9102,
      interface: 'none',
      dbname: ':memory:',
      bootstrap: './tests/scripts/bootstrapTesting.json',
      name: 'Get Test Node 2',
    };

    const testApp = new TestApp();
    testApp.init(options);

    expect(testApp).to.be.an('object');
    const profile = testApp.client.getProfile();
    expect(profile).to.be.an('object');

    // const response = await testApp.client.getItem(keys[0], Types.Document);
    // console.log('response1 :', response);
    const promises = keys.map((key) => testApp.client.getItem(key, Types.Document));

    const responses = await Promise.all(promises);

    responses.forEach((response) => {
      expect(response).to.be.an('object');
      expect(response.responseType).to.equal(ResponseTypes.Success);
      expect(response.responseData).to.be.an('object');
      expect(keys).to.contain(response.responseData.key);
      keys.splice(keys.indexOf(response.responseData.key), 1);
    });

    expect(keys.length).to.equal(0);
    testApp.shutdown();
  });

  it('should fail to get an invalid request', async function () {
    // this.timeout(5000);

    const keys = await publishTestItems();
    expect(keys).to.be.an('array');
    expect(keys.length).to.equal(3);
    // console.log('keys:', keys);

    const options = {
      port: 9103,
      interface: 'none',
      dbname: ':memory:',
      bootstrap: './tests/scripts/bootstrapTesting.json',
      name: 'Get Test Node 3',
    };

    const testApp = new TestApp();
    testApp.init(options);

    expect(testApp).to.be.an('object');
    const profile = testApp.client.getProfile();
    expect(profile).to.be.an('object');

    // Invalid Key
    let response = await testApp.client.getItem('Invalid Key', Types.Document);
    expect(response).to.be.an('object');
    expect(response.responseType).to.equal(ResponseTypes.Error);
    expect(response.responseData).to.equal('Invalid key format.');

    // Invalid Type
    response = await testApp.client.getItem('WY5WipcOJZAc8GBNnSgg4sf9Ps4rHkaGZ2IT/gV9V/4=', 'Invalid Type');
    expect(response).to.be.an('object');
    expect(response.responseType).to.equal(ResponseTypes.Error);
    expect(response.responseData).to.equal('Invalid item type.');

    // Missing Key
    response = await testApp.client.getItem(null, Types.Document);
    expect(response).to.be.an('object');
    expect(response.responseType).to.equal(ResponseTypes.Error);
    expect(response.responseData).to.equal('Invalid request, missing parameters.');

    // Missing Type
    response = await testApp.client.getItem('WY5WipcOJZAc8GBNnSgg4sf9Ps4rHkaGZ2IT/gV9V/4=');
    expect(response).to.be.an('object');
    expect(response.responseType).to.equal(ResponseTypes.Error);
    expect(response.responseData).to.equal('Invalid request, missing parameters.');

    testApp.shutdown();
  });

  it('should fail to get a document not on the network', async function () {
    this.timeout(5000);

    const options = {
      port: 9104,
      interface: 'none',
      dbname: ':memory:',
      bootstrap: './tests/scripts/bootstrapTesting.json',
      name: 'Get Test Node 4',
    };

    const testApp = new TestApp();
    testApp.init(options);

    expect(testApp).to.be.an('object');
    const profile = testApp.client.getProfile();
    expect(profile).to.be.an('object');

    const document = generateRandomDocument();

    const response = await testApp.client.getItem(document.key, Types.Document);
    expect(response).to.be.an('object');
    expect(response.responseType).to.equal(ResponseTypes.Error);
    expect(response.responseData).to.equal('Item not found in database, cache or DHT.');

    testApp.shutdown();
  });
});

describe('Client Follow/Unfollow Tests', () => {
  let testApp;

  before(() => {
    const options = {
      port: 9105,
      interface: 'none',
      dbname: ':memory:',
      bootstrap: './tests/scripts/bootstrapTesting.json',
      name: 'Follow Test Node 1',
    };

    testApp = new TestApp();
    testApp.init(options);
  });

  it('should allow following a user', function () {
    let profile = testApp.client.getProfile();
    expect(profile).to.be.an('object');
    expect(profile.following.length).to.equal(0);

    const newUser = generateRandomUser();
    const { key } = newUser;

    const response = testApp.client.followUser(key);
    expect(response).to.be.an('array');
    expect(response.length).to.equal(1);

    profile = testApp.client.getProfile();
    expect(profile).to.be.an('object');
    expect(profile.following.length).to.equal(1);
  });

  it('should allow unfollowing a user', function () {
    let profile = testApp.client.getProfile();
    expect(profile).to.be.an('object');
    expect(profile.following.length).to.equal(1);

    const key = profile.following[0];
    const response = testApp.client.unfollowUser(key);
    expect(response).to.be.an('array');
    expect(response.length).to.equal(0);
    profile = testApp.client.getProfile();
    expect(profile).to.be.an('object');
    expect(profile.following.length).to.equal(0);
  });

  it('should not allow following a user twice', function () {
    let profile = testApp.client.getProfile();
    expect(profile).to.be.an('object');
    expect(profile.following.length).to.equal(0);

    const newUser = generateRandomUser();
    const { key } = newUser;

    let response = testApp.client.followUser(key);
    expect(response).to.be.an('array');
    expect(response.length).to.equal(1);

    profile = testApp.client.getProfile();
    expect(profile).to.be.an('object');
    expect(profile.following.length).to.equal(1);

    response = testApp.client.followUser(key);
    expect(response).to.be.an('array');
    expect(response.length).to.equal(1);

    profile = testApp.client.getProfile();
    expect(profile).to.be.an('object');
    expect(profile.following.length).to.equal(1);
  });

  it('should not allow following an invalid user key', function () {
    let profile = testApp.client.getProfile();
    expect(profile).to.be.an('object');
    expect(profile.following.length).to.equal(1);

    const key = 'Invalid Key';
    const response = testApp.client.followUser(key);
    expect(response).to.be.an('array');
    expect(response.length).to.equal(1);

    profile = testApp.client.getProfile();
    expect(profile).to.be.an('object');
    expect(profile.following.length).to.equal(1);
  });

  it('should not allow unfollowing an invalid user key', function () {
    let profile = testApp.client.getProfile();
    expect(profile).to.be.an('object');
    expect(profile.following.length).to.equal(1);

    const key = 'Invalid Key';
    const response = testApp.client.unfollowUser(key);
    expect(response).to.be.an('array');
    expect(response.length).to.equal(1);

    profile = testApp.client.getProfile();
    expect(profile).to.be.an('object');
    expect(profile.following.length).to.equal(1);
  });

  it('should not error unfollowing a valid but non-followed user', function () {
    let profile = testApp.client.getProfile();
    expect(profile).to.be.an('object');
    expect(profile.following.length).to.equal(1);

    const newUser = generateRandomUser();
    const { key } = newUser;

    const response = testApp.client.unfollowUser(key);
    expect(response).to.be.an('array');
    expect(response.length).to.equal(1);

    profile = testApp.client.getProfile();
    expect(profile).to.be.an('object');
    expect(profile.following.length).to.equal(1);
  });

  it('should not allow following a null user key', function () {
    let profile = testApp.client.getProfile();
    expect(profile).to.be.an('object');
    expect(profile.following.length).to.equal(1);

    const response = testApp.client.followUser(null);
    expect(response).to.be.an('array');
    expect(response.length).to.equal(1);

    profile = testApp.client.getProfile();
    expect(profile).to.be.an('object');
    expect(profile.following.length).to.equal(1);
  });

  it('should not allow unfollowing a null user key', function () {
    let profile = testApp.client.getProfile();
    expect(profile).to.be.an('object');
    expect(profile.following.length).to.equal(1);

    const response = testApp.client.unfollowUser(null);
    expect(response).to.be.an('array');
    expect(response.length).to.equal(1);

    profile = testApp.client.getProfile();
    expect(profile).to.be.an('object');
    expect(profile.following.length).to.equal(1);
  });

  after(() => {
    testApp.shutdown();
  });
});

describe('Client Get Followed Items Tests', () => {
  const keys = [];

  before(async () => {
    // create a new user profile
    const options = [];

    // A user which saves documents to the database only
    options.push({
      port: 9101,
      interface: 'none',
      dbname: 'tests/data/app_test_database.db',
      bootstrap: './tests/scripts/bootstrapTesting.json',
      name: 'Get Followed Items Test Node 1',
      noDHT: true, // not yet implemented
    });

    // A user which sends to cache only
    options.push({
      port: 9102,
      interface: 'none',
      dbname: ':memory:',
      bootstrap: './tests/scripts/bootstrapTesting.json',
      name: 'Get Followed Items Test Node 2',
      noDHT: true, // not yet implemented
    });

    // A user which only sends to dht
    options.push({
      port: 9103,
      interface: 'none',
      dbname: ':memory:',
      name: 'Get Followed Items Test Node 3',
    });

    let app = new TestApp();
    app.init(options[0]);
    app.client.createNewPost('Post One', 'Content One', ['test', 'content']);
    await app.client.createNewPost('Post Two', 'Content Two', ['test', 'content']);
    keys.push(app.client.getProfile().userObject.key);
    app.shutdown();

    app = new TestApp();
    app.init(options[1]);
    await app.client.createNewPost('Post Three', 'Content Three', ['test', 'content']);
    await app.client.createNewPost('Post Four', 'Content Four', ['test', 'content']);
    keys.push(app.client.getProfile().userObject.key);
    app.shutdown();

    app = new TestApp();
    app.init(options[2]);
    await app.client.createNewPost('Post Five', 'Content Five', ['test', 'content']);
    await app.client.createNewPost('Post Six', 'Content Six', ['test', 'content']);
    keys.push(app.client.getProfile().userObject.key);
    app.shutdown();
  });

  it('should get followed items from the database', async function () {
    this.timeout(5000);

    const followOptions = {
      port: 9104,
      interface: 'none',
      dbname: './tests/data/app_test_database.db',
      bootstrap: './tests/scripts/bootstrapTesting.json',
      name: 'Get Followed Items Test Node 4',
    };

    const testApp = new TestApp();
    testApp.init(followOptions);

    keys.forEach((key) => {
      testApp.client.followUser(key);
    });

    // console.log('testApp:', testApp);

    const profile = await testApp.client.getProfile();
    expect(profile).to.be.an('object');
    expect(profile.following.length).to.equal(3);

    const response = await testApp.client.getFollowedDocuments();
    expect(response).to.be.an('array');
    expect(response.length).to.equal(6);

    response.forEach((item) => {
      expect(item).to.be.an('object');
      expect(item.type).to.equal(Types.Document);
    });

    testApp.shutdown();
  });

  it('should get followed items from the cache', async function () {
    const followOptions = {
      port: 9105,
      interface: 'none',
      dbname: ':memory:',
      bootstrap: './tests/scripts/bootstrapTesting.json',
      name: 'Get Followed Items Test Node 5',
    };

    const testApp = new TestApp();
    testApp.init(followOptions);

    keys.forEach((key) => {
      testApp.client.followUser(key);
    });

    const response = await testApp.client.getFollowedDocuments();
    expect(response).to.be.an('array');
    expect(response.length).to.equal(6);

    testApp.shutdown();
  });

  it('should get followed items from the dht', async function () {
    const followOptions = {
      port: 9106,
      interface: 'none',
      dbname: ':memory:',
      name: 'Get Followed Items Test Node 6',
    };

    const testApp = new TestApp();
    testApp.init(followOptions);

    keys.forEach((key) => {
      testApp.client.followUser(key);
    });

    const response = await testApp.client.getFollowedDocuments();
    expect(response).to.be.an('array');
    expect(response.length).to.equal(6);

    testApp.shutdown();
  });

  after(() => {
  });
});

/* ------------------------ helper functions ------------------------ */

function createBootstrapApp() {
  const commandOptions = ['-p9090', '-inone', '-db:memory:'];
  bootstrapApp = fork('./bin/psddn.js', commandOptions);

  bootstrapApp.on('message', (msg) => {
    console.log('Message from bootstrap app: ', msg);
  });

  bootstrapApp.on('error', (err) => {
    console.log('Error from bootstrap app: ', err);
  });

  bootstrapApp.on('exit', (code, signal) => {
    console.log('Bootstrap app exited with code: ', code, ' and signal: ', signal);
  });
}

function destroyBootstrapApp() {
  bootstrapApp.kill();
}

function createDHTBootstrap() {
  const commandOptions = ['-ltests/data/dht.log']; // '-ltests/data/dhtlog'
  dhtApp = fork('./tests/scripts/testDHTnet.js', commandOptions);
  // TODO
}

function destroyDHTBootstrap() {
  dhtApp.kill();
  // TODO
}

// A function to insert a test user profile into the database, so that we can test logging in
function insertUserProfile() {
  const testUserProfile = {
    type: 'userProfile',
    key: 'H1CtoVRCKP6c9bSLnGxnviqmiNqPJ2od46jD2it40aQ=',
    secretKey: '{"encryptedData":"tKYtQYwaxu+AfUH+WEwnSP7ZpgKkIzBgt8yEUKZgKyewSxurv8Oy1h9H2K98az34ERfyT3VOX6E+IwkMzVtVJLknk6GjCVw2lYizixXGsZhLC82GnWRrAw==","tag":"RNuRUnprQjpaI/EydNE6ZQ==","salt":"nFH6lczRhWijRd2QnyMZ+w==","iv":"CworwBTaHd5q9PAo"}',
    userObject: {
      type: 'user',
      key: 'H1CtoVRCKP6c9bSLnGxnviqmiNqPJ2od46jD2it40aQ=',
      nickname: 'testUser',
      lastAddress: null,
      lastSeen: '2023-09-25T08:46:19.812Z',
      lastFeed: null,
    },
    following: [],
  };

  testDatabase = new Database(databasePath);
  try {
    testDatabase.put(testUserProfile);
    testDatabase.put(testUserProfile.userObject);
  } catch (err) {
    console.log(err);
  }
  testDatabase.closeDatabaseConnection();
}

// A function to publish a test document to the network
async function publishTestItems() {
  const options = {
    port: 9000,
    interface: 'none',
    dbname: ':memory:',
    bootstrap: './tests/scripts/bootstrapTesting.json',
    name: 'PublishNode',
  };

  const testApp = new TestApp();
  testApp.init(options);

  let response = await testApp.client.createNewPost('Test Document 1', 'Content of the first test document', ['test', 'content', 'one']);
  verifyResponse(response);

  response = await testApp.client.createNewPost('Test Document 2', 'Content of the second test document', ['test', 'content', 'two']);
  verifyResponse(response);

  response = await testApp.client.createNewPost('Test Document 3', 'Content of the third test document', ['test', 'content', 'three']);
  verifyResponse(response);

  // get the keys of the three documents
  const feedKey = testApp.client.getProfile().userObject.lastFeed;
  // console.log('feedKey:', feedKey);
  const feed = await testApp.client.getItem(feedKey, Types.Feed);
  // console.log('feed:', feed);
  testApp.shutdown();

  return feed.responseData.items;
}

function verifyResponse(response) {
  expect(response).to.be.an('array');
  expect(response.length).to.equal(3);

  response.forEach((item) => {
    expect(item).to.be.an('object');
    expect(item.responseType).to.equal(ResponseTypes.Success);
    expect(item.responseData).to.be.a('string');
  });

  return true;
}
// kill the bootstraps on exit, otherwise it will hang on failed tests
process.on('exit', () => {
  console.log('Tests exit. Killing bootstrap app...');
  destroyBootstrapApp();
  destroyDHTBootstrap();
  try {
    fs.unlinkSync(databasePath);
  } catch {
    console.log('No test database to delete');
  }
});
