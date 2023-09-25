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
// const shutdown = require('../src/utils/shutdown');

class TestApp {
  constructor() {
    this.client = client;
    this.cache = cache;
    this.server = server;
    this.dht = dht;
    this.ui = ui;
  }

  init(options) {
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
  }

  shutdown() {
    this.cache.shutdownCache();
    this.server.shutdownServer();
    this.client.shutdownClient();
    this.dht.shutdownDHT();
    // process.exit(0);
  }
}

let app;

process.on('message', (msg) => {
  if (msg.function === 'init') {
    process.send('Initialising...');
    app = new TestApp();
    app.init(msg.parameters);
  }
  if (msg.function === 'shutdown') {
    process.send('Shutting down');
    app.shutdown();
  }
});

module.exports = { TestApp };
