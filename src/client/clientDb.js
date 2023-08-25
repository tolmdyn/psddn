/**
 * @fileoverview Contains the database instance for client module
 * Imported by client, feed, etc.
 */

const feed = require('./feed');
const userProfile = require('./userProfile');

let db = null;

function initDb(dbInstance) {
  db = dbInstance;
  feed.setDb(db);
  userProfile.setDb(db);
}

module.exports = { initDb };
