/**
 * Tests the database by inserting a few documents and then retrieving them.
 *
 * TODO: This code will be migrated into database.test.js
 */

// import the document schema
const { documentSchema } = require('../../src/models/validation');
const { Database, Types } = require('../../src/database/database');
const { getHash } = require('../../src/utils/utils');

// Example JSON documents
const documents = [{
  type: 'document',
  id: '1234567890123456',
  owner: '0000000000000001',
  timestamp: '2023-07-20T11:06:06.694Z',
  title: 'Hello World',
  content: 'This is a test document.',
  tags: ['test', 'example'],
}, {
  type: 'document',
  id: '2468101214161820',
  owner: '0000000000000001',
  timestamp: '2023-07-20T11:01:06.694Z',
  title: 'Second Document',
  content: 'Another test document for the prototype.',
  tags: ['test', 'prototype'],
}, {
  type: 'document',
  id: '9876543210987654',
  owner: '0000000000000002',
  timestamp: '2023-07-21T15:30:00.000Z',
  title: 'Sample Document',
  content: 'This is another test document.',
  tags: ['sample', 'test'],
}, {
  type: 'document',
  id: '7654321098765432',
  owner: '0000000000000004',
  timestamp: '2023-07-23T20:00:00.000Z',
  title: 'Node.js Basics',
  content: 'An introduction to Node.js and its core features.',
  tags: ['node.js', 'basics', 'tutorial'],
}];

/* -------------------- Tests --------------------*/

// Create test database (in memory)
const testDB = new Database();

/* validate the document */
documents.forEach((document) => {
  const { error } = documentSchema.validate(document);
  if (error) {
    console.log(error);
  }
});

// Generate a hash for each document in documents and insert into database
documents.forEach((document) => {
  const key = getHash(document);
  try {
    testDB.put(key, Types.Document, document); // insert into test database
  } catch (err) {
    console.log('PUT:', err.message);
  }
});

// Check all documents are in the database
documents.forEach((document) => {
  const key = getHash(document);
  try {
    const thisDocument = testDB.get(key, Types.Document);
    console.log('DOCUMENT:  ', thisDocument);
  } catch (err) {
    console.log('GET: ', err.message);
  }
});

testDB.closeDatabaseConnection();
