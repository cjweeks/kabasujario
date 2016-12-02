var express = require('express');
var http = require('http');
var app = express();
var server = http.createServer(app);
var io = require('socket.io')(server);
const uuid = require('uuid/v1');
var gameServer = require('./game-server.js');
var port = process.env.PORT || 8080;

// handle express logic
// send index on request for '/'
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

// send public files on request
app.use('/public', express.static(__dirname + '/public'));

// start the server
server.listen(port, function () {
    console.log('Started inServer on ' + port);
});

// handle the socket connection
io.on('connection', function (clientSocket) {
    // create an id for the new player
    clientSocket.clientPlayerId = uuid();

    console.log('Player ' + clientSocket.clientPlayerId + ' connected');

    // find a gameLogic for the new player
    gameServer.findGame(clientSocket);

    clientSocket.on('manual-ping', function (data) {
        gameServer.onPing(clientSocket, data);
    });

    clientSocket.on('input', function (data) {
        gameServer.onInput(clientSocket, data);
    });

    clientSocket.on('disconnect', function () {
        console.log('Player ' + clientSocket.clientPlayerId + ' disconnected');

        // alert the gameLogic that the player has left
        if(clientSocket.game && clientSocket.game.gameId) {

            // player leaving a gameLogic should destroy that gameLogic
            gameServer.removePlayer(clientSocket.game.gameId, clientSocket.clientPlayerId);

        } else {
            console.log('Tried to remove player ' + clientSocket.clientPlayerId + ' but could not find associated game.');
        }
    });
});
