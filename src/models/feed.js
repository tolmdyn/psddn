const joi = require('joi');

const { keyRegex } = require('./match');

/**
 * @fileoverview Feed schema to validate feed objects.
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

module.exports = {
  feedSchema,
};
