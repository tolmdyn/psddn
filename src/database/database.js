/**
* @fileOverview This file provides the database wrapper class and functions for interaction
* @module database
* @requires better-sqlite3 - Raw sqlite database functionality
* @requires debug - Debug module for logging
* @example
* const { Database, Types } = require('./database');
* const testDB = new Database();
* const document = testDB.put('1234567890123456', Types.Document, <JSON document>);
*/

const Sqlite = require('better-sqlite3');
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
      this.#db = new Sqlite(dbPath, { verbose: debug });
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
 * @throws {Error} Error getting item from database (not yet)
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
      // This should be properly handled higher up, not swallowed
      console.error(error);
      return null;
    }
  }

  /**
   * @description: Put item into database
   * @param {string} key - Key (hash/id) of item to put
   * @param {string} type - Type of item to put
   * @param {object} data - Item to put into database
   * @return {object} Result of database query
   * @throws {Error} Error putting item into database (not yet)
   *
   * TODO: Call getHash() on data rather than accept a parameter
   * TODO: Improve error handling
   */
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

module.exports = { Database, Types };
