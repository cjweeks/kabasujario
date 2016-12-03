


// The maximum number of players that may exist in one gameLogic gameLogic
const MAX_PLAYERS_PER_GAME = 10;

// The refresh rate of the standard timers (in ms)
const TIMER_PERIOD = 4;

// The refresh period of physics simulations (in ms)
const PHYSICS_UPDATE_PERIOD = 15;

// The period at which to perform pings of the server (in ms)
const PING_PERIOD = 1000;

// The expected frame rate of the simulation (in fps)
const FPS = 60; // TODO change this

// TODO remove this (?) currently not used
const MAX_DIRECTION_MAGNITUDE = 100;


/**
 * Returns true if the code is being run on the server.
 * @returns {boolean}
 */
function onServer() {
    return typeof window == 'undefined' || !window.document;
}


/*********************************** Vector ***********************************/

/**
 * Calculates the linear interpolation between the given valuesat the
 * specified interpolation point.
 * @param firstValue The first value.
 * @param secondValue The second value.
 * @param interpolationPoint A number between 0 and 1 that indicates
 * the point at which the interpolation is given. If this value is 0,
 * 'firstValue' is returned; if thi value is 1, 'secondValue' is returned.
 * @returns {string} The value o the linear interpolation at the given point.
 */
function interpolate(firstValue, secondValue, interpolationPoint) {
    interpolationPoint = (Math.max(0, Math.min(1, interpolationPoint)));
    return (firstValue + interpolationPoint * (secondValue - firstValue));
}

/**
 * Simple functions acting on a two-dimensional Vector.
 * A vector in this case is any object with numerical
 * properties 'x' and 'y'.
 */
const vector = {

    /**
     * Adds the two given vectors.
     * @param u the first vector.
     * @param v The second vector to add.
     * @returns {vector} A new vector, the result of u + v.
     */
    add: function (u, v) {
        return {
            x: u.x + v.x,
            y: u.y + v.y
        };
    },

    /**
     * Subtracts the two given vectors.
     * @param u the first vector.
     * @param v The second vector to subtract.
     * @returns {vector} A new vector, the result of u - v.
     */
    subtract: function (u, v) {
        return this.add(u, this.scalarMultiply(v, -1));
    },

    /**
     * Returns the euclidean magnitude of the given vector.
     * @param v the vector to measure.
     * @returns {number}
     */
    magnitude: function (v) {
        // console.log('mag: ' + Math.sqrt(Math.pow(v.x, 2) + Math.pow(v.y, 2)));
        return Math.sqrt(Math.pow(v.x, 2) + Math.pow(v.y, 2))
    },

    /**
     * Returns the unit Vector with the sample direction
     * as the given vector.
     * @returns {vector}
     */
    unitVector: function (v) {
        const magnitude = this.magnitude(v);
        if (magnitude == 0) {
            return {
                x: 0,
                y: 0
            }
        }
        return {
            x: v.x / magnitude,
            y: v.y / magnitude
        };
    },

    /**
     * Returns the result of multiplication of the given
     * vector and the given scalar.
     * @param v The vector to multiply.
     * @param scalar The scalar to multiply this Vector by.
     * @returns {vector} The new scaled vector after multiplication.
     */
    scalarMultiply: function (v, scalar) {
        return {
            x: v.x * scalar,
            y: v.y * scalar
        };
    },


    /**
     * Returns true if the given vector is teh zero vector
     * (both x and y components are zero).
     * @returns {boolean}
     */
    isZero: function (v) {
        return v.x == 0 && v.y == 0;
    },

    /**
     * Returns the linear interpolation between this vector
     * and the given vector.
     * @param u The starting vector.
     * @param v The ending vector.
     * @param interpolationPoint The point at which to perform
     * the interpolation (see interpolate() for more information)
     * @returns {vector} A new vector; the result of the interpolation.
     */
    interpolate: function (u, v, interpolationPoint) {
        return {
            x: interpolate(u.x, v.x, interpolationPoint),
            y: interpolate(u.y, v.y, interpolationPoint)
        };
    },

    /**
     * Returns a new vector from an arbitrary object having
     * both x and y properties.
     * @param object the object to create the vector from.
     * @returns {vector} A vector with the same components
     * as the input object.
     */
    generate: function (object) {
        return {
            x: object.x,
            y: object.y
        };
    },

    /**
     * Returns a vector given the x and y components.
     * @param x The x component (defaults to zero).
     * @param y The y component (defaults to zero).
     * @returns {{x: (*|number), y: (*|number)}} A vector
     * with the given components.
     */
    construct: function (x, y) {
        x = x|| 0;
        y = y || 0;
        return {
            x: x,
            y: y
        };
    },

    /**
     * Returns the given vector in string form
     * @param v the vector to return a string version of.
     * @returns {string} the components of v: '(v.x, v.y)'
     */
    print: function (v) {
        return '(' + v.x + ', ' + v.y + ')';
    }
};


