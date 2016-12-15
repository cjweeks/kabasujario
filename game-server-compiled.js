'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var GameObjects = require('./public/game.js');
var ServerGameLogic = GameObjects.ServerGameLogic;
var Player = GameObjects.Player;
var Block = GameObjects.Block;
var ServerPlayer = GameObjects.ServerPlayer;
var uuid = require('uuid/v1');

// the initial number of blocks to be generated when the game starts
var INITIAL_NUM_BLOCKS = 160;

// the time (in ms) between server updates
var SERVER_UPDATE_PERIOD = 45;

// define basic game container object
var _exports = module.exports = {
    games: {},
    numGames: 0,
    addGame: function addGame(game) {
        this.games[game.gameId] = game;
        this.numGames++;
    },
    removeGame: function removeGame(gameId) {
        delete this.games[gameId];
        this.numGames--;
    },
    removePlayer: function removePlayer(gameId, playerId) {
        if (!this.games[gameId]) {
            return;
        }
        this.games[gameId].removePlayer(playerId);
        if (!this.games[gameId].numPlayers) {
            console.log('Deleting game ' + gameId);
            delete this.games[gameId];
            this.numGames--;
        }
    }

};

// indicates the current simulated time, in seconds
_exports.localTime = 0;

// indicates the current delta time (time between renderings) in milliseconds
_exports.deltaTime = 0;

// indicates the time at which the last 'deltaTime' value was obtained
_exports.previousTime = new Date().getTime();

// create physics loop to increment simulated time
setInterval(function () {

    // reassign the delta time according to the current date
    var currentTime = new Date().getTime();
    _exports.deltaTime = currentTime - _exports.deltaTime;
    _exports.previousTime = currentTime;

    // increment the local time by the new delta time
    _exports.localTime += _exports.deltaTime / 1000.0;
}, GameObjects.TIMER_PERIOD);

/**
 * Sends a response to a ping from a player.
 * @param playerSocket The socket object of the player.
 * @param data The received ping data.
 */
_exports.onPing = function (playerSocket, data) {
    // resend a duplicate ping message
    playerSocket.emit('manual-ping', data);
};

/**
 * Passes input data from a player to the game logic
 * @param playerSocket The socket object of the player
 * who sent input.
 * @param data The data from the input.
 */
_exports.onInput = function (playerSocket, data) {
    // forward to game logic
    if (playerSocket && playerSocket.clientPlayerId && playerSocket.game && playerSocket.game.gameLogic) {
        playerSocket.game.gameLogic.processClientUpdate(playerSocket.clientPlayerId, data);
    }
};

/**
 * Processes data from an attach event.  The attached
 * block is removed from the list of blocks and passed
 * to the respective player.
 * @param playerSocket The socket object of the corresponding player.
 * @param data The data from the attach event.
 */
_exports.onAttach = function (playerSocket, data) {
    // check if the block is still in the array
    var gameLogic = playerSocket.game.gameLogic;
    if (gameLogic.blocks[data.blockId]) {
        // remove the block from the list
        delete gameLogic.blocks[data.blockId];

        // add the block to this copy of the player
        gameLogic.players[data.playerId].blocks.push(new Block(data.relativePosition.x, data.relativePosition.y));
    }
};

/**
 * Extracts data from a detach event, and passes this data to the
 * server game logic object for processing.
 * @param playerSocket The socket object for the respective player.
 * @param data The data from the detach.
 */
_exports.onDetach = function (playerSocket, data) {
    // remove and retrieve the most recently added block
    var gameLogic = playerSocket.game.gameLogic;
    if (!gameLogic.players[data.playerId]) {
        return;
    }
    gameLogic.detach(data.playerId);
};

/************************************** Game ******************************/
/**
 * This object contains simple information
 * about a gameLogic gameLogic, including its ID,
 * the list of players (identified by their IDs),
 * and the number of players in the gameLogic.  This
 * object also contains a reference to a unique
 * GameLogic object to simulate the physics of
 * the gameLogic.
 */

