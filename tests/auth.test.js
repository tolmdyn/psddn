/**
 * @description Tests for the auth module
 */

const { expect } = require('chai');

const auth = require('../src/auth/auth');
// const { userSession } = require('../src/auth/auth'); // check path later

const { userProfileSchema } = require('../src/models/userProfile');
const { userSchema, keyRegex, longKeyRegex } = require('../src/models/validation');

describe('Login Tests', () => {
  it('should login and create a new user', () => {
    const { userProfile, secretKey } = auth.authNewUser('testUser', 'testPassword');

    // console.log('userProfile: ', userProfile);
    // console.log('secretKey: ', secretKey);

    expect(userProfile).to.be.an('object');

    const { error1 } = userProfileSchema.validate(userProfile);
    expect(error1).to.be.undefined;

    const user = userProfile.userObject;
    // console.log('user: ', user);
    const { error2 } = userSchema.validate(user);
    expect(error2).to.be.undefined;

    expect(userProfile.key.length).to.equal(44);
    expect(userProfile.secretKey.length).to.equal(88);

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
  it('should sign and verify a message', () => {
    // todo
  });
});