/*********************************** Game Logic ***********************************/

// const world = {
//     width: 800,
//     height: 500
// };

const world = {
    width: 900,
    height: 900
};


/**
 * This object controls the physics of the
 * upper-level gameLogic object and is used on
 * both the client and the server.
 * @param game The upper-level gameLogic object
 * this object corresponds to.
 */
class GameLogic {
    constructor() {

        this.players = {};

        // The speed at which the clients move.
        this.maxPlayerSpeed = 100;

        //Set up some physics integration values
        this.physicsDeltaTime = 0.0001;
        this.physicsPreviousTime = new Date().getTime();

        //A local timer for precision on server and client
        this.localTime = 0.016;

        // the local delta time since the last timer tick
        this.deltaTime = new Date().getTime();

        // the local time of the previous timer tick
        this.previousTime = new Date().getTime();

        // begin processing the physics simulation
        this.startPhysics();

        // start the main timer
        this.startTimer();
    }

    /**
     * Removed a player from the list of players.
     * @param removePlayerId The id of the player to remove.
     */
    removePlayer(removePlayerId) {
        if (this.players[removePlayerId]) {
            delete this.players[removePlayerId];

            // send a notification to each player
            for (var playerId in this.players) {
                if (playerId != removePlayerId && this.players.hasOwnProperty(playerId)) {
                    this.players[playerId].playerSocket.emit('player-removed', {
                        clientPlayerId: removePlayerId
                    });
                }
            }
        } else {
            console.log('Could not remove player ' + removePlayerId);
        }
    }

    /**
     * Starts a high speed timer which updates the
     * delta time and local time values.
     */
    startTimer() {
        setInterval(function () {
            const currentTime = new Date().getTime();
            this.deltaTime = currentTime - this.previousTime;
            this.previousTime = currentTime;
            this.localTime += this.deltaTime / 1000.0;
        }.bind(this), TIMER_PERIOD);
    }
    /**
     * Starts a physics timer which updates the
     * physics delta time, previous time, and
     * updates the physics with a call to updatePhysics().
     */
    startPhysics() {
        setInterval(function(){
            const currentTime = new Date().getTime();
            this.physicsDeltaTime = (currentTime - this.physicsPreviousTime) / 1000.0;
            this.physicsPreviousTime = currentTime;
            this.updatePhysics();
        }.bind(this), PHYSICS_UPDATE_PERIOD);
    }

    update(time) {
        // determine the delta time values
        if (this.previousFrameTime) {
            this.deltaTime = ((time - this.previousFrameTime) / 1000.0);
        }
        else {
            this.deltaTime = 0.016; // TODO abstract this value
        }

        //Store the last frame time
        this.previousFrameTime = time;
    }


    // TODO restructure
    static checkCollisions(item) {

        //Left wall.
        if(item.position.x <= item.positionLimits.xMin) {
            item.position.x = item.positionLimits.xMin;
        }

        //Right wall
        if(item.position.x >= item.positionLimits.xMax ) {
            item.position.x = item.positionLimits.xMax;
        }

        //Roof wall.
        if(item.position.y <= item.positionLimits.yMin) {
            item.position.y = item.positionLimits.yMin;
        }

        //Floor wall
        if(item.position.y >= item.positionLimits.yMax ) {
            item.position.y = item.positionLimits.yMax;
        }
    }

