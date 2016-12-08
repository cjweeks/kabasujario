

// The maximum number of players that may exist in one gameLogic gameLogic
const MAX_PLAYERS_PER_GAME = 10;

// The refresh rate of the standard timers (in ms)
const TIMER_PERIOD = 4;

// The refresh period of physics simulations (in ms)
const PHYSICS_UPDATE_PERIOD = 15;

// The period at which to perform pings of the server (in ms)
const PING_PERIOD = 1000;

// The expected frame rate of the simulation (in fps)
const FPS = 60;

// the size of each player and block
const SQUARE_SIZE = 40;

// the outline size of both players and blocks
const OUTLINE_SIZE = 4;

// the distance between attached squares of a player
const SQUARE_SEPARATION = SQUARE_SIZE + OUTLINE_SIZE / 2;

// the fill color of the player's square
const SQUARE_COLOR_PLAYER = 'rgb(45, 48, 146)';

// the fill color of blocks
const SQUARE_COLOR_BLOCK = 'rgb(0, 173, 238)';

// the fill color of solutions blocks
const SQUARE_COLOR_SOLUTION = 'rgb(120, 120, 120)';

// the default outline color of a player
const SQUARE_OUTLINE_COLOR_DEFAULT = 'rgb(255, 255, 255)';

// the color representing the active edge of a player (the edge that may attach to a block)
const SQUARE_OUTLINE_COLOR_ACTIVE = 'rgb(255, 40, 242)';

// the maximum distance a player can be from a block to attach to it.
const MAX_PICKUP_DISTANCE = 2 * SQUARE_SIZE;

const MAX_HEALTH = 100;

/**
 * Returns true if the code is being run on the server.
 * @returns {boolean}
 */
function onServer() {
    return typeof window == 'undefined' || !window.document;
}

// load the uuid module is we are on the server for block generation
let uuid;
if (onServer()) {
    uuid = require('uuid/v1');
}

/*********************************** Edge ***********************************/

/**
 * Specifies a set of directions corresponding to edges of squares / blocks. This is used for highlughting
 * certain edges as well as attaching blocks to players.
 */
const edge = {
    TOP: 'top',
    BOTTOM: 'bottom',
    LEFT: 'left',
    RIGHT: 'right',
    NONE: 'none',
    ALL: 'all',
    /**
     * Returns true if the given value is a valid edge.
     * @param edge the value to check.
     * @returns {boolean}
     */
    valid: function (edge) {
        return edge == this.TOP || edge == this.BOTTOM || edge == this.LEFT || edge == this.RIGHT;
    },

    /**
     * Returns the edge value opposite to the given edge.
     * @param edge The edge to find the opposite of.
     * @returns {*} The opposite edge value.
     */
    opposite: function (edge) {
        let opposite = this.NONE;
        if (edge == this.TOP) {
            opposite = this.BOTTOM;
        } else if (edge == this.BOTTOM) {
            opposite = this.TOP;
        } else if (edge == this.LEFT) {
            opposite = this.RIGHT;
        } else if (edge == this.RIGHT) {
            opposite = this.LEFT;
        }
        return opposite;
    },

    /**
     * Returns an edge given a direction vector between two objects.
     * @param direction The vector pointing from the object of analysis
     * (the object we wish to assign an edge to) and the secondary object.
     * @returns {*} The edge passed through from traversing the vector.
     */
    getEdgeFromDirection: function (direction) {
        let edge;
        if (direction.x > 0) {
            if (Math.abs(direction.y) < direction.x) {
                edge = this.LEFT;
            } else if (direction.y >= direction.x) {
                edge = this.TOP;
            } else {
                edge = this.BOTTOM;
            }
        } else {
            if (Math.abs(direction.y) < -direction.x) {
                edge = this.RIGHT;
            } else if (direction.y >= -direction.x) {
                edge = this.TOP;
            } else {
                edge = this.BOTTOM;
            }
        }
        return edge;
    },

    /**
     * Creates an object of colors for outlining a rectangle.
     * @param edge The edge that will be highlighted.
     * @param edgeColor The highlighting color of the provided edge.
     * @param defaultColor The color of the non-highlighted edges.
     * @returns {*} An object consisting of each edge-color pair.
     */
    formatColors: function (edge, edgeColor, defaultColor) {
        let colors;
        if (edge == this.TOP) {
            colors = {
                top: edgeColor,
                bottom: defaultColor,
                left: defaultColor,
                right: defaultColor
            }
        } else if (edge == this.BOTTOM) {
            colors = {
                top: defaultColor,
                bottom: edgeColor,
                left: defaultColor,
                right: defaultColor
            }
        } else if (edge == this.LEFT) {
            colors = {
                top: defaultColor,
                bottom: defaultColor,
                left: edgeColor,
                right: defaultColor
            }
        } else if (edge == this.RIGHT) {
            colors = {
                top: defaultColor,
                bottom: defaultColor,
                left: defaultColor,
                right: edgeColor
            }
        } else {
            colors = {
                top: defaultColor,
                bottom: defaultColor,
                left: defaultColor,
                right: defaultColor
            }
        }
        return colors;
    },

    /**
     * Returns a unit vector equal to the relative position of
     * the given edge to (0, 0).
     * @param edge The edge to find the relative position of.
     * @returns {*|{x: (*|number), y: (*|number)}} The relative
     * position unit vector.
     */
    getRelativePosition: function (edge) {
        let relativePosition = vector.construct();
        if (edge == this.TOP) {
            relativePosition = vector.construct(0, -1);
        } else if (edge == this.BOTTOM) {
            relativePosition = vector.construct(0, 1);
        } else if (edge == this.RIGHT) {
            relativePosition = vector.construct(1, 0);
        } else if (edge == this.LEFT) {
            relativePosition = vector.construct(-1, 0);
        }

        return relativePosition;
    }
};

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
 * Returns a random integer in the given interval.
 * @param min The minimum possible value (inclusive)
 * @param max The maximum possible value (exclusive).
 * @returns {number}
 */
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
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
        x = x || 0;
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

