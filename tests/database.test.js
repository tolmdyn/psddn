const { assert, expect } = require('chai');

// import the document schema
const { documentSchema } = require('../src/models/validation');
const { Database, Types } = require('../src/database/database');
const { getHash, generateRandomDocument } = require('../src/utils/utils');

describe('Database Tests', () => {
  let testDB; // test database

  before(() => {
    // Code to run before all tests in this test suite
    // testDB = new Database();
  });

  after(() => {
    // Code to run after all tests in this test suite
    // if (this.testDB) {
    //   testDB.close();
    // }
  });

  beforeEach(() => {
    // Code to run before each test
    testDB = new Database();
  });

  afterEach(() => {
    // Code to run after each test
    if (this.testDB) {
      testDB.close();
    }
  });

  it('should create a new database in memory if no path', () => {
    testDB = new Database();
    expect(testDB).to.be.an.instanceof(Database);
  });

  it('should open existing database if path given', () => {
    // Test assertions
  });

  it('should create new database if path given', () => {
    // Test assertions
  });

  it('should create tables if none exist', () => {
    testDB = new Database();
    expect(testDB).to.be.an.instanceof(Database);

    expect(testDB.databaseHasTables()).to.be.equal(true);
  });

  /* -------- PUT -------- */
  it('should insert a document into the database without errors', () => {
    const testDocument = generateRandomDocument();
    const key = getHash(testDocument);

    const result = testDB.put(key, Types.Document, testDocument);

    expect(result).to.exist; // Ensure that result is not null
    expect(result.changes).to.equal(1); // Ensure that one row was inserted
  });

  it('should insert multiple documents into the database without errors', () => {
    const testDocuments = [];
    for (let i = 0; i < 30; i += 1) {
      testDocuments.push(generateRandomDocument());
    }

    testDocuments.forEach((document) => {
      const key = getHash(document);
      const result = testDB.put(key, Types.Document, document);
      expect(result).to.exist; // Ensure that result is not null
      expect(result.changes).to.equal(1); // Ensure that one row was inserted
    });
  });

  it('should fail to insert a document into the database if invalid type given', () => {
    const testDocument = generateRandomDocument();
    const key = getHash(testDocument);

    const invalidType = 'invalid_type';
    expect(() => testDB.put(key, invalidType, testDocument)).to.throw('Invalid item type.');
  });

  it('should fail to insert a document into the database if invalid key given', () => {
    const testDocument = generateRandomDocument();
    const key = '1234';

    expect(() => testDB.put(key, Types.Document, testDocument)).to.throw('Key is not a valid hash for the item.');
  });

  it('should fail to insert a document into the database if duplicate key given (item already exists)', () => {
    const testDocument = generateRandomDocument();
    const key = getHash(testDocument);

    const result = testDB.put(key, Types.Document, testDocument);
    expect(result).to.exist;
    expect(result.changes).to.equal(1);

    expect(() => testDB.put(key, Types.Document, testDocument)).to.throw('Key already exists in database.');
  });

  /* -------- GET -------- */
  it('should retrieve a document from the database', () => {
    const testDocument = generateRandomDocument();
    const key = getHash(testDocument);

    testDB.put(key, Types.Document, testDocument);

    const retrievedDocument = testDB.get(key, Types.Document);
    expect(retrievedDocument).to.deep.equal(testDocument);
  });

  it('should return null if item is not found in the database', () => {
    const nonExistentKey = 'non_existent_key';
    const retrievedDocument = testDB.get(nonExistentKey, Types.Document);
    expect(retrievedDocument).to.be.null;
  });
});
