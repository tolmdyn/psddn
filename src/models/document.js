/**
 * @fileoverview Document schema to validate document objects.
 * @usage const { error } = documentSchema.validate(document);
 */

const joi = require('joi');

const { keyRegex } = require('./match');

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

module.exports = {
  documentSchema,
};
