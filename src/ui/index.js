// const webUI = require('./web/index');
const termUI = require('./term/index');

let UI = null;

function selectUI(UIType) {
  // console.log('Selecting UIType:', UIType);
  switch (UIType) {
    case null || 'none' || '':
      return null;
    case 'web':
      return null; // webUI;
    case 'term':
      return termUI;
    default:
      throw new Error('Invalid UI type');
  }
}

function startUI(UIType) {
  UI = selectUI(UIType);
  if (UI) {
    UI.start();
  }

  return UI;
}

module.exports = {
  startUI,
};
