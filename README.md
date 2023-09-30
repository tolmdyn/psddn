# Peer-to-Peer Structured Data Distribution Network

## Overview
A decentralised peer-to-peer text document sharing application.
Built in JavaScript using Node.js.

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Testing](#testing)
- [CLI Options](#cli-options)
- [TUI Commands](#tui-commands)
- [License](#license)
<!-- - [Project Structure](#project-structure)
- [Contributing](#contributing) -->

## Features
- **Peer-to-Peer:** Peers can connect to each other and share items via a cache of peers and a global distributed hash table.
- **Decentralised:** No central server is required to run the application, as long as bootstrappable nodes are online.
- **Persistent Storage:** Items are stored locally in a SQLite database. 
- **Feeds:** New items are published to a feed, which can be subscribed to by other peers.
- **Profiles:** Users have a persistent profile, which contains a list of their feeds and a list of users they follow.
- **Authentication:** Accounts and items are authenticated using ed25519 public-key cryptography.


### Prerequisites
- Node.js and npm installed on your system.
- To access the network, you will need to know the IP address of at least one peer on the network, and add to the bootstrap file.
- To allow external peers to access your local server, you will probably need to port forward and add firewall rules, as holepunching is not yet implemented.

### Installation
1. Clone this repository.
2. Navigate to the project directory using your terminal.
3. Install dependencies with `npm install`.

## Usage

Run the application: `npm start` or `./app/psddn.js --help`.  

## Testing

Run the tests: `npm test` or `npm run test:<name of module>`.  

Test report: `npm run test:report`.  

[Test Results](https://tolmdyn.github.io/psddn/mochawesome.html) saved to `./mochawesome-report/mochawesome.html`.

### CLI options:
```
Usage: psddn [options]

Options:
  -a, --address <address>      Specify the IP address of the server
  -p, --port <port>            Specify the port of the server
  -db, --dbname <dbname>       Specify the name of the database instance
  -b, --bootstrap <bootstrap>  Specify the bootstrap peers file
  -i, --interface <interface>  Choose the user interface to use (none, web terminal)
  -d, --debug                  Enable debug mode
  -u, --user <user>            Specify the user key to login with
  -s, --secret <secret>        Specify the user password to login with
  -h, --help                   display help for command
  ```

### TUI Commands:

Available commands:

`get` 
`put` 
`publish` 
`newPost` 
`followUser` 
`unfollowUser` 
`getFollowedFeeds` 
`getFollowedUsers` 
`getFollowedDocuments` 
`getUserDocuments`
`debug` 
`help` 
`exit` 

Debug commands:

`profile` 
`users` 
`documents` 
`cache` 
`hand` 
`ping` 
`help`  

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
