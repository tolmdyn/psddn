/**
 * @fileoverview Contains the database instance for client module
 * Imported by client, feed, etc.
 */

const feed = require('./feed');
const userProfile = require('./userProfile');
const get = require('./get');
const putPub = require('./putPub');

let db = null;

/**
 * @function initDb
 * @description Initialise the database instance for the client module
 * @param {*} dbInstance The database instance to use
 */
function initDb(dbInstance) {
  db = dbInstance;
  feed.setDb(db);
  userProfile.setDb(db);
  get.setDb(db);
  putPub.setDb(db);
}

module.exports = { initDb };
