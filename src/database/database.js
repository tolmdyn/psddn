/**
* @description: This file provides the database wrapper class and functions.
*
*/

const SqliteDatabase = require('better-sqlite3');
const debug = require('debug')('database');
/**
* @description: Represents the type of an item in the database.
*/
const Types = {
  Feed: 'feed',
  User: 'user',
  Document: 'document',
};

// const { Feed, User, Document } = Types;

function isValidItemType(type) {
  return Object.values(Types).includes(type);
}

// const databasepath = path.join(__dirname, './../../data/database.db');

class Database {
  #db;

  // If no path is provided, then the database is created in memory
  constructor(dbPath) {
    // Open database
    // this.#db = this.openDatabaseConnection(dbPath);
    this.#openDatabaseConnection(dbPath);

    // Check if this.db doesnt have the right tables... create them
    if (!this.#databaseHasTables()) {
      this.#createTables();
    }
  }

  /**
  * @description: Open database connection, creates one if it doesn't exist
  * @return {Database} Database connection
  * @throws {Error} Error opening database
  */
  #openDatabaseConnection(dbPath) {
    debug('PATH:', dbPath);
    try {
      this.#db = new SqliteDatabase(dbPath, { verbose: debug });
      debug('Database opened successfully.');
    } catch (error) {
      console.error(error);
    }
  }

  closeDatabaseConnection() {
    this.#db.close();
  }

  /**
   * @description: Checks if the database has the right tables
   * @return {boolean} True if the database has the right tables, false otherwise
   */
  #databaseHasTables() {
    // Check if this.db doesnt have the right tables... create them
    const result = this.#db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name IN ('feed', 'document', 'user');").all();

    // result must have the three table names in it
    if (result.length === 3) {
      return true;
    }
    return false;
  }

  /**
   * @description: Creates the tables for the database
   * @return {void}
   */
  #createTables() {
    this.#db.prepare(`
        CREATE TABLE "document" (
          "id" INTEGER UNIQUE,
          "key" TEXT NOT NULL UNIQUE,
          "json_data" JSON NOT NULL,
          PRIMARY KEY("id" AUTOINCREMENT)
        );
      `).run();

    this.#db.prepare(`
        CREATE TABLE "feed" (
         "id" INTEGER UNIQUE,
          "key" TEXT NOT NULL UNIQUE,
          "json_data" JSON NOT NULL,
          PRIMARY KEY("id" AUTOINCREMENT)
        );
      `).run();

    this.#db.prepare(`
        CREATE TABLE "user" (
         "id" INTEGER UNIQUE,
         "key" TEXT NOT NULL UNIQUE,
         "json_data" JSON NOT NULL,
         PRIMARY KEY("id" AUTOINCREMENT)
        );
      `).run();

    debug('Tables created successfully.');

    if (!this.#databaseHasTables()) {
      throw new Error('Unable to create tables.');
    }
  }

  /**
 * @description: Get item from database
 * @param {string} key - Key (hash/id) of item to get
 * @param {string} type - Type of item to get ()
 * @return {object} Item from database or null if not found
 * @throws {Error} Error getting item from database
 */
  get(key, type) {
    if (!isValidItemType(type)) {
      throw new Error('Invalid item type.');
    }
    const query = this.#db.prepare(`SELECT * FROM ${type} WHERE key = ? LIMIT 1;`);
    try {
      const item = query.get(key);
      return JSON.parse(item.json_data);
    } catch (error) {
      // This should be properly handled higher up
      console.error(error);
      return null;
    }
  }

  put(key, type, data) {
    if (!isValidItemType(type)) {
      throw new Error('Invalid item type.');
    }

    const query = this.#db.prepare(`INSERT INTO ${type} (key, json_data) VALUES (?, ?);`);

    try {
      const result = query.run(key, JSON.stringify(data));
      return result;
    } catch (error) {
      // This should be properly handled higher up
      console.error(error);
      return null;
    }
  }
}

// const testdb = new Database(); // in memory

// testdb.put('0000000000000001', User, { name: 'test' });
// console.log(testdb.put('0000000000000002', User, { name: 'test2' }));

// console.log(testdb.get('0000000000000001', User));

// testdb.closeDatabaseConnection();

module.exports = { Database, Types };
