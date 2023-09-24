/**
 * @description Tests for the main application
 */
const { fork } = require('child_process');
const { expect } = require('chai');

const { TestApp } = require('./testApp');

let bootstrapApp;

before(function (done) {
  this.timeout(5000);
  // Code to run before all tests in this test suite
  // Set Up Bootstrap app instance
  // Rather than using messages, we could pass command line params...
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

  // wait for it to init
  setTimeout(() => {
    done();
  }, 2000);
});

after(() => {
  bootstrapApp.send({ function: 'shutdown' });
  bootstrapApp.kill();
});

beforeEach(() => {

});

afterEach(() => {

});

describe('App Initialisation Tests', () => {
  it('should initialise the application without errors', function (done) {
    this.timeout(5000);
    const options = {
      port: 9091, interface: 'none', dbname: ':memory:', bootstrap: './tests/scripts/bootstrapTesting.json', name: 'Init Test Node',
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
      port: 9092, interface: 'none', dbname: ':memory:', bootstrap: './tests/scripts/bootstrapTesting.json', name: 'Bootstrap Test Node',
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
  // create a new account, exit, then log in again?
});

/*
  TODO
  Test:
  -new documents
  -getting items
  -following users
  -getting followed documents
*/

// kill the bootstrap app on exit
process.on('exit', () => {
  console.log('Unexpected exit. Killing bootstrap app...');
  bootstrapApp.send({ function: 'shutdown' });
  bootstrapApp.kill();
});