var Game = function () {

    /**
     * Creates a new game object with a unique
     * gameId and a new game logic object.
     */
    function Game(numBlocks) {
        _classCallCheck(this, Game);

        this.gameId = uuid();
        this.playerSockets = {};
        this.numPlayers = 0;
        this.gameLogic = new ServerGameLogic(this);
        this.gameLogic.generateBlocks(numBlocks);
    }

    /**
     * Adds a player's playerSocket object to the list of players.
     * @param playerSocket The player to add.
     */


    _createClass(Game, [{
        key: 'addPlayer',
        value: function addPlayer(playerSocket) {
            // add player to game object
            this.playerSockets[playerSocket.clientPlayerId] = playerSocket;
            this.numPlayers++;
            // add player to game logic object
            var players = this.gameLogic.players;
            players[playerSocket.clientPlayerId] = new ServerPlayer(this, playerSocket);

            // send a player added event to each client
            for (var playerId in players) {
                if (playerId != playerSocket.clientPlayerId && players.hasOwnProperty(playerId)) {
                    players[playerId].playerSocket.emit('player-added', {
                        clientPlayerId: playerSocket.clientPlayerId,
                        player: Player.lightCopy(players[playerSocket.clientPlayerId])
                    });
                }
            }
        }

        /**
         * Removes a player from the game.
         * @param playerId The id of the player to remove.
         */

    }, {
        key: 'removePlayer',
        value: function removePlayer(playerId) {
            // remove player from game object
            delete this.playerSockets[playerId];
            this.numPlayers--;
            // remove player from game logic object
            this.gameLogic.removePlayer(playerId);
        }

        /**
         * Starts updating the gameLogic on the server.
         */

    }, {
        key: 'start',
        value: function start() {
            setInterval(function () {
                this.gameLogic.update(new Date().getTime());
            }.bind(this), SERVER_UPDATE_PERIOD);
        }
    }]);

    return Game;
}();

/**
 * Creates a gameLogic with one player and begins the gameLogic.
 * @param playerSocket The playerSocket object of the player
 * who is creating the gameLogic.
 * @returns {Game} The newly created game object.
 */


_exports.createGame = function (playerSocket) {

    // create a new gameLogic object and add it to the list
    var game = new Game(INITIAL_NUM_BLOCKS);
    _exports.addGame(game);

    // add the player to the new game
    game.addPlayer(playerSocket);

    // start the gameLogic loop on the server
    game.start();

    console.log('New game created at time ' + game.gameLogic.localTime);
    return game;
};

/**
 * Removes the given game from the list
 * of current games.
 * @param gameId The ID of the game to remove.
 */
_exports.endGame = function (gameId) {
    var game = _exports.games[gameId];
    if (game) {
        _exports.removeGame(gameId);
    } else {
        console.log('Game could not be deleted because gameId was invalid');
    }
};

/**
 * Attempts to find a gameLogic for the given player
 * to join.  If no gameLogic can be found, a new gameLogic
 * is created.
 * @param playerSocket The playerSocket object for the
 * player who wishes to join a gameLogic.
 */
_exports.findGame = function (playerSocket) {
    var foundGame = false;
    var game = void 0;
    if (_exports.numGames > 0) {
        // try to find an open gameLogic
        for (var gameId in _exports.games) {
            // eliminate items in the prototype chain
            if (_exports.games.hasOwnProperty(gameId)) {
                var possibleGame = _exports.games[gameId];
                // check if the current gameLogic can handle more playerSockets
                if (possibleGame.numPlayers < GameObjects.MAX_PLAYERS_PER_GAME) {
                    foundGame = true;
                    possibleGame.addPlayer(playerSocket);
                    game = possibleGame;
                    break;
                }
            }
        }
    }
    // if no open games could be found, create a new gameLogic
    if (!foundGame) {
        game = this.createGame(playerSocket);
    }

    playerSocket.game = game;

    // tell the player they connected, giving them their id and the list of players
    var playersLightCopy = {};
    for (var playerId in game.gameLogic.players) {
        if (game.gameLogic.players.hasOwnProperty(playerId)) {
            playersLightCopy[playerId] = Player.lightCopy(game.gameLogic.players[playerId]);
        }
    }

    playerSocket.emit('connected', {
        clientPlayerId: playerSocket.clientPlayerId,
        serverTime: game.gameLogic.serverTime,
        players: playersLightCopy,
        blocks: game.gameLogic.blocks,
        solutionIndex: game.gameLogic.possibleSolutions.indexOf(game.gameLogic.solution)
    });
};

//# sourceMappingURL=game-server-compiled.js.map