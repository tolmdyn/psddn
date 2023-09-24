#!/usr/bin/env node

/**
 * Main entry point for application testing
 *
 * TODO:!!
 *
 * Refactor so that it optionally accept command line params so we can set up a bootstrap node
 * without needing to send a ipc message. If no command line params are given, then it should
 * do nothing until an instance is created.
 */

// consider importing these in a separate file.
const createDatabaseInstance = require('../src/database/dbInstance');

const client = require('../src/client');
const cache = require('../src/network/cache');
const dht = require('../src/network/dht');

const server = require('../src/server/server');
const ui = require('../src/ui');
const shutdown = require('../src/utils/shutdown');

// Start UI, then Server, then Cache, to prevent null session
// initialise(options.interface, options.dbname, options.port, options.bootstrap);
// initialise(commandOptions);

// const options = {
//   port: 8090, interface: 'term', dbname: ':memory:', bootstrap: '.tests/scripts/bootstrap.json',
// };

// initialise(options);

/*

  let options = { port:8090, interface:'term', dbname:':memory:'}

  Options:

  options.port
  options.dbname
  options.bootstrap
  options.interface
  options.user
  options.secret
*/

class TestApp {
  constructor() {
    this.client = client;
    this.cache = cache;
    this.server = server;
    this.dht = dht;
    this.ui = ui;

    process.on('message', (msg) => {
      // console.log('Message from parent:', msg);
      process.send('Message received');
      if (msg.function === 'init') {
        process.send('Initialising...');
        this.init(msg.parameters);
      }
      if (msg.function === 'shutdown') {
        process.send('Shutting down');
        shutdown();
      }
    });
  }

  init(options) {
    // process.send('Initialising');
    this.name = options.name;

    const dbInstance = createDatabaseInstance(options.dbname);
    this.client.initClient(dbInstance);
    this.server.initServer(dbInstance);
    this.dht.initDHT(dbInstance);

    // UI and Session
    this.ui.startUI(options.interface || 'none', options.user, options.secret);

    // Server
    this.server.startServer(options.port || 8080);

    // Cache
    this.cache.initCache(dbInstance);
    this.cache.startCache(options.bootstrap, options.port || 8080);

    // this.client.handshakePeer('127.0.0.1', '9090');
    console.log(`${this.name} Initialised`);
  }

  shutdown() {
    console.log(`${this.name} Shutting Down`);
    // cache.announceDisconnect();
    this.cache.shutdownCache();
    this.server.shutdownServer();
    this.client.shutdownClient();
    this.dht.shutdownDHT();
    // process.exit(0);
  }
}

const app = new TestApp();

module.exports = { TestApp };
