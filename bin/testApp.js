const { program } = require('commander');

const client = require('../src/client/client');
const cache = require('../src/network/cache');
const server = require('../src/server/server');

const createDatabaseInstance = require('../src/database/dbInstance');
require('../src/utils/shutdown');

const { startUI } = require('../src/ui');

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

// Database Inits
const dbInstance = createDatabaseInstance(dbName);
client.initClient(dbInstance);
server.initServer(dbInstance);

// Start UI, then Server, then Cache, to prevent null session
initialise(UIType, dbInstance, port, bootstrapFilepath);

async function initialise(initUI, initDbInstance, initPort, initBootstrapFilepath) {
  // UI and Session - (cleanup!)
  if (!initUI) {
    await client.loginNewUser();
    console.log('Headless mode - created dummy user session');
  } else {
    console.log('Starting UI:', initUI);
    await startUI(initUI);
  }

  // Server
  await server.startServer(initPort);

  // Cache
  await cache.initCache(initDbInstance);
  await cache.startCache(initBootstrapFilepath, port); // add bootstrap peers, start timer, etc
}
