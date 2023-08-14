/**
 * @file Joi validation schemas for different objects. Used to validate items.
 * @module JoiSchemas
 * @requires joi
 * @todo Split into separate files, Add regex validations for strings
 */

const joi = require('joi');

// const keyRegex = /^[A-Za-z0-9+/]{43,}(={0,2})$/;
const keyRegex = /^[A-Za-z0-9+/]{43,46}(={0,2})$/;

/**
 * ADDRESS SCHEMA
 * Address schema to validate IP address and port.
 * @type {import('joi').ObjectSchema}
 */
const addressSchema = joi.object({
  ip: joi.string()
    .ip({ version: ['ipv4'] })
    .required(),
  port: joi.number()
    .port()
    .required(),
});

/**
 * DOCUMENT SCHEMA
 * Document schema to validate document objects.
 * @usage const { error } = documentSchema.validate(document);
 */
const documentSchema = joi.object({
  type: joi.string()
    .valid('document')
    .required(),

  key: joi.string()
    .pattern(keyRegex)
    .required(),

  owner: joi.string()
    .pattern(keyRegex)
    .required(),

  timestamp: joi.date()
    .required(),

  title: joi.string()
    .min(5)
    .max(50)
    .required(),

  content: joi.string()
    .min(5)
    .max(2000)
    .required(),

  tags: joi.array()
    .items(joi.string())
    .required(),

  signature: joi.string()
    .length(88)
    .required()
    .allow(null),

});

/**
 * USER SCHEMA
 * User schema to validate user objects.
 * @usage const { error } = userSchema.validate(user);
 */
const userSchema = joi.object({
  type: joi.string()
    .valid('user')
    .required(),

  key: joi.string()
    .required()
    .pattern(keyRegex)
    .length(44),

  nickname: joi.string()
    .min(5)
    .max(50)
    .required()
    .allow(null),

  lastAddress: addressSchema
    .required()
    .allow(null),

  lastSeen: joi.date()
    .required()
    .allow(null),

  lastFeed: joi.string()
    .length(16)
    .required()
    .allow(null),
});

/**
 * FEED SCHEMA
 * Feed schema to validate feed objects.
 * @usage const { error } = feedSchema.validate(feed);
 */
const feedSchema = joi.object({
  type: joi.string()
    .valid('feed')
    .required(),

  key: joi.string()
    .pattern(keyRegex)
    .required(),

  owner: joi.string()
    .length(44)
    .pattern(keyRegex)
    .required(),

  timestamp: joi.date()
    .required(),

  documents: joi.array()
    .items(
      joi.string()
        .length(16),
    )
    .required(),

  signature: joi.string()
    .length(88)
    .required()
    .allow(null),
});

/**
 * Generic function to validate any item.
 * @param {*} item The item to validate (User, Feed, Document)
 * @returns True if the item is valid, false otherwise
 */
function validateItem(item) {
  if (!item) {
    return false;
  }

  if (item.type === 'document') {
    return documentSchema.validate(item);
  }

  if (item.type === 'user') {
    return userSchema.validate(item);
  }

  if (item.type === 'feed') {
    return feedSchema.validate(item);
  }

  return false;
}

module.exports = {
  documentSchema,
  userSchema,
  feedSchema,
  validateItem,
  keyRegex,
};
