const client = require('../../client/client');

const debugCommands = {
  profile: () => client.getProfile(),
  // user: () => client.getUser(),
  // feed: () => client.getFeed(),
  // posts: () => client.getPosts(),
  cache: () => client.getCache(),
};

async function handleDebug(args) {
  const [command, ...cargs] = args;

  const handler = debugCommands[command];

  if (handler) {
    return handler(cargs);
  }

  console.log('Invalid debug command');
  return null;
}

module.exports = {
  handleDebug,
};