    /**
     * Processes a string of the given player's inputs.
     * @param player The player to process.
     * @returns {vector} The displacement vector calculated
     * by summing each input direction.
     */
    processDirectionInputs(player) {
        if (!player) {
            console.log('NO PLAYER for id ' + this.clientPlayerId);
            return vector.construct();
        }
        var scaledDirection = vector.construct();
        if (player.inputs.length) {
            scaledDirection = vector.construct();
            for (var i = 0; i < player.inputs.length; i++) {
                var input = player.inputs[i];
                // only render inputs that have not yet been rendered
                if (input.number > player.lastRenderedInputNumber) {
                    // add each direction as a unit vector
                    scaledDirection = vector.add(scaledDirection, vector.unitVector(input.direction));
                }
            }
            // set the values in the player to reflect the new rendering
            var lastInput = player.inputs[player.inputs.length - 1];
            player.lastInputTime = lastInput.time;
            player.lastRenderedInputNumber = lastInput.number;
        }
        // return the displacement vector of the player
        return vector.scalarMultiply(scaledDirection, (this.maxPlayerSpeed * PHYSICS_UPDATE_PERIOD / 1000.0));
    }
}


/*********************************** Server Game Logic ***********************************/

class ServerGameLogic extends GameLogic {
    constructor(game) {
        super();
        this.game = game;
        if (this.game) {
            // add the current players from the game object
            for (var playerId in this.game.playerSockets) {
                if (this.game.playerSockets.hasOwnProperty(playerId)) {
                    this.players[playerId] = new ServerPlayer(this, this.game.playerSockets[playerId]);
                }
            }
        }
        this.inputs = [];
        this.serverTime = 0;
        this.previousState = {};
    }

    /**
     * Updates the game
     * @param time
     */
    update(time) {

        // call the client / server common updates
        super.update(time);
        //Update the state of our local clock to match the timer TODO explain
        this.serverTime = this.localTime;

        // create a lught copy of each player
        var playersLightCopy = {};
        for (var playerId in this.players) {
            if (this.players.hasOwnProperty(playerId)) {
                playersLightCopy[playerId] = Player.lightCopy(this.players[playerId]);
            }
        }

        // record the state of the game at the current time
        var state = {
            players: playersLightCopy,
            time: this.serverTime
        };
        // send the recorded state to each player
        for (var playerId in this.players) {
            if (this.players.hasOwnProperty(playerId)) {
                var player = this.players[playerId];
                if (player.playerSocket) {
                    player.playerSocket.emit('server-update', state);
                } else {
                    console.log('Error: could not find player playerSocket when updating');
                }
            }
        }
    }

    updatePhysics() {
        // update player positions
        for (var playerId in this.players) {
            if (this.players.hasOwnProperty(playerId)) {
                var player = this.players[playerId];
                // obtain a displacement from the set of inputs provided by the player
                var displacement = this.processDirectionInputs(player);

                player.position = vector.add(
                    player.position,
                    displacement
                );

                GameLogic.checkCollisions(player);
                // clear all inputs that we have processed
                player.inputs = [];
            }
        }
    }

    /**
     * Updates the server-side players from information
     * received from the client.
     * @param playerId The player id of the client update.
     * @param input The input object sent to the server.
     */
    processClientUpdate(playerId, input) {
        var player = this.players[playerId];
        if (!player) {
            return;
        }
        player.inputs.push(input);
    }
}

/*********************************** Client Game Logic ***********************************/

