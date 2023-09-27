#!/usr/bin/env node

/**
 * Main entry point for application testing
 *
 * TODO:!!
 * Works fine but should refactor so that it optionally accept command line params so we can
 * set up a bootstrap node without needing to send a ipc message.
 */

const createDatabaseInstance = require('../src/database/dbInstance');

const client = require('../src/client');
const cache = require('../src/network/cache');
const dht = require('../src/network/dht');

const server = require('../src/server/server');
const ui = require('../src/ui');
// const shutdown = require('../src/utils/shutdown');

/**
 * @description TestApp class, used to initialise an application instance for testing.
 * @class TestApp
 * @property {string} name The name of the application instance
 */
class TestApp {
  name;

  constructor() {
    this.client = client;
    this.cache = cache;
    this.server = server;
    this.dht = dht;
    this.ui = ui;
  }

  /**
   * @description Initialise the application instance.
   * @param {object} options The options to initialise the application with
   * @param {string} options.name The name of the application instance (optional)
   * @param {string} options.dbname The database path (optional, default is :memory:)
   * @param {string} options.bootstrap The bootstrap peers file (./path/to/bootstrap.json)
   * @param {string} options.interface The user interface to use (none, web, terminal)
   * @param {string} options.user The user key to login with (optional)
   * @param {string} options.secret The user password to login with (optional)
   * @param {number} options.port The port of the server (optional, default is 8080)
   * @returns {void}
   */

  async init(options) {
    this.name = options.name;

    const dbInstance = createDatabaseInstance(options.dbname || ':memory:');
    this.client.initClient(dbInstance);
    this.server.initServer(dbInstance);
    this.dht.initDHT(dbInstance);

    // UI and Session
    await this.ui.startUI(options.interface || 'none', options.user, options.secret);

    // Server
    this.server.startServer(options.port || 8080);

    // Cache
    this.cache.initCache(dbInstance);
    await this.cache.startCache(options.bootstrap, options.port || 8080);

    return this;
  }

  /**
   * @description Shutdown the application instance "cleanly".
   * Doesn't exit the process as this is handled by the test runner.
   * @returns {void}
   */
  shutdown() {
    this.cache.shutdownCache();
    this.server.shutdownServer();
    this.client.shutdownClient();
    this.dht.shutdownDHT();
  }
}

module.exports = { TestApp };
