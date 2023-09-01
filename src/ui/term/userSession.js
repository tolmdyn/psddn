const { askQuestion, setReadline } = require('./termUtils');
const client = require('../../client/client');

async function initUserSession(rl) {
  setReadline(rl);

  console.log('Would you like to CREATE a new user session or LOGIN to an existing one?');
  const choice = await askQuestion('Please enter "create" or "login": ');

  if (choice === 'create') {
    const nickname = await askQuestion('Enter a nickname: ');
    const password = await askQuestion('Enter a password: ');
    const userSession = await client.loginNewUser(nickname, password);
    return userSession;
  }

  if (choice === 'login') {
    const key = await askQuestion('Enter your key: ');
    const secret = await askQuestion('Enter your password: ');
    const userSession = await client.loginUser(key, secret);
    return userSession;
  }

  console.log('Invalid choice.');

  // loop until valid choice, could replace with while loop
  return initUserSession();
}

module.exports = {
  initUserSession,
};
