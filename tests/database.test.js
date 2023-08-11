/**
 * @description Tests for the database class
 */

const fs = require('fs');
const { expect } = require('chai');

// import the document schema
const { documentSchema } = require('../src/models/validation');
const { Database } = require('../src/database/database');
const { generateRandomDocument, generateRandomUser, generateKey } = require('../src/utils/utils');
const { Types } = require('../src/models/types');

describe('Database Tests', () => {
  let testDB; // test database

  before(() => {
    // Code to run before all tests in this test suite
  });

  after(() => {
    // Code to run after all tests in this test suite
  });

  beforeEach(() => {
    // Create an empty test database in memory before each test
    testDB = new Database('./tests/data/test_database.db');
  });

  afterEach(() => {
    // Close the database connection after each test
    if (testDB) {
      testDB.closeDatabaseConnection();
    }

    // Delete the test database file, if it exists
    if (fs.existsSync('./tests/data/test_database.db')) {
      fs.unlinkSync('./tests/data/test_database.db');
    }
  });

  it('should create a new database', () => {
    // testDB = new Database();
    expect(testDB).to.be.an.instanceof(Database);
  });

  it('should open database if path given and exists', () => {
    // testDB = new Database('./tests/data/test_database.db');
    expect(testDB).to.be.an.instanceof(Database);
    expect(testDB.databaseHasTables()).to.be.equal(true);

    const testDocument = generateRandomDocument();
    const key = generateKey(testDocument);

    testDB.put(key, Types.Document, testDocument);
    testDB.closeDatabaseConnection();

    testDB = new Database('./tests/data/test_database.db');
    const retrievedDocument = testDB.get(key, Types.Document);
    expect(retrievedDocument).to.exist;
    expect(retrievedDocument).to.deep.equal(testDocument);
  });

  it('should create tables if none exist', () => {
    expect(testDB).to.be.an.instanceof(Database);
    expect(testDB.databaseHasTables()).to.be.equal(true);
  });

  /* -------- PUT -------- */
  it('should insert a document into the database without errors', () => {
    const testDocument = generateRandomDocument();
    const key = generateKey(testDocument);

    const result = testDB.put(key, Types.Document, testDocument);

    // If the result is null, then the insert failed
    expect(result).to.exist; // Ensure that result is not null
    // If the result is not an error, then the insert succeeded
    expect(result).to.not.be.an('error'); // Ensure that result is not an error
    expect(result.key).to.equal(key); // Ensure that our document was inserted
  });

  it('should insert multiple documents into the database without errors', () => {
    const testDocuments = [];
    for (let i = 0; i < 30; i += 1) {
      testDocuments.push(generateRandomDocument());
    }

    testDocuments.forEach((document) => {
      const key = generateKey(document);
      const result = testDB.put(key, Types.Document, document);
      expect(result).to.exist;
      expect(result.key).to.equal(key);
    });
  });

  it('should fail to insert a document into the database if invalid type given', () => {
    const testDocument = generateRandomDocument();
    const key = generateKey(testDocument);

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
    const key = generateKey(testDocument);

    const result = testDB.put(key, Types.Document, testDocument);
    expect(result).to.exist;
    expect(result.key).to.equal(key);

    expect(() => testDB.put(key, Types.Document, testDocument)).to.throw('Key already exists in database.');
  });

  /* -------- GET -------- */
  it('should retrieve a document from the database', () => {
    const testDocument = generateRandomDocument();
    const key = generateKey(testDocument);

    testDB.put(key, Types.Document, testDocument);

    const retrievedDocument = testDB.get(key, Types.Document);
    expect(retrievedDocument).to.deep.equal(testDocument);
  });

  it('should throw exception if bad key is given', () => {
    const nonExistentKey = 'non_existent_key';
    expect(() => testDB.get(nonExistentKey, Types.Document)).to.throw('Invalid key format.');
  });

  /* -------- USER -------- */
  it('should insert a valid user into the database', () => {
    const testUser = generateRandomUser();
    const key = testUser.publicKey;

    const result = testDB.put(key, Types.User, testUser);

    // If the result is null, then the insert failed
    expect(result).to.exist; // Ensure that result is not null
    // If the result matches the item given then success
    expect(result.key).to.equal(key); // Ensure that our document was inserted
    expect(result.data).to.deep.equal(testUser);
  });

  it('should get a valid user from the database', () => {
    const testUser = generateRandomUser();
    const key = testUser.publicKey;
    testDB.put(key, Types.User, testUser);

    // Test get function with user type
    const retrievedUser = testDB.get(key, Types.User);
    expect(retrievedUser).to.exist;
    expect(retrievedUser).to.deep.equal(testUser);

    // Test the getUser helper wrapper
    const retrievedUser2 = testDB.getUser(key);
    expect(retrievedUser2).to.exist;
    expect(retrievedUser2).to.deep.equal(testUser);
  });

  it('should not insert a user into the database with wrong type', () => {
    const testUser = generateRandomUser();
    testUser.type = Types.Document;
    const key = generateKey(testUser);

    // Should throw an Invalid item type error
    expect(() => testDB.put(key, Types.User, testUser)).to.throw('Invalid item type.');
  });

  it('should not insert a user into the database with invalid key', () => {
    const testUser = generateRandomUser();
    const key = '1234';

    // Should throw an Invalid key format error
    expect(() => testDB.put(key, Types.User, testUser)).to.throw('Key is not a valid hash for the item.');
  });

  it('should insert multiple users into the database without errors', () => {
    const keys = insertTestUsers(testDB);

    keys.forEach((key) => {
      const retrievedUser = testDB.getUser(key);
      expect(retrievedUser).to.exist;
      expect(retrievedUser.publicKey).to.equal(key);
    });
  });

  it('should get all users from the database', () => {
    const keys = insertTestUsers(testDB);

    const users = testDB.getAllUsers();
    expect(users).to.exist;
    expect(users).to.be.an('array');
    expect(users.length).to.equal(30);

    users.forEach((user) => {
      expect(keys.includes(user.publicKey)).to.equal(true);
    });
  });
});

function insertTestUsers(testDB) {
  const keys = [];
  for (let i = 0; i < 30; i += 1) {
    const user = generateRandomUser();
    keys.push(user.publicKey);
    testDB.put(user.publicKey, Types.User, user);
  }
  return keys;
}
