#! /usr/bin/env node

require('../src/database/dbInstance'); // Does this need to be here?
require('../src/server/server');

const client = require('../src/client/client');
const cache = require('../src/network/cache');

module.exports = {
  client,
  cache,
};
