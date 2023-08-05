/**
 * @file Joi validation schemas for different objects. Used to validate items.
 * @module JoiSchemas
 * @requires joi
 * @todo Split into separate files, Add regex validations for strings
 */

const joi = require('joi');

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
 * @type {import('joi').ObjectSchema}
 */
const documentSchema = joi.object({
  type: joi.string()
    .valid('document')
    .required(),

  id: joi.string()
    .length(16)
    .required(),

  owner: joi.string()
    .length(16)
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
    .items(joi.string()),
});

/**
 * USER SCHEMA
 * User schema to validate user objects.
 * @type {import('joi').ObjectSchema}
 */
const userSchema = joi.object({
  type: joi.string()
    .valid('user')
    .required(),

  publicKey: joi.string()
    .required()
    .length(32),

  nickname: joi.string()
    .min(5)
    .max(50),

  lastAddress: addressSchema,

  lastSeen: joi.date(),
});

/**
 * FEED SCHEMA
 * Feed schema to validate user objects.
 * @type {import('joi').ObjectSchema}
 */
const feedSchema = joi.object({
  type: joi.string()
    .valid('feed')
    .required(),

  id: joi.string()
    .length(16)
    .required(),

  owner: joi.string()
    .length(16)
    .required(),

  timestamp: joi.date()
    .required(),

  documents: joi.array()
    .items(documentSchema)
    .required(),
});

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
};