// TODO note that the inputs are cleared on the client side in 'processServerUpdatePosition'
class ClientGameLogic extends GameLogic {
    /**
     * Creates a new client game logic object.
     * @param camera the camera object used for tracking.
     */
    constructor(camera) {
        super();

        // the id of the player associated with this client instance
        this.clientPlayerId = '';

        // the player object identified by clientPlayerId
        this.clientPlayer = undefined;

        // TODO remove
        this.predictMovement = true;

        // the camera object that will allow us to draw the player at the center of the screen
        this.camera = camera;
        console.log(this.camera);

        // a reference to the two-dimensional context of the canvas ti render on
        this.context = {};

        // a vector containing the mouse direction relative to to the client player's position
        this.mousePosition = vector.construct();

        // the current input number; used to identify inputs recorded and sent to the server
        this.inputNumber = 0;

        // the amount to smooth client movement if it lags behind the server
        this.clientSmoothing = 5;

        // the net latency and ping between the client and server (initial values are placeholders)
        this.netLatency = 0.001;
        this.netPing = 0.001;
        this.previousPingTime = 0.001;




        // the amount of time (in ms) the other players lag behind the real server time in the client's rendering
        // this is done to allow for smooth interpolation of other players' movements
        this.clientServerOffset = 100;

        // the length (in seconds) of the server history buffer that the client keeps in 'serverUpdates'
        // the actual buffer size is the frame rate multiplied by this value
        this.bufferLength = 2;
        this.targetTime = 0.01;            //the time where we want to be in the server timeline

        // the oldest server update time in the server updates buffer
        this.oldestUpdateTime = 0.01;

        // the current server time minus the client server offset; this is the time at which other players are drawn
        this.clientTime = 0.01;

        // the server time, as retrieved from the last server update
        this.serverTime = 0.01;

        // recent server updates that allow for interpolation of player positions
        this.serverUpdates = [];

        // connect to the server using socket.io
        this.connect();


        // start the ping timer to record latency
        this.startPingTimer();

    }


    /**
     * This is the main update loop for the client.
     * It clears the canvas, records the client player's input,
     * processes the server's updates, updates the client's local
     * position, and finally re-draws everything.
     */
    update(time) {

        // perform server / client common updates
        super.update(time);

        // Clear the screen area
        this.context.clearRect(0,0, world.width, world.height);

        // get the client player's inputs
        this.recordInput();

        // update the remote players (and the client player if prediction is disabled)
        this.processServerUpdates();

        // update the client player's position if movement prediction is enabled
        this.updateLocalPosition();

        // update the camera object to reflect new positions
        this.camera.update();
        //console.log(this.camera);
        if (this.clientPlayer) {
            //console.log('(' + this.camera.xView + ', ' + this.camera.yView + ') : ' + vector.print(this.clientPlayer.position));
        }
        // draw every player
        this.drawPlayers();

        // schedule the next update
        this.scheduleUpdate();
    }


    /**
     * Starts a sequence of pings to determine connection quality
     * and adapt the local time.
     */
    startPingTimer() {
        setInterval(function(){
            this.previousPingTime = new Date().getTime();
            this.playerSocket.emit('manual-ping', {
                time: this.previousPingTime
            });
        }.bind(this), PING_PERIOD);
    };

    /**
     * Requests a new animation from with update() as the callback.
     */
    scheduleUpdate() {
        this.updateId = window.requestAnimationFrame(this.update.bind(this));
    }

    // TODO I think this doesn't have a purpose anymore after the recent updates
    updateLocalPosition() {
        if(this.predictMovement) {
            if (!this.clientPlayer) {
                return;
            }
            // determine the time since the last update
            var time = (this.localTime - this.clientPlayer.stateTime) / this.physicsDeltaTime;

            //Then store the states for clarity,
            var previousPosition = this.clientPlayer.previousState.position;

            GameLogic.checkCollisions(this.clientPlayer);
        }
    };


    /**
     * Draws each player.
     */
    drawPlayers() {
        for (var playerId in this.players) {
            if (this.players.hasOwnProperty(playerId)) {
                Player.draw(this.players[playerId], this.context, this.camera);
            }
        }
    }

    /**
     * Updates the physics of the client player.
     */
    updatePhysics() {
        if (!this.clientPlayer) {
            return;
        }

        // save the current state of the client player, and handle new inputs to determine a new position
        this.clientPlayer.previousState.position = vector.generate(this.clientPlayer.position);
        var displacement = this.processDirectionInputs(this.clientPlayer);
        this.clientPlayer.position = vector.add(this.clientPlayer.position, displacement);
        this.clientPlayer.stateTime = this.localTime;
    }

