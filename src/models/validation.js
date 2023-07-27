/**
 * @file Joi validation schemas for different objects. Used to validate items.
 * @module JoiSchemas
 * @requires joi
 * @todo Split into separate files, Add regex validations for strings
 */

const joi = require('joi');

/**
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
 * User schema to validate user objects.
 * @type {import('joi').ObjectSchema}
 */
const userSchema = joi.object({
  type: joi.string()
    .valid('user')
    .required(),

  pubkey: joi.string()
    .required()
    .length(64),

  nickname: joi.string()
    .min(5)
    .max(50),

  lastAddress: addressSchema
    .required(),

  lastSeen: joi.date()
    .required(),
});

/**
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

module.exports = { documentSchema, userSchema, feedSchema };
