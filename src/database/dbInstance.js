const { Database } = require('./database');

// module.exports = new Database();

module.exports = (dbPath) => new Database(dbPath);