const world = {
    width: 4000,
    height: 4000
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
        this.blocks = {};

        this.solution = [
            vector.construct(),
            vector.construct(0, 1),
            vector.construct(0, 2),
            vector.construct(1, 0),
            vector.construct(2, 0),
            vector.construct(2, 1)
        ];

        // set up movement constants
        this.MAX_DIRECTION_MAGNITUDE = 400.0;
        this.MAX_PLAYER_SPEED = 300;


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
            for (let playerId in this.players) {
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
            this.localTime += this.deltaTime;
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
            this.physicsDeltaTime = currentTime - this.physicsPreviousTime;
            this.physicsPreviousTime = currentTime;
            this.updatePhysics();
        }.bind(this), PHYSICS_UPDATE_PERIOD);
    }

    update(time) {
        // determine the delta time values
        if (this.previousFrameTime) {
            this.deltaTime = (time - this.previousFrameTime);
        }
        else {
            this.deltaTime = 0.015; // TODO abstract this value (this is just an initial value)
        }

        //Store the last frame time
        this.previousFrameTime = time;
    }


    static checkCollisions(blockObject) {

        // left wall collision
        if(blockObject.position.x <= SQUARE_SIZE) {
            blockObject.position.x = SQUARE_SIZE;
        }

        // right wall collision
        if(blockObject.position.x >= world.width - SQUARE_SIZE) {
            blockObject.position.x = world.width - SQUARE_SIZE;
        }

        // top wall collision
        if(blockObject.position.y <= SQUARE_SIZE) {
            blockObject.position.y = SQUARE_SIZE;
        }

        // bottom wall collision
        if(blockObject.position.y >= world.height - SQUARE_SIZE) {
            blockObject.position.y = world.height - SQUARE_SIZE;
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
        let scaledDirection = vector.construct();
        if (player.inputs.length) {
            scaledDirection = vector.construct();
            for (let i = 0; i < player.inputs.length; i++) {
                let input = player.inputs[i];
                // only render inputs that have not yet been rendered
                if (input.number > player.lastRenderedInputNumber) {
                    // recall that the direction in an 'input' has already been normalized (see recordInput),
                    // so no operations must be performed on it here
                    scaledDirection = vector.add(scaledDirection, input.direction);
                }
            }

            // set the values in the player to reflect the new rendering
            let lastInput = player.inputs[player.inputs.length - 1];
            player.lastInputTime = lastInput.time;
            player.lastRenderedInputNumber = lastInput.number;
        }
        // return the displacement vector of the player
        return vector.scalarMultiply(scaledDirection, (this.MAX_PLAYER_SPEED * PHYSICS_UPDATE_PERIOD / 1000.0));
    }
}


