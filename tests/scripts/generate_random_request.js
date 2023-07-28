const { generateRandomDocument, getHash } = require('../../src/utils/utils');

const doc = generateRandomDocument();
const key = getHash(doc);
// console.log(`\n Key:\n${key} \n Doc:\n${JSON.stringify(doc)}`);

// GENERATE RANDOM REQUEST
const request = {
  requestType: 'put',
  requestData: {
    key,
    type: 'document',
    data: doc,
  },
};

console.log(`\n Request:\n${JSON.stringify(request)}`);
