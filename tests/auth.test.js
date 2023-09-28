/**
 * @description Tests for the auth module
 */

const { expect } = require('chai');

const auth = require('../src/auth/auth');
// const { userSession } = require('../src/auth/auth'); // check path later

const { userProfileSchema } = require('../src/models/userProfile');
const { userSchema } = require('../src/models/user');
const { keyRegex, longKeyRegex } = require('../src/models/match');
const { generateRandomDocument } = require('./scripts/generate');

describe('Login Tests', () => {
  it('should login and create a new user', () => {
    const { userProfile, secretKey } = auth.authNewUser('testUser', 'testPassword');

    // console.log('userProfile: ', userProfile);
    // console.log('secretKey: ', secretKey);

    expect(userProfile).to.be.an('object');

    const { errorProf } = userProfileSchema.validate(userProfile);
    expect(errorProf).to.be.undefined;

    const user = userProfile.userObject;
    // console.log('user: ', user);
    const { errorUser } = userSchema.validate(user);
    expect(errorUser).to.be.undefined;

    expect(userProfile.key.length).to.equal(44);
    expect(userProfile.secretKey.length).to.not.be.undefined;

    expect(secretKey).to.be.a('string');
    expect(secretKey).to.match(longKeyRegex);
  });

  it('should login an existing user', () => {
    // todo
  });
});

// userSession tests
describe('User Session Tests', () => {
  it('should set the userSession key and profile on new user login', () => {
    const { userProfile, secretKey } = auth.authNewUser('testUser', 'testPassword');

    const sessionUserKey = auth.getUserSessionKey();
    expect(sessionUserKey).to.not.be.undefined;
    expect(sessionUserKey).to.be.a('string');
    expect(sessionUserKey).to.match(keyRegex);
    expect(sessionUserKey).to.equal(userProfile.key);

    const sessionUserProfile = auth.getUserSessionProfile();
    expect(sessionUserProfile).to.not.be.undefined;
    expect(sessionUserProfile).to.be.an('object');
    expect(sessionUserProfile).to.deep.equal(userProfile);
  });
});

// sign/verify tests
describe('Sign/Verify Tests', () => {
  it('should sign a string message', () => {
    const { userProfile, secretKey } = auth.authNewUser('testUser', 'testPassword');

    const message = 'test message';
    const signature = auth.signStringWithKey(message, secretKey);

    expect(signature).to.not.be.undefined;
    expect(signature).to.be.a('string');
    expect(signature.length).to.equal(88);
    expect(signature).to.match(longKeyRegex);
  });

  it('should verify a signed message', () => {
    const { userProfile, secretKey } = auth.authNewUser('testUser', 'testPassword');

    const message = 'test message';
    const signature = auth.signStringWithKey(message, secretKey);

    const verified = auth.verifyStringSignature(message, signature, userProfile.key);

    expect(verified).to.be.true;
  });

  it('should not verify a signed message with the wrong key', () => {
    // todo
  });

  it('should not verify a signed message with the wrong message', () => {
    // todo
  });

  it('should sign a document string', () => {
    const { userProfile, secretKey } = auth.authNewUser('testUser', 'testPassword');

    const testDocument = generateRandomDocument();
    // console.log(testDocument);

    // unpack the item and stringify
    const { signature: sig, ...itemContent } = testDocument;
    const itemString = JSON.stringify(itemContent);

    // console.log('itemString', itemString, 'sig', sig);
    const signature = auth.signStringWithKey(itemString, secretKey);
    // console.log('Document sig:', signature);

    expect(signature).to.not.be.undefined;
    expect(signature).to.be.a('string');
    expect(signature.length).to.equal(88);
    expect(signature).to.match(longKeyRegex);
  });

  it('should stringify and sign a document object', () => {
    const { userProfile, secretKey } = auth.authNewUser('testUser', 'testPassword');

    const testDocument = generateRandomDocument();
    // console.log(testDocument);

    // unpack the item and stringify
    const signature = auth.signItem(testDocument, secretKey);

    // console.log('Document Sig:', signature);
    expect(signature).to.not.be.undefined;
    expect(signature).to.be.a('string');
    expect(signature.length).to.equal(88);
    expect(signature).to.match(longKeyRegex);
  });
});
