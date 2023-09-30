/**
 * USER PROFILE MODEL
 * User profile model to store user data on local machine.
 * Consisting of public key, private key, user object, userfeed and followedUsers.
 */

/**
 * @fileoverview User schema to validate user objects.
 * @usage const { error } = userSchema.validate(user);
 */

const joi = require('joi');
const { userSchema } = require('./user');
const { keyRegex, longKeyRegex } = require('./match');

const userProfileSchema = joi.object({
  type: joi.string()
    .valid('userProfile')
    .required(),

  key: joi.string()
    .required()
    .pattern(keyRegex)
    .length(44),

  secretKey: joi.string()
    .required()
    .pattern(longKeyRegex)
    .length(88),

  userObject: userSchema
    .required(),

  following: joi.array()
    .items(joi.string().pattern(keyRegex))
    .required(),

});

module.exports = { userProfileSchema };
