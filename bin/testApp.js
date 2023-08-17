const { program } = require('commander');

// require('../src/database/dbInstance'); // Does this need to be here?

const client = require('../src/client/client');
const cache = require('../src/network/cache');
const server = require('../src/server/server');

const createDatabaseInstance = require('../src/database/dbInstance');
const shutdown = require('../src/utils/shutdown');

// Accept a JSON bootstrap peers file on cmd line, and parse it
// const { bootstrapPeers } = require('../src/utils/bootstrap');

/* parse command line args */
program
  .option('-a, --address <address>', 'Specify the IP address of the server') // useless as its always 127.0.0.1 :/
  .option('-p, --port <port>', 'Specify the port of the server', parseInt)
  .option('-db, --dbname <dbname>', 'Specify the name of the database instance')
  .option('-b, --bootstrap <bootstrap>', 'Specify the bootstrap peers file');

program.parse(process.argv);
const options = program.opts();

const port = options.port || 8080;
const dbName = options.dbname || null;
const bootstrapFilepath = options.bootstrap || null;

/* init database */
const dbInstance = createDatabaseInstance(dbName);

/* init instances */
client.initClient(dbInstance);
// authenticate client usersession

server.initServer(dbInstance);
server.startServer(port);

cache.initCache(dbInstance);
cache.startCache(bootstrapFilepath, port); // add bootstrap peers, start timer, etc

/* start interface */

module.exports = {
  client,
  cache,
};