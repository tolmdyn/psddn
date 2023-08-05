/**
 * @file build_dummy_database.js
 * @description: This file builds a dummy database at "{project_root}/data/main.db"
 * for testing purposes.
 */

const path = require('path');
const { Database, Types } = require('../../src/database/database');
const { getHash, generateRandomDocument, generateRandomUser } = require('../../src/utils/utils');

// Create test database
const testDB = new Database(path.join(__dirname, '../../data/main.db'));

// Generate 20 random documents
const documents = [];
for (let i = 0; i < 20; i += 1) {
  documents.push(generateRandomDocument());
}

// Generate a hash for each document in documents and insert into database
documents.forEach((document) => {
  const key = getHash(document);
  try {
    testDB.put(key, Types.Document, document); // insert into test database
  } catch (error) {
    console.log(error);
  }
});

// Generate some users
const users = [];
for (let i = 0; i < 10; i += 1) {
  users.push(generateRandomUser());
}

// Generate a hash for each user in users and insert into database
users.forEach((user) => {
  const key = getHash(user);
  try {
    testDB.put(key, Types.User, user); // insert into test database
  } catch (error) {
    console.log(error);
  }
});

// Close database connection
testDB.closeDatabaseConnection();
console.log('Database built.');
