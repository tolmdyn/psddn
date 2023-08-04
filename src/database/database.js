/**
* @fileOverview This file provides the database wrapper class and functions for interaction
* @module database
*
*  The database is now a singleton defined in this file and then accessed from other modules
*/
const path = require('path');
const Sqlite = require('better-sqlite3');
const debug = require('debug')('database');

const { isValidKey } = require('../utils/utils'); // TODO: Should this be handled as a verification step, not in database?
const { isValidItemType } = require('../models/types');

const databasePath = path.join(__dirname, './../../data/database.db');

/**
 * @description: Database wrapper class
 * @class Database
 * @param {string} dbPath - Path to database file
 */
class Database {
  #db;

  // If no path is provided, then the database is created in memory
  constructor(dbPath) {
    // Open database
    this.#openDatabaseConnection(dbPath);

    // Check if this.db doesnt have the right tables... create them
    if (!this.databaseHasTables()) {
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

  /**
   * @description: Close database connection
   */
  closeDatabaseConnection() {
    this.#db.close();
  }

  /**
   * @description: Checks if the database has the right tables
   * @return {boolean} True if the database has the right tables, false otherwise
   */
  databaseHasTables() {
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

    if (!this.databaseHasTables()) {
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

    const item = query.get(key);
    if (item) {
      return JSON.parse(item.json_data);
    }
    return null;
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

    if (!isValidKey(key, data)) {
      throw new Error('Key is not a valid hash for the item.');
    }

    const query = this.#db.prepare(`INSERT INTO ${type} (key, json_data) VALUES (?, ?);`);

    try {
      const result = query.run(key, JSON.stringify(data));
      if (result.changes !== 1) {
        throw new Error('Error putting item into database.');
      }
      return { key, type, data };
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        throw new Error('Key already exists in database.');
      } else {
        throw new Error(error);
      }
    }
  }
}

module.exports = new Database(databasePath);
// module.exports = { Database, Types };
