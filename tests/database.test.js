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

    testDB.put(testDocument);
    testDB.closeDatabaseConnection();

    testDB = new Database('./tests/data/test_database.db');
    const retrievedDocument = testDB.get(testDocument.key, Types.Document);
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

    const result = testDB.put(testDocument);
    // If the result is null, then the insert failed
    expect(result).to.exist; // Ensure that result is not null
    // If the result is not an error, then the insert succeeded
    expect(result).to.not.be.an('error'); // Ensure that result is not an error
    expect(result.key).to.equal(testDocument.key); // Ensure that our document was inserted
  });

  it('should insert multiple documents into the database without errors', () => {
    const testDocuments = [];
    for (let i = 0; i < 30; i += 1) {
      testDocuments.push(generateRandomDocument());
    }

    testDocuments.forEach((document) => {
      const result = testDB.put(document);
      expect(result).to.exist;
      expect(result.key).to.equal(document.key);
    });
  });

  it('should fail to insert a document into the database if invalid type given', () => {
    const testDocument = generateRandomDocument();
    testDocument.type = 'invalid_type';

    expect(() => testDB.put(testDocument)).to.throw('Invalid item type.');
  });

  it('should fail to insert a document into the database if invalid key given', () => {
    const testDocument = generateRandomDocument();
    testDocument.key = '1234';

    expect(() => testDB.put(testDocument)).to.throw('Key is not a valid hash for the item.');
  });

  it('should fail to insert a document into the database if duplicate key given (item already exists)', () => {
    const testDocument = generateRandomDocument();

    const result = testDB.put(testDocument);
    expect(result).to.exist;
    expect(result.key).to.equal(testDocument.key);

    expect(() => testDB.put(testDocument)).to.throw('Key already exists in database.');
  });

  /* -------- GET -------- */
  it('should retrieve a document from the database', () => {
    const testDocument = generateRandomDocument();

    testDB.put(testDocument);

    const retrievedDocument = testDB.get(testDocument.key, Types.Document);
    expect(retrievedDocument).to.deep.equal(testDocument);
  });

  it('should throw exception if bad key is given', () => {
    const nonExistentKey = 'non_existent_key';
    expect(() => testDB.get(nonExistentKey, Types.Document)).to.throw('Invalid key format.');
  });

  /* -------- USER -------- */
  it('should insert a valid user into the database', () => {
    const testUser = generateRandomUser();
    // const key = testUser.key;

    const result = testDB.put(testUser);
    // If the result is null, then the insert failed
    expect(result).to.exist; // Ensure that result is not null
    // If the result matches the item given then success
    expect(result.key).to.equal(testUser.key); // Ensure that our document was inserted
    expect(result).to.deep.equal(testUser);
  });

  it('should get a valid user from the database', () => {
    const testUser = generateRandomUser();
    // const key = testUser.publicKey;
    testDB.put(testUser);

    // Test get function with user type
    const retrievedUser = testDB.get(testUser.key, Types.User);
    expect(retrievedUser).to.exist;
    expect(retrievedUser).to.deep.equal(testUser);

    // Test the getUser helper wrapper
    const retrievedUser2 = testDB.getUser(testUser.key);
    expect(retrievedUser2).to.exist;
    expect(retrievedUser2).to.deep.equal(testUser);
  });

  it('should not insert a user into the database with wrong type', () => {
    const testUser = generateRandomUser();
    testUser.type = 'invalid';

    // Should throw an Invalid item type error
    expect(() => testDB.put(testUser)).to.throw('Invalid item type.');
  });

  it('should not insert a user into the database with invalid key', () => {
    const testUser = generateRandomUser();
    testUser.key = '1234';

    // Should throw an Invalid key format error
    expect(() => testDB.put(testUser)).to.throw('Key is not a valid hash for the item.');
  });

  it('should insert multiple users into the database without errors', () => {
    const keys = insertTestUsers(testDB);

    keys.forEach((key) => {
      const retrievedUser = testDB.getUser(key);
      expect(retrievedUser).to.exist;
      expect(retrievedUser.key).to.equal(key);
    });
  });

  it('should get all users from the database', () => {
    const keys = insertTestUsers(testDB);

    const users = testDB.getAllUsers();
    expect(users).to.exist;
    expect(users).to.be.an('array');
    expect(users.length).to.equal(30);

    users.forEach((user) => {
      expect(keys.includes(user.key)).to.equal(true);
    });
  });

  // it('should get all users from the database with a limit', () => {
  //   const keys = insertTestUsers(testDB);

  //   const users = testDB.getAllUsers(10);
  //   expect(users).to.exist;
  //   expect(users).to.be.an('array');
  //   expect(users.length).to.equal(10);

  //   users.forEach((user) => {
  //     expect(keys.includes(user.key)).to.equal(true);
  //   });
  // }

  // it('should get all users from the database with a limit and offset', () => {

  it('should update a user in the database', () => {
    const testUser = generateRandomUser();
    testDB.put(testUser);

    const updatedUser = generateRandomUser();
    updatedUser.key = testUser.key;
    updatedUser.username = 'updated_username';

    const result = testDB.updateUser(updatedUser);
    expect(result).to.exist;
    expect(result).to.deep.equal(updatedUser);

    const retrievedUser = testDB.getUser(testUser.key);
    expect(retrievedUser).to.exist;
    expect(retrievedUser).to.deep.equal(updatedUser);
  });

  it('should delete a user from the database', () => {
    const testUser = generateRandomUser();
    testDB.put(testUser);

    const result = testDB.deleteUser(testUser.key);
    expect(result).to.exist;
    expect(result).to.deep.equal(testUser);

    const retrievedUser = testDB.getUser(testUser.key);
    expect(retrievedUser).to.not.exist;
  });

  it('should throw an error when trying to delete non-existent user', () => {
    const testUser = generateRandomUser();

    expect(() => testDB.deleteUser(testUser.key)).to.throw('Item not found in database.');
  });
});

function insertTestUsers(testDB) {
  const keys = [];
  for (let i = 0; i < 30; i += 1) {
    const user = generateRandomUser();
    keys.push(user.key);
    testDB.put(user);
  }
  return keys;
}
