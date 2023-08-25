/**
 * USER SCHEMA
 * User schema to validate user objects.
 * @usage const { error } = userSchema.validate(user);
 */

const joi = require('joi');

const { keyRegex } = require('./match');
/**
 * ADDRESS SCHEMA
 * Address schema to validate IP address and port.
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

module.exports = {
  userSchema,
  addressSchema,
};