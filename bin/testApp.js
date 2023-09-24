#!/usr/bin/env node

/**
 * Main entry point for the application.
 */

const { program } = require('commander');

// consider importing these in a separate file.
const createDatabaseInstance = require('../src/database/dbInstance');

const client = require('../src/client');
const cache = require('../src/network/cache');
const dht = require('../src/network/dht');

const server = require('../src/server/server');
const ui = require('../src/ui');
require('../src/utils/shutdown');

/* parse command line args */
// const commandOptions = parseOptions();

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

async function initialise(options) {
  // if (!options) {
  //   options = { port: 8090, interface: 'none', dbname: ':memory:' };
  // }

  const dbInstance = createDatabaseInstance(options.dbname);
  client.initClient(dbInstance);
  server.initServer(dbInstance);
  await dht.initDHT(dbInstance);

  // UI and Session
  await ui.startUI(options.interface || 'none', options.user, options.secret);

  // Server
  server.startServer(options.port || 8080);

  // Cache
  cache.initCache(dbInstance);
  await cache.startCache(options.bootstrap, options.port || 8080);
}

function parseOptions() {
  program
    .option('-a, --address <address>', 'Specify the IP address of the server') // it's always 127.0.0.1 :/
    .option('-p, --port <port>', 'Specify the port of the server', parseInt)
    .option('-db, --dbname <dbname>', 'Specify the name of the database instance')
    .option('-b, --bootstrap <bootstrap>', 'Specify the bootstrap peers file')
    .option('-i, --interface <interface>', 'Choose the user interface to use (none, web, terminal)')
    .option('-d, --debug', 'Enable debug mode') // not yet implemented, on by default
    .option('-u, --user <user>', 'Specify the user key to login with')
    .option('-s, --secret <secret>', 'Specify the user password to login with')
    .option('-e, --ephemeral', 'Specify whether to create an ephemeral instance');

  program.parse(process.argv);
  return program.opts();
}

module.exports = { initialise, client };