    /**
     * Records mouse input and appends it to the list of
     * unprocessed inputs; the new input is sent to the server.
     */
    recordInput() {
        if (!this.clientPlayer) {
            return;
        }

        // obtain the direction of movement by subtracting the mouse position from the player's position
        // this is the old way, before the camera was introduced
        // var mouseVector = vector.subtract(this.mousePosition, this.clientPlayer.position);
        var mouseVector = vector.subtract(
            this.mousePosition,
            vector.construct(
                this.clientPlayer.position.x - this.camera.xView,
                this.clientPlayer.position.y - this.camera.yView
            )
        );

        // TODO fix the below logic (do we want scalable velocity?)

        // turn this vector into a vector between 0 and 1 magnitude
        var mouseDirection = vector.scalarMultiply(mouseVector, 1);

        if (vector.magnitude(mouseDirection) > 1) {
            //mouseDirection = Vector.unitVector(mouseDirection);
        }
        // if the player's block is close enough to the mouse, interpret that as a direction of (0, 0)
        if (vector.magnitude(mouseDirection) < SQUARE_SIZE / 2) {
            mouseDirection = vector.construct();
        }

        // increase the input number before adding the next input
        this.inputNumber++;

        // store the input along with a time and the input number for identification
        var newInput = {
            time: this.localTime,
            direction: mouseDirection,
            number: this.inputNumber
        };

        // add the input to the array for later processing
        this.clientPlayer.inputs.push(newInput);

        // send the input to the server for processing
        this.playerSocket.emit('input', newInput);
    }

    /**
     * This handles the interpolation of players' positions by reading from server inputs.
     */
    processServerUpdates() {

        // return if no inputs exist
        if(!this.serverUpdates.length) {
            return;
        }

        // record the current local time
        var currentTime = this.clientTime;
        var targetUpdate = null;
        var previousUpdate = null;

        // find a set of updates which 'contain' the current time
        for(var i = 0; i < this.serverUpdates.length - 1; ++i) {
            var currentUpdate = this.serverUpdates[i];
            var nextUpdate = this.serverUpdates[i + 1];
            if(currentTime > currentUpdate.time && currentTime <= nextUpdate.time) {
                targetUpdate = nextUpdate;
                previousUpdate = currentUpdate;
                break;
            }
        }

        // if no target can be found, simply use the least recent update
        if(!targetUpdate) {
            console.log('using 0th update');
            targetUpdate = this.serverUpdates[0];
            previousUpdate = this.serverUpdates[0];
        }

        // set the new positions based on interpolation
        if(targetUpdate && previousUpdate) {

            // calculate the interpolation point (on [0, 1]) based on the
            // position of the current time with respect to both chosen times
            this.targetTime = targetUpdate.time;
            var difference = this.targetTime - currentTime;
            var maxDifference = (targetUpdate.time - previousUpdate.time);
            var interpolationPoint = 0;

            // set the interpolation point to the ratio of the actual difference to the max difference
            // if the max difference is zero, we simply keep the interpolation point at zero
            if (maxDifference != 0) {
                interpolationPoint = (difference / maxDifference);
            }

            if (interpolationPoint > 1) {
                // this indicates some sort of logical error has occurred
                console.log('Error: interpolation point > 1');
            }

            // get the most recent server update
            var lastServerUpdate = this.serverUpdates[this.serverUpdates.length - 1];

            // update each player
            for (var playerId in this.players) {
                // whether or not to allow the given player to have its position updated
                var allowPlayer = this.predictMovement || (playerId != this.clientPlayerId);
                if (allowPlayer && this.players.hasOwnProperty(playerId)) {
                    try {
                        // calculate the theoretical position of the current player
                        var playerTargetPosition = lastServerUpdate.players[playerId].position;
                        var playerPastPosition = previousUpdate.players[playerId].position;
                        var theoreticalPlayerPosition = vector.interpolate(
                            playerTargetPosition,
                            playerPastPosition,
                            interpolationPoint
                        );

                        // smooth the transition by interpolating between the client position and server position
                        this.players[playerId].position = vector.interpolate(
                            this.players[playerId].position,
                            theoreticalPlayerPosition,
                            this.physicsDeltaTime * this.clientSmoothing
                        );

                    } catch (error) {
                        // this probably means a player was added and the server records are inconsistent
                        // this error is ok if it only occurs a small number of times after a player is added
                        console.log('Caught server update history error' + error);
                    }
                }
            }
        }
    }