/*********************************** Server Game Logic ***********************************/

class ServerGameLogic extends GameLogic {
    constructor(game) {
        super();
        this.game = game;
        if (this.game) {
            // add the current players from the game object
            for (let playerId in this.game.playerSockets) {
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
     * Updates the game.
     * @param time The current time.
     */
    update(time) {

        // call the client / server common updates
        super.update(time);

        // update the server time using the time from the main timer
        this.serverTime = this.localTime;
        // create a light copy of each player
        let playersLightCopy = {};
        for (let playerId in this.players) {
            if (this.players.hasOwnProperty(playerId)) {
                playersLightCopy[playerId] = Player.lightCopy(this.players[playerId]);
            }
        }

        // record the state of the game at the current time
        let state = {
            players: playersLightCopy,
            blocks: this.blocks,
            time: this.serverTime
        };
        // send the recorded state to each player
        for (let playerId in this.players) {
            if (this.players.hasOwnProperty(playerId)) {
                let player = this.players[playerId];
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
        for (let playerId in this.players) {
            if (this.players.hasOwnProperty(playerId)) {
                let player = this.players[playerId];
                // obtain a displacement from the set of inputs provided by the player
                let displacement = this.processDirectionInputs(player);

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

    detach(playerId) {
        if (!this.players[playerId]) {
            return;
        }
        // remove the most recently added block
        let block = this.players[playerId].blocks.pop();

        // set the position back to absolute and restore the health
        block.position = vector.add(
            vector.scalarMultiply(block.position, SQUARE_SEPARATION),
            this.players[playerId].position
        );
        block.health = MAX_HEALTH;

        // add the block to the list of blocks
        let blockId = uuid();
        this.blocks[blockId] = block;
    }

    /**
     * Generates a set of randomly places blocks
     * @param numBlocks The number of blocks to generate.
     */
    generateBlocks(numBlocks) {
        for (let i = 0; i < numBlocks; i++) {
            let x = getRandomInt(SQUARE_SIZE / 2, world.width - SQUARE_SIZE / 2);
            let y = getRandomInt(SQUARE_SIZE / 2, world.height - SQUARE_SIZE / 2);
            let blockId = uuid();
            this.blocks[blockId] = new Block(x, y);
        }
    }

    /**
     * Updates the server-side players from information
     * received from the client.
     * @param playerId The player id of the client update.
     * @param input The input object sent to the server.
     */
    processClientUpdate(playerId, input) {
        let player = this.players[playerId];
        if (!player) {
            return;
        }
        player.inputs.push(input);
    }
}

/*********************************** Client Game Logic ***********************************/

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

        // collection of the various client inputs based on the keyboard and mouse
        this.clientState = {
            // a vector containing the mouse direction relative to to the client player's position
            mousePosition: vector.construct(),

            // whether or not the player's movement is enabled
            movementEnabled: true
        };

        // the current input number; used to identify inputs recorded and sent to the server
        this.inputNumber = 0;

        // the amount to smooth client movement if it lags behind the server
        this.clientSmoothing = 0.1;

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

        // clear the entire context
        this.context.clearRect(0, 0, world.width, world.height);

        // get the client player's inputs
        this.recordInput();

        // update the remote players (and the client player if prediction is disabled)
        this.processServerUpdates();

        // update the camera object to reflect new positions
        this.camera.update();

        // determine if a block is close enough to the client player to attach
        this.determineCandidateBlock();

        // draw the puzzle grid and solutions
        this.drawPuzzle();

        // draw every player
        this.drawPlayers();

        // draw every block
        this.drawBlocks();

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


    /**
     * Normalizes the given direction vector.  This first checks if the
     * vector is lower than size of the player and returns the zero vector
     * if true. If this is false, the direction vector is scaled to reflect
     * a linear relationship between the magnitude and the maximum speed; the
     * resulting vector is has a magnitude between 0 and 1; vectors larger
     * than 1 are automatically resized to a unit vectors.
     * @param directionVector The direction vector to normalize.
     * @returns {*} The normalized direction vector.
     */
    normalizeDirection(directionVector) {

        // if the player's block is close enough to the mouse or if the player's movement is not enabled,
        // interpret that as a direction of (0, 0)
        if (vector.magnitude(directionVector) < SQUARE_SIZE / 2 || !this.clientState.movementEnabled) {
            return vector.construct();
        }

        // scale down the direction vector by the maximum possible magnitude
        let normalized = vector.scalarMultiply(directionVector, 1.0 / this.MAX_DIRECTION_MAGNITUDE);

        // if the resulting vector is too large, convert it into a unit vector
        if (vector.magnitude(normalized) > 1) {
            normalized = vector.unitVector(normalized);
        }

        return normalized;
    }

    /**
     * Draws the puzzle grid and the current solutions.
     */
    drawPuzzle() {
        // draw a grid in the center of the
        // TODO create constants
        let numRows = 16;
        let numCols = 11;

        // define the x and y coordinates of the top left of the grid
        let x = world.width / 2 - numCols * SQUARE_SEPARATION - this.camera.xView;
        let y = world.height / 2 - numRows * SQUARE_SEPARATION - this.camera.yView;

        // draw the solution
        this.context.fillStyle = SQUARE_COLOR_SOLUTION;
        for (let i = 0; i < this.solution.length; i++) {
            this.context.fillRect(
                x + this.solution[i].x * SQUARE_SEPARATION,
                y + this.solution[i].y * SQUARE_SEPARATION,
                SQUARE_SIZE + OUTLINE_SIZE / 2,
                SQUARE_SIZE + OUTLINE_SIZE / 2
            );
        }

        // draw vertical lines
        for (let columnNumber = 0; columnNumber < numCols; columnNumber++) {
            let yStart = y;
            let yEnd = y + (numRows  - 1) * SQUARE_SEPARATION;

            // draw the first and last column lines longer to correct corners
            if (columnNumber == 0 || columnNumber == numCols - 1) {
                yStart -= OUTLINE_SIZE / 4;
                yEnd += OUTLINE_SIZE / 4 ;
            }
            this.context.moveTo(x + columnNumber * SQUARE_SEPARATION, yStart);
            this.context.lineTo(x + columnNumber * SQUARE_SEPARATION, yEnd);
        }

        // draw horizontal lines
        for (let rowNumber = 0; rowNumber < numRows; rowNumber++) {
            this.context.moveTo(x, y + rowNumber * SQUARE_SEPARATION);
            this.context.lineTo(x + (numCols -1 ) * SQUARE_SEPARATION, y + rowNumber * SQUARE_SEPARATION);
        }

        this.context.strokeStyle = 'rgb(255, 255, 255)';
        this.context.lineWidth = OUTLINE_SIZE / 2;
        this.context.stroke();


    }

    /**
     * Draws each player.
     */
    drawPlayers() {
        for (let playerId in this.players) {
            if (this.players.hasOwnProperty(playerId)) {
                Player.draw(this.players[playerId], this.context, this.camera);
            }
        }
    }

    /**
     * Draws every block.
     */
    drawBlocks() {
        for (let blockId in this.blocks) {
            if (this.blocks.hasOwnProperty(blockId)) {
                let outlineColor = SQUARE_OUTLINE_COLOR_DEFAULT;
                if (blockId == this.clientPlayer.candidateBlockId) {
                    outlineColor = SQUARE_OUTLINE_COLOR_ACTIVE;
                }
                Block.draw(
                    this.blocks[blockId],
                    this.context,
                    this.camera,
                    outlineColor,
                    edge.opposite(this.clientPlayer.activeEdge)
                );
            }
        }
    }

    /**
     * Determines the closest block to the client player and
     * assigns this block as the player's candidate block if
     * it is within a limit distance.
     */
    determineCandidateBlock() {
        if (!this.clientPlayer || !this.clientPlayer.blocks.length) {
            return;
        }

        let closestBlockId;
        let clientBlockIndex;
        let closestDistance = 0;
        let start = true;
        for (let blockId in this.blocks) {
            if (this.blocks.hasOwnProperty(blockId)) {
                for (let i = 0; i < this.clientPlayer.blocks.length; i++) {
                    if (start) {
                        // automatically set the minimum block to the first block
                        start = false;
                        closestBlockId = blockId;
                        clientBlockIndex = i;
                        closestDistance = vector.magnitude(
                            vector.subtract(
                                vector.add(
                                    this.clientPlayer.position,
                                    vector.scalarMultiply(
                                        this.clientPlayer.blocks[i].position,
                                        SQUARE_SEPARATION
                                    )
                                ),
                                this.blocks[blockId].position
                            )
                        );
                    } else {
                        // set distance if it is less than the current minimum
                        let distance = vector.magnitude(
                            vector.subtract(
                                vector.add(
                                    this.clientPlayer.position,
                                    vector.scalarMultiply(
                                        this.clientPlayer.blocks[i].position,
                                        SQUARE_SEPARATION
                                    )
                                ),
                                this.blocks[blockId].position
                            )
                        );
                        if (distance < closestDistance) {
                            closestBlockId = blockId;
                            clientBlockIndex = i;
                            closestDistance = distance;
                        }
                    }
                }
            }
        }

        // if the closest block is close enough, mark it
        if (closestDistance < MAX_PICKUP_DISTANCE) {
            // assign the block id to the client player
            this.clientPlayer.candidateBlockId = closestBlockId;
            this.clientPlayer.activeBlockIndex = clientBlockIndex;

            // recalculate the vector between the two points
            let direction = vector.subtract(
                vector.add(
                    this.clientPlayer.position,
                    vector.scalarMultiply(
                        this.clientPlayer.blocks[clientBlockIndex].position,
                        SQUARE_SEPARATION
                    )
                ),
                this.blocks[closestBlockId].position
            );

            // assign the client player's active edge based on the direction
            this.clientPlayer.activeEdge = edge.getEdgeFromDirection(direction);
        } else {
            this.clientPlayer.candidateBlockId = '';
            this.clientPlayer.activeBlockIndex = 0;
            this.clientPlayer.activeEdge = edge.NONE;
        }
    }

    /**
     * Attempts to attach the candidate block to the the player.
     */
    attach() {
        if (!this.clientPlayer ||
            !this.clientPlayer.candidateBlockId ||
            !this.clientPlayer.activeEdge ||
            !(this.clientPlayer.activeBlockIndex >= 0) ||
            !this.blocks[this.clientPlayer.candidateBlockId]) {
            return;
        }

        try {
            // determine the relative position of the new block
            let relativePosition = edge.getRelativePosition(this.clientPlayer.activeEdge);

            // add an offset for the active block the new block is attaching to
            console.log('attaching to block ' + this.clientPlayer.activeBlockIndex);
            relativePosition = vector.add(
                relativePosition,
                this.clientPlayer.blocks[this.clientPlayer.activeBlockIndex].position
            );

            // TODO determine whether or not this should happen on the client before the server
            // add a new block to the client player's list
            //this.clientPlayer.blocks.push(new Block(relativePosition.x, relativePosition.y));

            // delete the block from the list of blocks
            //delete this.blocks[this.clientPlayer.candidateBlockId];

            // emit an attach event, signaling the server of the changes
            this.playerSocket.emit('attach', {
                playerId: this.clientPlayerId,
                blockId: this.clientPlayer.candidateBlockId,
                relativePosition: relativePosition
            })

        } catch (error) {
            // this happens when someone spams the attach key for an unknown reason
            console.log('Caught attach error -' + error);
        }
    }

    detach() {
        if (!this.clientPlayer || this.clientPlayer.blocks.length < 2) {
            return;
        }

        // remove and retrieve the most recently added block
        // let block = this.clientPlayer.blocks.pop();
        //
        // // set the position back to absolute and restore the health
        // block.position = vector.add(
        //     vector.scalarMultiply(block.position, SQUARE_SEPARATION),
        //     this.clientPlayer.position
        // );
        // block.health = MAX_HEALTH;

        // send a detach event to the server for processing
        this.playerSocket.emit('detach', {
            playerId: this.clientPlayerId
        });

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
        let displacement = this.processDirectionInputs(this.clientPlayer);
        this.clientPlayer.position = vector.add(this.clientPlayer.position, displacement);
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
        let mouseDirection = vector.subtract(
            this.clientState.mousePosition,
            vector.construct(
                this.clientPlayer.position.x - this.camera.xView,
                this.clientPlayer.position.y - this.camera.yView
            )
        );

        // normalize the mouse direction using various scaling methods
        let normalizedDirection = this.normalizeDirection(mouseDirection);

        // increase the input number before adding the next input
        this.inputNumber++;

        // store the input along with a time and the input number for identification
        let newInput = {
            time: this.localTime,
            direction: normalizedDirection,
            number: this.inputNumber
        };

        // add the input to the array for later processing
        this.clientPlayer.inputs.push(newInput);

        // send the input to the server for processing
        this.playerSocket.emit('input', newInput);
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
        const latestServerUpdate = this.serverUpdates[this.serverUpdates.length - 1];

        // obtain the most recent server position of the client player
        const serverPosition = latestServerUpdate.players[this.clientPlayerId].position;

        const serverLastRenderedInputNumber = latestServerUpdate.players[this.clientPlayerId].lastRenderedInputNumber;
        if (serverLastRenderedInputNumber) {
            // locate where the last rendered server update happens in the local updates array
            let latestServerUpdateIndex = -1;
            for (let i = 0; i < this.clientPlayer.inputs.length; i++) {
                if (this.clientPlayer.inputs[i].number == serverLastRenderedInputNumber) {
                    latestServerUpdateIndex = i;
                    break;
                }
            }

            // remove updates we have already processed locally
            if (latestServerUpdateIndex > -1) {
                // remove the inputs already processed on the server
                this.clientPlayer.inputs.splice(0, latestServerUpdateIndex + 1);
                // change the position to the latest server position
                this.clientPlayer.position = vector.generate(serverPosition); // TODO keep this?
                this.clientPlayer.lastRenderedInputNumber = latestServerUpdateIndex;
                // trigger another update to read the remaining inputs
                this.updatePhysics();
            }
        }
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
        const currentTime = this.clientTime;
        let targetUpdate = null;
        let previousUpdate = null;

        // find a set of updates which 'contain' the current time
        for(let i = 0; i < this.serverUpdates.length - 1; i++) {
            const currentUpdate = this.serverUpdates[i];
            const nextUpdate = this.serverUpdates[i + 1];
            if(currentTime > currentUpdate.time && currentTime <= nextUpdate.time) {
                targetUpdate = nextUpdate;
                previousUpdate = currentUpdate;
                break;
            }
        }

        // if no target can be found, simply use the least recent update
        if(!targetUpdate) {
            // console.log('using 0th update');
            targetUpdate = this.serverUpdates[0];
            previousUpdate = this.serverUpdates[0];
        }

        // set the new positions based on interpolation
        if(targetUpdate && previousUpdate) {

            // calculate the interpolation point (on [0, 1]) based on the
            // position of the current time with respect to both chosen times
            this.targetTime = targetUpdate.time;
            const difference = this.targetTime - currentTime;
            const maxDifference = (targetUpdate.time - previousUpdate.time);
            let interpolationPoint = 0;

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
            const lastServerUpdate = this.serverUpdates[this.serverUpdates.length - 1];

            // update each player
            for (let playerId in this.players) {
                // whether or not to allow the given player to have its position updated
                const allowPlayer = this.predictMovement || (playerId != this.clientPlayerId);
                if (allowPlayer && this.players.hasOwnProperty(playerId)) {
                    try {
                        // calculate the theoretical position of the current player
                        const playerTargetPosition = lastServerUpdate.players[playerId].position;
                        const playerPastPosition = previousUpdate.players[playerId].position;
                        const theoreticalPlayerPosition = vector.interpolate(
                            playerTargetPosition,
                            playerPastPosition,
                            interpolationPoint
                        );

                        // smooth the transition by interpolating between the client position and server position
                        this.players[playerId].position = vector.interpolate(
                            this.players[playerId].position,
                            theoreticalPlayerPosition,
                            this.clientSmoothing
                        );


                        // set the blocks array for this player according to the server update
                        this.players[playerId].blocks = targetUpdate.players[playerId].blocks;

                        // this is the old broken way
                        // this.players[playerId].position = vector.interpolate(
                        //     this.players[playerId].position,
                        //     theoreticalPlayerPosition,
                        //     this.physicsDeltaTime * this.clientSmoothing
                        // );

                    } catch (error) {
                        // this probably means a player was added and the server records are inconsistent
                        // this error is ok if it only occurs a small number of times after a player is added
                        console.log('Caught server update history error - ' + error);
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

        // assign the list of blocks
        this.blocks = data.blocks;

        // set the camera to track the client player
        this.camera.setTarget(this.clientPlayer, this.canvas.width / 2, this.canvas.height / 2);

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
        if (this.netLatency > 80) {
            console.log('Warning: high latency');
        }

        // set the blocks equal to the server copy TODO use interpolation?
        this.blocks = update.blocks;

        //Update our local offset time from the last server update
        this.clientTime = this.serverTime - this.clientServerOffset;

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
}

/*********************************** Drawing Functions ***********************************/

/**
 * Draws a trapezoid with the given points.
 * @param context the context on which to render the trapezoid.
 * @param color the color of the trapezoid.
 * @param x1 The x coordinate of the first point in the trapezoid.
 * @param y1 The y coordinate of the first point in the trapezoid.
 * @param x2 The x coordinate of the second point in the trapezoid.
 * @param y2 The y coordinate of the second point in the trapezoid.
 * @param x3 The x coordinate of the third point in the trapezoid.
 * @param y3 The y coordinate of the third point in the trapezoid.
 * @param x4 The x coordinate of the fourth point in the trapezoid.
 * @param y4 The y coordinate of the fourth point in the trapezoid.
 */
function trapezoid(context, color, x1, y1, x2, y2, x3, y3, x4, y4){
    context.beginPath();
    context.moveTo(x1,y1);
    context.lineTo(x2,y2);
    context.lineTo(x3,y3);
    context.lineTo(x4,y4);
    context.closePath();
    context.fillStyle = color;
    context.fill();
}

/**
 * Draws a rectangle in the given context.
 * @param context The context on which ot render the rectangle.
 * @param x The x coordinate of the upper-left corner of the rectangle.
 * @param y The y coordinate of the upper-left corner of the rectangle.
 * @param width The width of the rectangle.
 * @param height The height of the rectangle.
 * @param lineWidth The outline width of the rectangle.
 * @param fillColor The fill color of the rectangle.
 * @param outlineColors An object containing an outline color for each edge
 * of the rectangle.
 */
function drawRectangle(context, x, y, width, height, lineWidth, fillColor, outlineColors){

    outlineColors = outlineColors || {
            top: SQUARE_OUTLINE_COLOR_DEFAULT,
            bottom: SQUARE_OUTLINE_COLOR_DEFAULT,
            left: SQUARE_OUTLINE_COLOR_DEFAULT,
            right: SQUARE_OUTLINE_COLOR_DEFAULT
        };

    context.lineWidth = lineWidth;
    // use existing fillStyle if fillStyle is not supplied
    fillColor = fillColor || context.fillStyle;

    // use existing strokeStyle if any strokeStyle is not supplied
    const strokeStyle = context.strokeStyle;

    // context will be modified, so save it
    context.save();

    // miter the lines
    context.lineJoin = "miter";

    // context lines are always drawn half-in/half-out
    // so context.lineWidth/2 is used a lot
    const lw = context.lineWidth / 2;

    // shortcut vars for boundaries
    const leftBoundary = x - lw;
    const rightBoundary = x + lw;
    const topBoundary = y - lw;
    const bottomBoundary = y + lw;

    // top
    trapezoid(
        context,
        outlineColors.top,
        leftBoundary,
        topBoundary,
        rightBoundary + width,
        topBoundary,
        leftBoundary + width,
        bottomBoundary,
        rightBoundary,
        bottomBoundary
    );
    // right
    trapezoid(
        context,
        outlineColors.right,
        rightBoundary + width,
        topBoundary,
        rightBoundary + width,
        bottomBoundary + height,
        leftBoundary + width,
        topBoundary + height,
        leftBoundary + width,
        bottomBoundary
    );
    // bottom
    trapezoid(
        context,
        outlineColors.bottom,
        rightBoundary + width,
        bottomBoundary + height,
        leftBoundary,
        bottomBoundary + height,
        rightBoundary,
        topBoundary + height,
        leftBoundary + width,
        topBoundary + height
    );
    // left
    trapezoid(
        context,
        outlineColors.left,
        leftBoundary,
        bottomBoundary + height,
        leftBoundary,
        topBoundary,
        rightBoundary,
        bottomBoundary,
        rightBoundary,
        topBoundary + height
    );

    // fill
    context.fillStyle = fillColor;
    context.fillRect(x, y, width, height);
    context.restore();
    context.beginPath();
}

/*********************************** Block ***********************************/

class Block {
    constructor(x, y, color) {
        this.position = vector.construct(x, y);
        this.velocity = vector.construct();
        this.size = vector.construct(SQUARE_SIZE, SQUARE_SIZE);
        this.color = color || SQUARE_COLOR_BLOCK;
        this.health = MAX_HEALTH;
    }

    static draw(block, context, camera, outlineColor, outlineEdge) {
        outlineColor = outlineColor || SQUARE_OUTLINE_COLOR_DEFAULT;
        let outlineColors = edge.formatColors(outlineEdge, outlineColor, SQUARE_OUTLINE_COLOR_DEFAULT);
        drawRectangle(
            context,
            block.position.x - block.size.x / 2 - camera.xView,
            block.position.y - block.size.y / 2 - camera.yView,
            block.size.x,
            block.size.y,
            OUTLINE_SIZE,
            block.color,
            outlineColors
        );
    }

    static incrementVelocity(block) {
        // TODO implement
    }
}


/*********************************** Player ***********************************/

class Player {
    constructor() {
        // initialize rendering values
        this.color = SQUARE_COLOR_PLAYER;

        // set initial current state values
        this.position = vector.construct(20, 20);
        this.size = vector.construct(SQUARE_SIZE, SQUARE_SIZE);

        // store the previous state of the player
        this.previousState = {
            position: vector.construct()
        };

        // store the blocks a player has
        this.blocks = [new Block(0, 0, this.color)];

        // store the input history
        this.inputs = [];
        this.lastRenderedInputNumber = 0;
        this.lastInputTime = new Date().getTime();

        // store the id of the block closest to it
        this.candidateBlockId = '';
        this.activeBlockIndex = 0;
        this.activeEdge = edge.NONE;

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
        for (let i = 0; i < player.blocks.length; i++) {
            let activeEdge = edge.NONE;
            if (i == player.activeBlockIndex && player.activeEdge) {
                activeEdge = player.activeEdge;
            }
            let outlineColors = edge.formatColors(
                activeEdge,
                SQUARE_OUTLINE_COLOR_ACTIVE,
                SQUARE_OUTLINE_COLOR_DEFAULT
            );

            let xOffset = player.blocks[i].position.x * (SQUARE_SEPARATION);
            let yOffset = player.blocks[i].position.y * (SQUARE_SEPARATION);

            let xPosition = player.position.x - player.size.x / 2 + xOffset;
            let yPosition = player.position.y - player.size.y / 2 + yOffset;

            drawRectangle(
                context,
                xPosition - camera.xView,
                yPosition - camera.yView,
                player.size.x,
                player.size.y,
                OUTLINE_SIZE,
                player.blocks[i].color,
                outlineColors
            );
        }
    }

    /**
     * Creates a new Player from a ServerPlayer or Player object.
     * @param player The player object to copy.
     * @returns {Player}
     */
    static lightCopy(player) {
        let copy = new Player();
        Object.assign(copy.position, player.position);
        Object.assign(copy.previousState.position, player.previousState.position);
        Object.assign(copy.inputs, player.inputs);
        copy.blocks = player.blocks;
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
        Block: Block,
        ServerPlayer: ServerPlayer
    };
} else {
    // fix request animation frame issues on the client
    (function () {

        const framePeriod = FPS / 1000;
        let lastTime = 0;
        const vendors = ['ms', 'moz', 'webkit', 'o'];

        for (let x = 0; x < vendors.length && !window.requestAnimationFrame; x++) {
            window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
            window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] ||
                window[vendors[x] + 'CancelRequestAnimationFrame'];
        }

        if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = function (callback, element) {
                const currentTime = Date.now();
                const waitTime = Math.max(0, framePeriod - (currentTime - lastTime));
                const id = window.setTimeout(function () {
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

