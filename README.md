# kabasujario
CS 4241 Project

# Team
Connor Weeks, Alex Kasparek, Kunal Shah

## Setup

Clone the repository and install the node modules: `npm install`.

## Transpiling
This project uses ECMAScript 6 and must be transpiled in order to run.  This can be done automatically using a
file watcher in an IDE or manually using the `build.sh` script provided.  To run this script, simply execute `npm run build`.
This will generate a set of `*-compiled.js` files as well as a set of `*.js.map` files, which are used on the client side.
To remove these generated files, simply execute `npm run clean`.

To run the server, execute the following: `node -r babel-register app.js`.

# Gameplay

To play the game, simply type in the url of the game in the browser (port 8080).You will be prompted to enter a name, and can then click the "Start Game!" button to enter a game. This is a realtime multiplayer game, so there may potentially already be other players participating in the game.

Once you have joined the game you will be represented by a blue square. You can take the following actions:

- Move: position your mouse cursor on the screen to move in that direction
- Attach to blocks: press 'c' when near a light blue stationary block object
- Detach from blocks: press 'shift + c' to detach the most recent block you have attached to (i.e. they pop off in LIFO order)
- Complete the puzzle piece: In the center of the map there is a grid with the shape of a puzzle piece outlined. If you attach to blocks in the same configuration as the puzzle piece, then hover over the puzzle piece outline, your shape will be reset and you will be awarded some amount of points

Points for all players currently playing the game will be displayed in a ledaerboard in the top right corner of the screen (along with their name). Once any player completes the puzzle piece and is awarded points, the puzzle piece will automatically be replaced with another puzzle piece (these are selected at random from a set of predefined piece outlines).
