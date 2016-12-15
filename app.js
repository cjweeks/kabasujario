const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);
const uuid = require('uuid/v1');
const gameServer = require('./game-server.js');
const port = process.env.PORT || 8080;
const bodyParser = require('body-parser');

// In order to read body of post request with user name
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

// handle express logic
// send index on request for '/'
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/index.html', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/game.html', function (req, res) {
    res.redirect(__dirname + '/');
});

app.post('/game', function(req, res) {
    console.log('got post req');
    // Print the name the user entered
    // Not sure if this is useful at all, or where to pass this value..
    console.log("Name: " + req.body.name);
    res.sendFile(__dirname + "/game.html");
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

    clientSocket.on('attach', function (data) {
        gameServer.onAttach(clientSocket, data);
    });

    clientSocket.on('detach', function (data) {
        gameServer.onDetach(clientSocket, data);
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

    clientSocket.on('playername', function(data){

        if(clientSocket.game){
            clientSocket.game.gameLogic.players[clientSocket.clientPlayerId].name = data.name;
            console.log("NAME: " + data.name);
        }
    });
});
