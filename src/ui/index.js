// const webUI = require('./web/index');
const termUI = require('./term/index');
const headless = require('./headless/index');

let UI = null;

function selectUI(UIType) {
  // console.log('Selecting UIType:', UIType);
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

async function startUI(UIType) {
  UI = selectUI(UIType);

  if (UI) {
    await UI.start();
  }

  return UI;
}

module.exports = {
  startUI,
};
