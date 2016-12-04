
var GameObjects = require('./public/game.js');
var ServerGameLogic = GameObjects.ServerGameLogic;
var Player = GameObjects.Player;
var ServerPlayer = GameObjects.ServerPlayer;

const uuid = require('uuid/v1');


const INITIAL_NUM_BLOCKS = 60;


// define basic game container object
var exports = module.exports = {
    games: {},
    numGames: 0,
    addGame: function (game) {
        this.games[game.gameId] = game;
        this.numGames++;
    },
    removeGame: function (gameId) {
        delete this.games[gameId];
        this.numGames--;
    },
    removePlayer: function (gameId, playerId) {
        this.games[gameId].removePlayer(playerId);
    }

};

const SERVER_UPDATE_PERIOD = 45;

// indicates the current simulated time, in seconds
exports.localTime = 0;

// indicates the current delta time (time between renderings) in milliseconds
exports.deltaTime = 0;

// indicates the time at which the last 'deltaTime' value was obtained
exports.previousTime = new Date().getTime();

// create physics loop to increment simulated time
setInterval(function () {

    // reassign the delta time according to the current date
    const currentTime = new Date().getTime();
    exports.deltaTime = currentTime - exports.deltaTime;
    exports.previousTime = currentTime;

    // increment the local time by the new delta time
    exports.localTime += exports.deltaTime / 1000.0;

}, GameObjects.TIMER_PERIOD);

/**
 * Sends a response to a ping from a player.
 * @param playerSocket The socket object of the player.
 * @param data The received ping data.
 */
exports.onPing = function (playerSocket, data) {
    // resend a duplicate ping message
    playerSocket.emit('manual-ping', data);
};

/**
 * Passes input data from a player to the game logic
 * @param playerSocket The socket object of the player
 * who sent input.
 * @param data The data from the input.
 */
exports.onInput = function (playerSocket, data) {
    // forward to game logic
    if (playerSocket && playerSocket.clientPlayerId && playerSocket.game && playerSocket.game.gameLogic) {
        playerSocket.game.gameLogic.processClientUpdate(playerSocket.clientPlayerId, data);
    }
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
class Game {

    /**
     * Creates a new game object with a unique
     * gameId and a new game logic object.
     */
    constructor(numBlocks) {
        this.gameId = uuid();
        this.playerSockets = {};
        this.numPlayers = 0;
        this.gameLogic = new ServerGameLogic(this);
        this.gameLogic.generateBlocks(numBlocks)
    }

    /**
     * Adds a player's playerSocket object to the list of players.
     * @param playerSocket The player to add.
     */
    addPlayer(playerSocket) {
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
    removePlayer(playerId) {
        // remove player from game object
        delete this.playerSockets[playerId];
        this.numPlayers--;
        // remove player from game logic object
        this.gameLogic.removePlayer(playerId);
    }

    /**
     * Starts updating the gameLogic on the server.
     */
    start() {
        setInterval(function () {
            this.gameLogic.update(new Date().getTime());
        }.bind(this), SERVER_UPDATE_PERIOD);

    }
}


/**
 * Creates a gameLogic with one player and begins the gameLogic.
 * @param playerSocket The playerSocket object of the player
 * who is creating the gameLogic.
 * @returns {Game} The newly created game object.
 */
exports.createGame = function(playerSocket) {

    // create a new gameLogic object and add it to the list
    var game = new Game(INITIAL_NUM_BLOCKS);
    exports.addGame(game);

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
exports.endGame = function(gameId) {
    var game = exports.games[gameId];
    if (game) {
        exports.removeGame(gameId);
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
exports.findGame = function(playerSocket) {
    var foundGame = false;
    var game;
    if(exports.numGames > 0) {
        // try to find an open gameLogic
        for (var gameId in exports.games) {
            // eliminate items in the prototype chain
            if (exports.games.hasOwnProperty(gameId)) {
                var possibleGame = exports.games[gameId];
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
    if(!foundGame) {
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
        blocks: game.gameLogic.blocks
    });
};