    /**
     * This allows the client to connect to the server
     * and establish a number of events to be triggered
     * under certain conditions.
     */
    connect() {

        // connect to the server
        this.playerSocket = io();

        // handle the disconnect event
        this.playerSocket.on('disconnect', this.onDisconnect.bind(this));

        // handle the reception of a server update
        this.playerSocket.on('server-update', this.onServerUpdate.bind(this));

        // handle the initial information transferred upon connection
        this.playerSocket.on('connected', this.onConnected.bind(this));

        // handle the addition of a player to the game
        this.playerSocket.on('player-added', this.onPlayerAdded.bind(this));

        // handle the removal of players from the game
        this.playerSocket.on('player-removed', this.onPlayerRemoved.bind(this));

        // handle the reception of a ping
        this.playerSocket.on('manual-ping', this.onPing.bind(this));
    }

    /**
     * Responds to a player added event by adding the new
     * player to the list.
     * @param data The event data.
     */
    onPlayerAdded(data) {
        // add the new player to the list of players
        this.players[data.clientPlayerId] = data.player;
    }

    /**
     * Responds to a player removed event by removing the player
     * from the list.
     * @param data The event data.
     */
    onPlayerRemoved(data) {
        // remove the player from the list of players
        console.log('removing player ' + data.clientPlayerId);
        delete this.players[data.clientPlayerId];
    }

    /**
     * Handles the transfer of information from server
     * to client when connection occurs.
     * @param data The data receive on connection.
     */
    onConnected(data) {
        // assign the client player's id and the array of players
        this.clientPlayerId = data.clientPlayerId;
        this.players = data.players;


        // create an actual player object for the client player
        this.players[this.clientPlayerId] = Player.lightCopy(this.players[this.clientPlayerId]);

        // assign the client player to the player identified by the client player id
        this.clientPlayer = this.players[this.clientPlayerId];

        // set the camera to track the client player
        this.camera.follow(this.clientPlayer, this.viewport.width / 2, this.viewport.height / 2);

        // obtain the server time based on ping data
        this.serverTime = data.time + this.netLatency;
    }

    /**
     * Updates the net ping and latency measures.
     * @param data The data received from a ping message.
     */
    onPing(data) {
        this.netPing = new Date().getTime() - data.time;
        this.netLatency = this.netPing / 2;
    }

    onDisconnect(data) {
        // TODO this is a stub
        console.log('disconnected: ' + this.clientPlayerId);
    }

    /**
     * Responds ot a server update event by recording the update
     * in the buffer and processing the update data.
     * @param update the server update data.
     */
    onServerUpdate(update){

        // store the server time (note this is affected by latency)
        this.serverTime = update.time;

        //Update our local offset time from the last server update
        this.clientTime = this.serverTime - (this.clientServerOffset / 1000);

        // store the update
        this.serverUpdates.push(update);

        // if the string of updates are too long, remove the least recent
        if(this.serverUpdates.length >= (FPS * this.bufferLength)) {
            this.serverUpdates.splice(0,1);
        }

        // update the oldest time still accurately recorded
        this.oldestUpdateTime = this.serverUpdates[0].time;

        //Handle the latest positions from the server
        //and make sure to correct our local predictions, making the server have final say.
        this.processServerUpdatePosition();
    }

    /**
     * Aligns the client with the server by identifying the common
     * player inputs, rendering them, and removing them
     */
    processServerUpdatePosition() {
        if (!this.clientPlayer || !this.serverUpdates.length) {
            return;
        }

        //console.log('processing server update');
        var latestServerUpdate = this.serverUpdates[this.serverUpdates.length - 1];

        // obtain the most recent server position of the client player
        var serverPosition = latestServerUpdate.players[this.clientPlayerId].position;

        var serverLastRenderedInputNumber = latestServerUpdate.players[this.clientPlayerId].lastRenderedInputNumber;
        if (serverLastRenderedInputNumber) {
            // locate where the last rendered server update happens in the local updates array
            var latestServerUpdateIndex = -1;
            for (var i = 0; i < this.clientPlayer.inputs.length; i++) {
                if (this.clientPlayer.inputs[i].number == serverLastRenderedInputNumber) {
                    latestServerUpdateIndex = i;
                    break;
                }
            }

            // remove updates we have already processed locally
            if (latestServerUpdateIndex > 0) {
                // remove the inputs already processed on the server
                this.clientPlayer.inputs.splice(0, latestServerUpdateIndex + 1);
                // change the position to the latest server position
                this.clientPlayer.position = vector.generate(serverPosition); // TODO keep this?
                this.clientPlayer.lastRenderedInputNumber = latestServerUpdateIndex;
                // trigger another update to read the remaining inputs
                this.updatePhysics();
                this.updateLocalPosition();
            }
        }
    }
}


