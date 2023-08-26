/**
* @fileOverview This file provides the database wrapper class and functions for interaction
* @module database
*
*  The database is now a singleton defined in this file and then accessed from other modules
*/
const fs = require('fs');
const path = require('path');
const Sqlite = require('better-sqlite3');
const debug = require('debug')('database');

const { isValidKeyFormat, isValidKeyForItem } = require('../utils/utils'); // TODO: Should this be handled as a verification step, not in database?
const { isValidItemType, Types } = require('../models/types');

const databaseFolderPath = path.join(__dirname, './../../data/');
const databasePath = path.join(__dirname, './../../data/database.db');

/**
 * @description: Database wrapper class
 * @class Database
 * @param {string} dbPath - Path to database file
 */
class Database {
  #db;

  // If no path is provided, use default path, otherwise use provided path
  constructor(customPath) {
    debug('Custom path:', customPath);
    // Create folder if it doesn't exist
    if (!customPath) {
      Database.createDatabaseFolder();
      this.#openDatabaseConnection(databasePath);
    } else {
      this.#openDatabaseConnection(customPath);
    }
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
    const typeNames = Object.values(Types);
    const typesQuery = typeNames.map((typeName) => `'${typeName}'`).join(', ');

    const result = this.#db.prepare(`SELECT name FROM sqlite_schema WHERE type='table' AND name IN (${typesQuery});`).all();

    const existingTableNames = result.map((table) => table.name);

    const missingTables = typeNames.filter((typeName) => !existingTableNames.includes(typeName));

    if (missingTables.length > 0) {
      debug('Database is missing tables:', missingTables);
      return false;
    }

    return true;
    // // result must have the three table names in it
    // if (result.length === Types.length) {
    //   return true;
    // }
    // debug('Database does not have the right tables.', result);
    // return false;
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

    this.#db.prepare(`
        CREATE TABLE "userProfile" (
         "id" INTEGER UNIQUE,
         "key" TEXT NOT NULL UNIQUE,
         "json_data" JSON NOT NULL,
         PRIMARY KEY("id" AUTOINCREMENT)
        );
      `).run();

    this.#db.prepare(`
      PRAGMA journal_mode=WAL;
    `).run();

    debug('Tables created successfully.');

    if (!this.databaseHasTables()) {
      throw new Error('Unable to verify tables.');
    }
  }

  /**
   * @description: Create database folder if it doesn't exist
   */
  static createDatabaseFolder() {
    if (!fs.existsSync(databaseFolderPath)) {
      fs.mkdirSync(databaseFolderPath);
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

    if (!isValidKeyFormat(key)) {
      throw new Error('Invalid key format.');
    }

    const query = this.#db.prepare(`SELECT * FROM ${type} WHERE key = ? LIMIT 1;`);
    const item = query.get(key);

    if (item) {
      return JSON.parse(item.json_data);
    }
    return null;
  }

  /**
   * @description Get user from database helper method for more abstraction.
   * @param {*} key User publicKey
   * @returns The requested user object
   */
  getUser(publicKey) {
    return this.get(publicKey, Types.User);
  }

  /**
   * @description: Get all users from the database
   * @return {object} All users from database
   */
  getAllUsers() {
    const query = this.#db.prepare('SELECT * FROM user;');
    const users = query.all();
    return users.map((user) => JSON.parse(user.json_data));
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
  put(item) {
    const { key, type } = item;

    if (!isValidItemType(type)) {
      throw new Error('Invalid item type.');
    }

    if (!isValidKeyForItem(key, item)) {
      throw new Error('Key is not a valid hash for the item.');
    }

    // Be sure to prevent sql injection in type
    const query = this.#db.prepare(`INSERT INTO ${type} (key, json_data) VALUES (?, ?);`);

    try {
      const result = query.run(key, JSON.stringify(item));
      if (result.changes !== 1) {
        throw new Error('Error putting item into database.');
      }
      return item;
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        if (type === Types.User) {
          debug('User already exists in database, updating info.');
          return this.updateUser(item);
        }
        throw new Error('Key already exists in database.');
      } else {
        throw new Error(error);
      }
    }
  }

  /**
   * @description: Delete item from database
   * @param {string} key - Key (hash/id) of item to delete
   * @param {string} type - Type of item to delete
   * @return {object} Result of database query
   */
  delete(key, type) {
    if (!isValidItemType(type)) {
      throw new Error('Invalid item type.');
    }

    if (!isValidKeyFormat(key)) {
      throw new Error('Invalid key format.');
    }

    const item = this.get(key, type);
    if (!item) {
      throw new Error('Item not found in database.');
    }

    const query = this.#db.prepare(`DELETE FROM ${type} WHERE key = ?;`);
    const result = query.run(key);

    if (result.changes !== 1) {
      throw new Error('Error deleting item from database.');
    }

    // Should return the deleted item
    return item;
  }

  deleteUser(publicKey) {
    return this.delete(publicKey, Types.User);
  }

  /**
   * @description: Update item in database
   * @param {object} item - Item to update in database
   * @return {object} Result of database action
   */
  update(item) {
    const { key, type } = item;
    let result;

    if (!isValidItemType(type)) {
      throw new Error('Invalid item type.');
    }

    if (!isValidKeyForItem(key, item)) {
      throw new Error('Key is not a valid hash for the item.');
    }

    if (!this.get(key, type)) {
      result = this.#db.prepare(`INSERT INTO ${type} (key, json_data) VALUES (?, ?);`)
        .run(key, JSON.stringify(item));
    } else {
      result = this.#db.prepare(`UPDATE ${type} SET json_data = ? WHERE key = ?;`)
        .run(JSON.stringify(item), key);
    }

    // const result = query.run(JSON.stringify(item), key);

    if (result.changes !== 1) {
      throw new Error('Error updating item in database.');
    }

    // Should return the updated item
    return item;
  }

  updateUser(user) {
    try {
      const existingUser = this.getUser(user.key);
      if (existingUser) {
        if (!existingUser.lastSeen || (existingUser.lastSeen < user.lastSeen)) {
          debug('Updating existing user.');
          return this.update(user);
        }
        debug('Existing user is newer, not updating.');
        return existingUser;
      }
    } catch (error) {
      debug('Error getting existing user from database.', error);
    }
    return this.put(user);
  }

  putUserProfile(userProfile) {
    // debug('putUserProfile:', userProfile, userProfile.key, userProfile.type);
    return this.put(userProfile);
  }

  updateUserProfile(userProfile) {
    // debug('updateUserProfile:', userProfile, userProfile.key, userProfile.type);
    return this.update(userProfile);
  }

  getUserProfile(key) {
    // debug('getUserProfile:', key);
    return this.get(key, Types.UserProfile);
  }
}

// module.exports = new Database(databasePath);
module.exports = { Database };
