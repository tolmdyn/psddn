/**
 * @fileoverview Providers module.
 * @description This module is responsible for finding the address of a provider of specific items
 * Either on the local cached peers or on the DHT network.
 */

const debug = require('debug')('routing');

const cache = require('./cache');
// const Address = require('../models/address');

async function getProviders(key, type) {
  debug(`Getting providers for key: ${key} and type: ${type}`);
  // TODO:
  // - search local db for providers
  // - if found return providers
  // - else search dht for providers
  // - if found return providers
  // - else return null?

  // CACHE PROVIDERS
  const providers = cache.getProviders(key, type);
  // .add([
  //  { ip: '127.0.0.1', port: 8080 },
  // { ip: '127.0.0.1', port: 8081 },
  // { ip: '127.0.0.1', port: 8082 }]);

  // DHT PROVIDERS

  // return dummy providers
  return providers;
}

module.exports = {
  getProviders,
};