/*********************************** Player ***********************************/

const SQUARE_SIZE = 8;

class Player {
    constructor() {
        // set initial current state values
        this.position = vector.construct(20, 20);
        this.size = vector.construct(SQUARE_SIZE, SQUARE_SIZE);
        this.color = 'rgb(255,255,255)';

        // store the previous state of the player
        this.previousState = {
            position: vector.construct()
        };
        this.stateTime = new Date().getTime();

        // store the input history
        this.inputs = [];
        this.lastRenderedInputNumber = 0;
        this.lastInputTime = new Date().getTime();

        // TODO move this from player
        this.positionLimits = {
            xMin: this.size.x,
            xMax: world.width - this.size.x,
            yMin: this.size.y,
            yMax: world.height - this.size.y
        };
    }

    /**
     * Draws the given player.
     * @param player The player object to draw.
     * @param context The context in which to draw.
     * @param camera the camera object used for offsetting
     * the players position to reflect a centered client player.
     */
    static draw(player, context, camera) {
        context.fillStyle = player.color;
        context.fillRect(
            player.position.x - player.size.x / 2 - camera.xView,
            player.position.y - player.size.y / 2 - camera.yView,
            player.size.x,
            player.size.y
        );
    }

    /**
     * Creates a new Player from a ServerPlayer or Player object.
     * @param player The player object to copy.
     * @returns {Player}
     */
    static lightCopy(player) {
        var copy = new Player();
        Object.assign(copy.position, player.position);
        Object.assign(copy.previousState.position, player.previousState.position);
        Object.assign(copy.inputs, player.inputs);
        copy.lastRenderedInputNumber = player.lastRenderedInputNumber;
        copy.lastInputTime = player.lastInputTime;
        return copy;
    }
}

/**
 * An extension of the normal player object, containing
 * references to the player's socket object as well as
 * the player's corresponding game object.  This information
 * is only useful on the server.
 */
class ServerPlayer extends Player {
    /**
     * Creates a new server player.
     * @param game The game object corresponding to the game
     * this player is in.
     * @param playerSocket the socket object corresponding to
     * this player.
     */
    constructor(game, playerSocket) {
        super();
        this.playerSocket = playerSocket;
        this.game = game;
    }
}


/*********************************** Initializations ***********************************/

if (onServer()) {
    // export information if we are on the server
    module.exports = {
        TIMER_PERIOD: TIMER_PERIOD,
        MAX_PLAYERS_PER_GAME: MAX_PLAYERS_PER_GAME,
        ServerGameLogic: ServerGameLogic,
        ClientGameLogic: ClientGameLogic,
        Player: Player,
        ServerPlayer: ServerPlayer
    };
} else {
    // fix request animation frame issues on the client
    (function () {

        var framePeriod = FPS / 1000;
        var lastTime = 0;
        var vendors = ['ms', 'moz', 'webkit', 'o'];

        for (var x = 0; x < vendors.length && !window.requestAnimationFrame; x++) {
            window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
            window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] ||
                window[vendors[x] + 'CancelRequestAnimationFrame'];
        }

        if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = function (callback, element) {
                var currentTime = Date.now();
                var waitTime = Math.max(0, framePeriod - (currentTime - lastTime));
                var id = window.setTimeout(function() {
                    callback(currentTime + waitTime);
                }, waitTime);
                lastTime = currentTime + waitTime;
                return id;
            };
        }

        if (!window.cancelAnimationFrame) {
            window.cancelAnimationFrame = function (id) {
                clearTimeout(id);
            };
        }

    }());
}