# kabasujario
CS 4241 Project

## Setup

Clone the repository and install the node modules: `npm install`.

## Transpiling
This project uses ECMAScript 6 and must be transpiled in order to run.  This can be done automatically using a
file watcher in an IDE or manually using the `build.sh` script provided.  To run this script, simply execute `npm run build`.
This will generate a set of `*-compiled.js` files as well as a set of `*.js.map` files, which are used on the client side.
To remove these generated files, simply execute `npm run clean`.

To run the server, execute the following: `node -r babel-register app.js`.



