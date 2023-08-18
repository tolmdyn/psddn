const { program } = require('commander');

// require('../src/database/dbInstance'); // Does this need to be here?

const client = require('../src/client/client');
const cache = require('../src/network/cache');
const server = require('../src/server/server');

const createDatabaseInstance = require('../src/database/dbInstance');
require('../src/utils/shutdown');

const { startUI } = require('../src/ui');

// Accept a JSON bootstrap peers file on cmd line, and parse it
// const { bootstrapPeers } = require('../src/utils/bootstrap');

/* parse command line args */
program
  .option('-a, --address <address>', 'Specify the IP address of the server') // useless as its always 127.0.0.1 :/
  .option('-p, --port <port>', 'Specify the port of the server', parseInt)
  .option('-db, --dbname <dbname>', 'Specify the name of the database instance')
  .option('-b, --bootstrap <bootstrap>', 'Specify the bootstrap peers file')
  .option('-i, --interface <interface>', 'Choose the user interface to use (none, web, terminal)');

program.parse(process.argv);
const options = program.opts();

const port = options.port || 8080;
const dbName = options.dbname || null;
const bootstrapFilepath = options.bootstrap || null;
const UIType = options.interface || null;

// Database
const dbInstance = createDatabaseInstance(dbName);
client.initClient(dbInstance);
server.initServer(dbInstance);

initialise(UIType, dbInstance, port, bootstrapFilepath);

async function initialise(initUI, initDbInstance, initPort, initBootstrapFilepath) {
  // Interface and Session - (cleanup!)
  if (!initUI) {
    await client.loginNewUser();
    console.log('Headless mode - created dummy user session');
  } else {
    console.log('Starting UI:', initUI);
    await startUI(initUI);
  }
  // Client
  // await client.initClient(initDbInstance);

  // Server
  // await server.initServer(initDbInstance);
  await server.startServer(initPort);

  // Cache
  await cache.initCache(initDbInstance);
  await cache.startCache(initBootstrapFilepath, port); // add bootstrap peers, start timer, etc
}

/* start interface */
// startUI(UIType);

/* init instances */
// client.initClient(dbInstance);
// authenticate client usersession

// server.initServer(dbInstance);
// server.startServer(port);

// cache.initCache(dbInstance);
// cache.startCache(bootstrapFilepath, port); // add bootstrap peers, start timer, etc

// module.exports = {
//   client,
//   cache,
// };
