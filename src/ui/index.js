/**
 * @fileoverview User Interface entry point, injects the required interface module
 * and starts it.
 *
 * Current options are:
 * * none: headless mode, no UI
 * * web: web UI (not yet implemented)
 * * term: interactive terminal UI
 * @module ui
 */

// const webUI = require('./web/index'); // not yet implemented
const termUI = require('./term/index');
const headless = require('./headless/index');

let UI = null;

/**
 * @description Select the UI to start from the options.
 * @param {string} UIType The type of UI to start ('none' | 'web' | 'terminal')
 * @returns The chosen UI module to the calling function
 */
function selectUI(UIType) {
  switch (UIType) {
    case null || 'none' || '':
      return headless;
    case 'web':
      return null; // webUI;
    case 'term':
      return termUI;
    default:
      throw new Error('Invalid UI type');
  }
}

/**
 * @description Start the UI.
 * @param {string} UIType The type of UI to start ('none' | 'web' | 'terminal')
 * @param {string} user The user key to login with (optional)
 * @param {string} secret The user password to login with (optional)
 * @returns The chosen UI instance to the calling function
 */
async function startUI(UIType, user, secret) {
  UI = selectUI(UIType);

  if (UI) {
    await UI.start(user, secret);
  }

  return UI;
}

module.exports = {
  startUI,
};
