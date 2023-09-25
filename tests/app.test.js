/* eslint-disable func-names */
/**
 * @description Tests for the main application
 */
const fs = require('fs');
const { fork } = require('child_process');
const { expect } = require('chai');

const { TestApp, app } = require('./testApp');

const { Database } = require('../src/database/database');
const { Types } = require('../src/models/types');

const databasePath = './tests/data/app_test_database.db';

let bootstrapApp;
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
  bootstrapApp.send({ function: 'shutdown' });
  bootstrapApp.kill();

  try {
    fs.unlinkSync(databasePath);
  } catch {
    console.log('No test database to delete');
  }
});

beforeEach(() => {

});

afterEach(() => {

});

describe('App Initialisation Tests', () => {
  it('should initialise the application without errors', function (done) {
    this.timeout(5000);
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
    this.timeout(5000);
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
      port: 9091,
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

  it('should not login an existing user account with the incorrect password', () => {
    const options = {
      port: 9092,
      interface: 'none',
      dbname: databasePath,
      user: 'H1CtoVRCKP6c9bSLnGxnviqmiNqPJ2od46jD2it40aQ=',
      secret: '1234',
      name: 'UserNode3',
    };

    const testApp = new TestApp();
    // expect an error...
    expect(() => testApp.init(options)).to.throw(Error);

    testApp.shutdown();
  });

  it('should not login a non-existent user account', () => {
    const options = {
      port: 9092,
      interface: 'none',
      dbname: databasePath,
      user: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdead',
      secret: 'passwordsaregood',
      name: 'UserNode3',
    };

    const testApp = new TestApp();

    // expect an error...
    expect(() => testApp.init(options)).to.throw(Error);

    testApp.shutdown();
  });
});

describe('Client Put/Pub/New Item Tests', () => {
  it('should put a new document into the database', function (done) {
  });

  it('should publish a document to the network', function (done) {
  });

  it('should create a new document', function (done) {
  });
});
/*
  TODO
  Test:
  -new documents
  -getting items
  -following users
  -getting followed documents
*/

/* ------------------------ helper functions ------------------------ */

function createBootstrapApp() {
  bootstrapApp = fork('./tests/testApp.js');

  bootstrapApp.on('message', (msg) => {
    console.log('Message from bootstrap app: ', msg);
  });

  bootstrapApp.on('error', (err) => {
    console.log('Error from bootstrap app: ', err);
  });

  bootstrapApp.on('exit', (code, signal) => {
    console.log('Bootstrap app exited with code: ', code, ' and signal: ', signal);
  });

  const options = {
    port: 9090, interface: 'none', dbname: ':memory:', name: 'Bootstrap Node',
  };

  bootstrapApp.send({ function: 'init', parameters: options });
}

function createDHTBootstrap() {
  // TODO
}

function insertUserProfile() {
  // inserting the test user profile into the database
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

// kill the bootstrap app on exit
process.on('exit', () => {
  console.log('Tests exit. Killing bootstrap app...');
  bootstrapApp.send({ function: 'shutdown' });
  bootstrapApp.kill();
});
