const db = require('better-sqlite3')('/../data/database_test.db');
const hash = require('object-hash');

// import the document schema
const { documentSchema } = require('../models/validation');

// Example JSON documents
const documents = [{
  type: 'document',
  id: '1234567890123456',
  owner_id: '0000000000000001',
  timestamp: '2023-07-20T11:06:06.694Z',
  title: 'Hello World',
  content: 'This is a test document.',
  tags: ['test', 'example'],
}, {
  type: 'document',
  id: '2468101214161820',
  owner_id: '0000000000000001',
  timestamp: '2023-07-20T11:01:06.694Z',
  title: 'Second Document',
  content: 'Another test document for the prototype.',
  tags: ['test', 'prototype'],
}, {
  type: 'document',
  id: '9876543210987654',
  owner_id: '0000000000000002',
  timestamp: '2023-07-21T15:30:00.000Z',
  title: 'Sample Document',
  content: 'This is another test document.',
  tags: ['sample', 'test'],
}, {
  type: 'document',
  id: '7654321098765432',
  owner_id: '0000000000000004',
  timestamp: '2023-07-23T20:00:00.000Z',
  title: 'Node.js Basics',
  content: 'An introduction to Node.js and its core features.',
  tags: ['node.js', 'basics', 'tutorial'],
}];

/* validate the document */
documents.forEach((doc) => {
  const { error } = documentSchema.validate(doc);
  if (error) {
    console.log(error);
  }
});

// Generate a hash for each document in documents and insert into database
documents.forEach((doc) => {
  const key = hash(doc).substring(0, 16);
  const document = JSON.stringify(doc);
  try {
    db.prepare('INSERT INTO documents (hash, json_data) VALUES (?, ?)').run(key, document);
  } catch (err) {
    console.log(err.message);
  }
});

// // Query the database for the document with the given hash using better-sqlite3
const getDocument = (key) => {
  const query = 'SELECT json_data FROM documents WHERE hash = ?';
  const params = [key];
  const row = db.prepare(query).get(params);
  return JSON.parse(row.json_data);
};

// Check all documents are in the database
documents.forEach((doc) => {
  const key = hash(doc).substring(0, 16);
  const document = getDocument(key);
  console.log('DOCUMENT:  ', document);
});

db.close();
