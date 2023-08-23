/**
 * @description: Test for document validations
 */

const { expect } = require('chai');

// import the document schema
const { documentSchema } = require('../src/models/document');
const { generateRandomDocument } = require('./scripts/generate');

describe('Document Validation Tests', () => {
  it('should validate a valid document', () => {
    const doc = generateRandomDocument();
    const { error } = documentSchema.validate(doc);
    expect(error).to.be.undefined;
  });

  it('should not validate a document with an invalid type', () => {
    const doc = generateRandomDocument();
    doc.type = 'invalid';
    const { error } = documentSchema.validate(doc);
    expect(error).to.not.be.undefined;
  });

  it('should not validate a document with an invalid id', () => {
    const doc = generateRandomDocument();
    doc.id = 'invalid';
    const { error } = documentSchema.validate(doc);
    expect(error).to.not.be.undefined;
  });

  it('should not validate a document with an invalid owner', () => {
    const doc = generateRandomDocument();
    doc.owner = 'invalid';
    const { error } = documentSchema.validate(doc);
    expect(error).to.not.be.undefined;
  });

  it('should not validate a document with an invalid timestamp', () => {
    const doc = generateRandomDocument();
    doc.timestamp = 'invalid';
    const { error } = documentSchema.validate(doc);
    expect(error).to.not.be.undefined;
  });

  it('should not validate a document with an invalid title', () => {
    const doc = generateRandomDocument();
    doc.title = 123;
    const { error } = documentSchema.validate(doc);
    expect(error).to.not.be.undefined;
  });

  it('should not validate a document with an invalid content (int)', () => {
    const doc = generateRandomDocument();
    doc.content = 123;
    const { error } = documentSchema.validate(doc);
    expect(error).to.not.be.undefined;
  });

  it('should not validate a document with invalid tags (int)', () => {
    const doc = generateRandomDocument();
    doc.tags = 123;
    const { error } = documentSchema.validate(doc);
    expect(error).to.not.be.undefined;
  });

  it('should not validate a document with invalid tags (int in array)', () => {
    const doc = generateRandomDocument();
    doc.tags = [123];
    const { error } = documentSchema.validate(doc);
    expect(error).to.not.be.undefined;
  });

  it('should not validate a document with invalid tags (object in array)', () => {
    const doc = generateRandomDocument();
    doc.tags = [{ invalid: true }];
    const { error } = documentSchema.validate(doc);
    expect(error).to.not.be.undefined;
  });

  it('should not validate a document with invalid tags (mixed types)', () => {
    const doc = generateRandomDocument();
    doc.tags = ['invalid', 123];
    const { error } = documentSchema.validate(doc);
    expect(error).to.not.be.undefined;
  });
});
