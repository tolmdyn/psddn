/**
 * @description Database instance. This is used to prevent circular dependencies
 * and create a singleton database instance while using a runtime database path.
 * If anyone reading can think of a better way to this then please let me know!
 */

const { Database } = require('./database');

module.exports = (dbPath) => new Database(dbPath);
