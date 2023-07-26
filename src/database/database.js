/**
* @description: This file provides the database wrapper class and functions.
*
*/

const SqliteDatabase = require('better-sqlite3');
const debug = require('debug')('database');
const path = require('path');

/**
* @description: Represents the type of an item in the database.
*/
const itemTypes = {
  Feed: 'feed',
  User: 'user',
  Document: 'document',
};

class Database {
  #dbPath = path.join(__dirname, './../../data/database.db');

  #db;

  constructor() {
    // Open database
    this.#db = this.openDatabaseConnection();

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
  openDatabaseConnection() {
    try {
      const db = new SqliteDatabase(this.#dbPath, { verbose: debug });
      debug('Database opened successfully.');
      return db;
    } catch (error) {
      console.error(error);
      throw error;
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
  }

  /**
 * @description: Get item from database
 * @param {string} key - Key (hash/id) of item to get
 * @param {string} type - Type of item to get ()
 * @return {object} Item from database or null if not found
 * @throws {Error} Error getting item from database
 */
  get(key, type) {
  // Sometimes the key is a hash and sometimes an id...
    const query = this.#db.prepare('SELECT * FROM ? WHERE key = ?');
    try {
      const item = query.get(type, key);
      return item;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  put(key, type, data) {
    const query = this.#db.prepare('INSERT INTO ? (key, json_data) VALUES (?, ?)');
    try {
      const item = query.run(type, key, data);
      return item;
    } catch (error) {
      console.error(error);
      return null;
    }
  }
}

// const testdb = new Database();
// testdb.closeDatabaseConnection();
module.exports = { Database };
