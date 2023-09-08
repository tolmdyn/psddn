/**
 * @description This file contains the functions for encrypting and decrypting data using a
 * password. It is used to encrypt and decrypt the user's private key, so that it can be stored
 * in the database without being visible to anyone who has access to the database. These are to
 * demonstrate security for testing but are not suitable for production.
 *
 * These functions are based on the example code from the Node.js documentation:
 * https://nodejs.org/api/crypto.html#crypto_crypto_pbkdf2sync_password_salt_iterations_keylen_digest
 * https://nodejs.org/api/crypto.html#crypto_class_cipher
 * https://nodejs.org/api/crypto.html#crypto_class_decipher
 *
 * @usage
 *  const plaintext = 'This is a secret phrase. It isnt very long.';
 *  const password = 'password';
 *  const encrypted = encryptWithPassword(password, plaintext);
 *  const result = decryptWithPassword(password, encrypted);
*/

const crypto = require('crypto');

/**
 * @param {string} password The password from the user to encrypt with
 * @param {string} data The data to encrypt (a string only)
 * @returns {string} The encrypted data object (containing tag, salt, iv) as a string
 */
function encryptWithPassword(password, data) {
  // Generate a key using PBKDF2
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

  // Create an AES-GCM cipher
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);

  // Encrypt the plaintext
  let encryptedData = cipher.update(data, 'utf-8', 'base64');
  encryptedData += cipher.final('base64');
  const tag = cipher.getAuthTag().toString('base64');

  return JSON.stringify({
    encryptedData,
    tag,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
  });
}

/**
 * @description Decrypts a data object using a password
 * @param {string} password The password from the user to decrypt with
 * @param {string} input The encrypted data object (containing tag, salt, iv) as a string
 * @returns {string} The decrypted data as a string
 */
function decryptWithPassword(password, input) {
  const parsedData = JSON.parse(input);

  const { encryptedData, tag } = parsedData;
  const salt = Buffer.from(parsedData.salt, 'base64');
  const iv = Buffer.from(parsedData.iv, 'base64');

  try {
    const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    let decryptedData = decipher.update(encryptedData, 'base64', 'utf-8');
    decryptedData += decipher.final('utf-8');
    return decryptedData;
  } catch (err) {
    throw new Error('Invalid password');
  }
}

module.exports = {
  encryptWithPassword,
  decryptWithPassword,
};
