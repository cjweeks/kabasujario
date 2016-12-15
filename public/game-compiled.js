'use strict';

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// The maximum number of players that may exist in one gameLogic gameLogic
var MAX_PLAYERS_PER_GAME = 10;

// The refresh rate of the standard timers (in ms)
var TIMER_PERIOD = 4;

// The refresh period of physics simulations (in ms)
var PHYSICS_UPDATE_PERIOD = 15;

// The period at which to perform pings of the server (in ms)
var PING_PERIOD = 1000;

// The expected frame rate of the simulation (in fps)
var FPS = 60;

// the size of each player and block
var SQUARE_SIZE = 40;

// the outline size of both players and blocks
var OUTLINE_SIZE = 4;

// the distance between attached squares of a player
var SQUARE_SEPARATION = SQUARE_SIZE + OUTLINE_SIZE / 2;

// the fill color of the player's square
var SQUARE_COLOR_PLAYER = 'rgba(45, 48, 146, 1)';

// the fill color of blocks
var SQUARE_COLOR_BLOCK = 'rgba(0, 173, 238, 1)';

// the fill color of solutions blocks
var SQUARE_COLOR_SOLUTION = 'rgba(120, 120, 120, 1)';

// the default outline color of a player
var SQUARE_OUTLINE_COLOR_DEFAULT = 'rgba(255, 255, 255, 1)';

// the color representing the active edge of a player (the edge that may attach to a block)
var SQUARE_OUTLINE_COLOR_ACTIVE = 'rgba(255, 40, 242, 1)';

// the maximum number of blocks a player may attach to
var MAX_PLAYER_BLOCKS = 15;

// the maximum distance a player can be from the solution to become valid
var MAX_SOLUTION_DISTANCE = SQUARE_SIZE / 2;

// the maximum distance a player can be from a block to attach to it.
var MAX_PICKUP_DISTANCE = 2 * SQUARE_SIZE;

// the amount of time (in ms) to hold the player in the solution
var SOLUTION_HOLD_TIME = 2000;

// the number of rows for the puzzle grid
var NUM_ROWS = 16;

// the number of columns for the puzzle grid
var NUM_COLS = 11;

// the maximum health value of a block
var MAX_HEALTH = 100;

// the width offset of the leaderboard from the right of the screen
var LEADERBOARD_WIDTH_OFFSET = 300;

// the height offset of the leaderboard from the top of the screen
var LEADERRBOARD_HEIGHT_OFFSET = 50;

// the height separation between elements in the leaderboard
var LEADERBOARD_HEIGHT_SEPARATION = 20;

// the maximum number of players shown on the leaderboard
var LEADERBOARD_MAX_PLAYERS = 5;

// the amount to multiply the number of solution blocks by to obtain a score increment
var SCORE_SCALE_FACTOR = 10;

// the period at which to generate new random blocks
var BLOCK_GENERATION_PERIOD = 30000;

var MAX_BLOCKS_GENERATED = 180;

/**
 * Returns true if the code is being run on the server.
 * @returns {boolean}
 */
function onServer() {
    return typeof window == 'undefined' || !window.document;
}

/**
 * Sets the opacity of a color string in the form rgba(R, G, B, A)
 * @param color The color string to alter.
 * @param opacity The new opacity value.
 */
function setOpacity(color, opacity) {
    return color.replace(/[^,]+(?=\))/, opacity.toString());
}

// load the uuid module is we are on the server for block generation
var uuid = void 0;
if (onServer()) {
    uuid = require('uuid/v1');
}

/*********************************** Edge ***********************************/

/**
 * Specifies a set of directions corresponding to edges of squares / blocks. This is used for highlughting
 * certain edges as well as attaching blocks to players.
 */
var edge = {
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
    valid: function valid(edge) {
        return edge == this.TOP || edge == this.BOTTOM || edge == this.LEFT || edge == this.RIGHT;
    },

    /**
     * Returns the edge value opposite to the given edge.
     * @param edge The edge to find the opposite of.
     * @returns {*} The opposite edge value.
     */
    opposite: function opposite(edge) {
        var opposite = this.NONE;
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
    getEdgeFromDirection: function getEdgeFromDirection(direction) {
        var edge = void 0;
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
    formatColors: function formatColors(edge, edgeColor, defaultColor) {
        var colors = void 0;
        if (edge == this.TOP) {
            colors = {
                top: edgeColor,
                bottom: defaultColor,
                left: defaultColor,
                right: defaultColor
            };
        } else if (edge == this.BOTTOM) {
            colors = {
                top: defaultColor,
                bottom: edgeColor,
                left: defaultColor,
                right: defaultColor
            };
        } else if (edge == this.LEFT) {
            colors = {
                top: defaultColor,
                bottom: defaultColor,
                left: edgeColor,
                right: defaultColor
            };
        } else if (edge == this.RIGHT) {
            colors = {
                top: defaultColor,
                bottom: defaultColor,
                left: defaultColor,
                right: edgeColor
            };
        } else {
            colors = {
                top: defaultColor,
                bottom: defaultColor,
                left: defaultColor,
                right: defaultColor
            };
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
    getRelativePosition: function getRelativePosition(edge) {
        var relativePosition = vector.construct();
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
function _interpolate(firstValue, secondValue, interpolationPoint) {
    interpolationPoint = Math.max(0, Math.min(1, interpolationPoint));
    return firstValue + interpolationPoint * (secondValue - firstValue);
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
var vector = {

    /**
     * Adds the two given vectors.
     * @param u the first vector.
     * @param v The second vector to add.
     * @returns {vector} A new vector, the result of u + v.
     */
    add: function add(u, v) {
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
    subtract: function subtract(u, v) {
        return this.add(u, this.scalarMultiply(v, -1));
    },

    /**
     * Returns the euclidean magnitude of the given vector.
     * @param v the vector to measure.
     * @returns {number}
     */
    magnitude: function magnitude(v) {
        // console.log('mag: ' + Math.sqrt(Math.pow(v.x, 2) + Math.pow(v.y, 2)));
        return Math.sqrt(Math.pow(v.x, 2) + Math.pow(v.y, 2));
    },

    /**
     * Returns the unit Vector with the sample direction
     * as the given vector.
     * @returns {vector}
     */
    unitVector: function unitVector(v) {
        var magnitude = this.magnitude(v);
        if (magnitude == 0) {
            return {
                x: 0,
                y: 0
            };
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
    scalarMultiply: function scalarMultiply(v, scalar) {
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
    isZero: function isZero(v) {
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
    interpolate: function interpolate(u, v, interpolationPoint) {
        return {
            x: _interpolate(u.x, v.x, interpolationPoint),
            y: _interpolate(u.y, v.y, interpolationPoint)
        };
    },

    /**
     * Returns a new vector from an arbitrary object having
     * both x and y properties.
     * @param object the object to create the vector from.
     * @returns {vector} A vector with the same components
     * as the input object.
     */
    generate: function generate(object) {
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
    construct: function construct(x, y) {
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
    print: function print(v) {
        return '(' + v.x + ', ' + v.y + ')';
    },

    /**
     * Returns true if the components of the two vectors
     * are equal.
     * @param u The first vector to compare.
     * @param v The second vector to compare.
     * @returns {boolean}
     */
    isEqual: function isEqual(u, v) {
        return u.x == v.x && u.y == v.y;
    }
};

/*********************************** Game Logic ***********************************/

var world = {
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

var GameLogic = function () {
    function GameLogic() {
        _classCallCheck(this, GameLogic);

        // container holding players identified by their IDs
        this.players = {};

        // container holding blocks identified by their IDs
        this.blocks = {};

        // create a list of possible solutions from which to choose
        this.possibleSolutions = [{
            blocks: [vector.construct(), vector.construct(0, 1), vector.construct(0, 2), vector.construct(0, 3), vector.construct(1, 0), vector.construct(2, 0), vector.construct(2, 1)],
            width: 0,
            height: 0
        }, {
            blocks: [vector.construct(), vector.construct(0, 1), vector.construct(1, 1), vector.construct(1, 0), vector.construct(1, 2), vector.construct(2, 1), vector.construct(2, 2)],
            width: 0,
            height: 0
        }, {
            blocks: [vector.construct(0, 1), vector.construct(0, 2), vector.construct(0, 3), vector.construct(0, 4), vector.construct(2, 0), vector.construct(3, 0), vector.construct(3, 1), vector.construct(3, 2), vector.construct(2, 2), vector.construct(1, 2)],
            width: 0,
            height: 0
        }, {
            blocks: [vector.construct(1, 0), vector.construct(1, 1), vector.construct(1, 2), vector.construct(1, 3), vector.construct(2, 1), vector.construct(2, 2), vector.construct(2, 3), vector.construct(3, 2), vector.construct(0, 3), vector.construct(0, 4), vector.construct(0, 5)],
            width: 0,
            height: 0
        }, {
            blocks: [vector.construct(0, 0), vector.construct(1, 0), vector.construct(2, 0), vector.construct(3, 0), vector.construct(4, 0), vector.construct(5, 0), vector.construct(1, 1), vector.construct(1, 2), vector.construct(2, 2), vector.construct(3, 2), vector.construct(3, 1)],
            width: 0,
            height: 0
        }, {
            blocks: [vector.construct(0, 0), vector.construct(0, 1), vector.construct(0, 2), vector.construct(0, 3), vector.construct(0, 4), vector.construct(1, 3), vector.construct(1, 4), vector.construct(1, 5), vector.construct(1, 6)],
            width: 0,
            height: 0
        }];

        // get a random solution from the above array (note this will change quickly on the client side when the
        // server informs the client of the actual current solution).
        this.solution = this.possibleSolutions[Math.floor(Math.random() * this.possibleSolutions.length)];

        // determine the height and width of each solution
        this.setSolutionDimensions();

        // whether or not a player has locked to the solution
        this.solutionOccupied = false;

        this.solutionWidth = 3;
        this.solutionHeight = 4;

        // set up movement constants
        this.MAX_DIRECTION_MAGNITUDE = 400.0;
        this.MAX_PLAYER_SPEED = 300;

        //Set up some physics integration values
        this.physicsDeltaTime = 0.0001;
        this.physicsPreviousTime = new Date().getTime();

        // define the local timer
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
     * Sets the height and width attributes of each solution in possibleSolutions.
     */


    _createClass(GameLogic, [{
        key: 'setSolutionDimensions',
        value: function setSolutionDimensions() {
            for (var i = 0; i < this.possibleSolutions.length; i++) {
                var solution = this.possibleSolutions[i];
                var xMax = 0;
                var yMax = 0;
                for (var j = 0; j < solution.blocks.length; j++) {
                    if (solution.blocks[j].x > xMax) {
                        xMax = solution.blocks[j].x;
                    }
                    if (solution.blocks[j].y > yMax) {
                        yMax = solution.blocks[j].y;
                    }
                }
                solution.width = xMax + 1;
                solution.height = yMax + 1;
            }
        }

        /**
         * Removed a player from the list of players.
         * @param removePlayerId The id of the player to remove.
         */

    }, {
        key: 'removePlayer',
        value: function removePlayer(removePlayerId) {
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

    }, {
        key: 'startTimer',
        value: function startTimer() {
            setInterval(function () {
                var currentTime = new Date().getTime();
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

    }, {
        key: 'startPhysics',
        value: function startPhysics() {
            setInterval(function () {
                var currentTime = new Date().getTime();
                this.physicsDeltaTime = currentTime - this.physicsPreviousTime;
                this.physicsPreviousTime = currentTime;
                this.updatePhysics();
            }.bind(this), PHYSICS_UPDATE_PERIOD);
        }
    }, {
        key: 'update',
        value: function update(time) {
            // determine the delta time values
            if (this.previousFrameTime) {
                this.deltaTime = time - this.previousFrameTime;
            } else {
                this.deltaTime = 0.015; // TODO abstract this value (this is just an initial value)
            }

            //Store the last frame time
            this.previousFrameTime = time;
        }

        /**
         * Checks for collisions between the given player and
         * the free floating blocks.
         * @param player
         */

    }, {
        key: 'checkCollisions',
        value: function checkCollisions(player) {

            // iterate through each block in the player
            for (var i = 0; i < player.blocks.length; i++) {

                // get the absolute position of the current block
                var blockPosition = vector.add(player.position, vector.scalarMultiply(player.blocks[i].position, SQUARE_SEPARATION));

                // check collisions for each free floating block
                for (var blockId in this.blocks) {
                    if (this.blocks.hasOwnProperty(blockId)) {
                        // get a vector pointing from the object to the block
                        var direction = vector.subtract(this.blocks[blockId].position, blockPosition);
                        var closestEdge = edge.getEdgeFromDirection(direction);

                        // reset the position if a block is overlapping
                        if (closestEdge == edge.TOP && direction.y < SQUARE_SEPARATION) {
                            player.position.y -= SQUARE_SEPARATION - direction.y;
                        } else if (closestEdge == edge.BOTTOM && direction.y > -SQUARE_SEPARATION) {
                            player.position.y += SQUARE_SEPARATION + direction.y;
                        } else if (closestEdge == edge.RIGHT && direction.x > -SQUARE_SEPARATION) {
                            player.position.x += SQUARE_SEPARATION + direction.x;
                        } else if (closestEdge == edge.LEFT && direction.x < SQUARE_SEPARATION) {
                            player.position.x -= SQUARE_SEPARATION - direction.x;
                        }
                    }
                }

                // check collisions with the world borders

                // left wall collision
                if (blockPosition.x <= SQUARE_SIZE) {
                    player.position.x = SQUARE_SIZE + player.position.x - blockPosition.x;
                }

                // right wall collision
                if (blockPosition.x >= world.width - SQUARE_SIZE) {
                    player.position.x = world.width - SQUARE_SIZE - (blockPosition.x - player.position.x);
                }

                // top wall collision
                if (blockPosition.y <= SQUARE_SIZE) {
                    player.position.y = SQUARE_SIZE + player.position.y - blockPosition.y;
                }

                // bottom wall collision
                if (blockPosition.y >= world.height - SQUARE_SIZE) {
                    player.position.y = world.height - SQUARE_SIZE - (blockPosition.y - player.position.y);
                }
            }
        }

        /**
         * Processes a string of the given player's inputs.
         * @param player The player to process.
         * @returns {vector} The displacement vector calculated
         * by summing each input direction.
         */

    }, {
        key: 'processDirectionInputs',
        value: function processDirectionInputs(player) {
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
                        // recall that the direction in an 'input' has already been normalized (see recordInput),
                        // so no operations must be performed on it here
                        scaledDirection = vector.add(scaledDirection, input.direction);
                    }
                }

                // set the values in the player to reflect the new rendering
                var lastInput = player.inputs[player.inputs.length - 1];
                player.lastInputTime = lastInput.time;
                player.lastRenderedInputNumber = lastInput.number;
            }
            // return the displacement vector of the player
            return vector.scalarMultiply(scaledDirection, this.MAX_PLAYER_SPEED * PHYSICS_UPDATE_PERIOD / 1000.0);
        }
    }]);

    return GameLogic;
}();

/*********************************** Server Game Logic ***********************************/

var ServerGameLogic = function (_GameLogic) {
    _inherits(ServerGameLogic, _GameLogic);

    function ServerGameLogic(game) {
        _classCallCheck(this, ServerGameLogic);

        var _this = _possibleConstructorReturn(this, (ServerGameLogic.__proto__ || Object.getPrototypeOf(ServerGameLogic)).call(this));

        _this.game = game;
        if (_this.game) {
            // add the current players from the game object
            for (var playerId in _this.game.playerSockets) {
                if (_this.game.playerSockets.hasOwnProperty(playerId)) {
                    _this.players[playerId] = new ServerPlayer(_this, _this.game.playerSockets[playerId]);
                }
            }
        }
        _this.inputs = [];
        _this.serverTime = 0;
        _this.previousState = {};
        _this.startBlockGeneration();
        return _this;
    }

    /**
     * Generates a bounded random number of blocks on a timer
     */


    _createClass(ServerGameLogic, [{
        key: 'startBlockGeneration',
        value: function startBlockGeneration() {
            setInterval(function () {
                var numCurrentBlocks = 0;
                for (var blockId in this.blocks) {
                    if (this.blocks.hasOwnProperty(blockId)) {
                        numCurrentBlocks++;
                    }
                }

                var numNewBlocks = Math.floor(Math.random() * (MAX_BLOCKS_GENERATED - numCurrentBlocks));
                console.log('generating ' + numNewBlocks + ' blocks');
                this.generateBlocks();
            }.bind(this), BLOCK_GENERATION_PERIOD);
        }

        /**
         * Updates the game.
         * @param time The current time.
         */

    }, {
        key: 'update',
        value: function update(time) {

            // call the client / server common updates
            _get(ServerGameLogic.prototype.__proto__ || Object.getPrototypeOf(ServerGameLogic.prototype), 'update', this).call(this, time);

            // update the server time using the time from the main timer
            this.serverTime = this.localTime;
            // create a light copy of each player
            var playersLightCopy = {};
            for (var playerId in this.players) {
                if (this.players.hasOwnProperty(playerId)) {
                    playersLightCopy[playerId] = Player.lightCopy(this.players[playerId]);
                }
            }

            // record the state of the game at the current time
            var state = {
                players: playersLightCopy,
                blocks: this.blocks,
                time: this.serverTime
            };
            // send the recorded state to each player
            for (var _playerId in this.players) {
                if (this.players.hasOwnProperty(_playerId)) {
                    var player = this.players[_playerId];
                    if (player.playerSocket) {
                        player.playerSocket.emit('server-update', state);
                    } else {
                        console.log('Error: could not find player playerSocket when updating');
                    }
                }
            }
        }
    }, {
        key: 'updatePhysics',
        value: function updatePhysics() {
            // update player positions
            for (var playerId in this.players) {
                if (this.players.hasOwnProperty(playerId)) {
                    var player = this.players[playerId];
                    // obtain a displacement from the set of inputs provided by the player
                    var displacement = this.processDirectionInputs(player);

                    player.position = vector.add(player.position, displacement);

                    this.checkCollisions(player);

                    // check the solutions
                    this.processSolutionLogic();
                    // clear all inputs that we have processed
                    player.inputs = [];
                }
            }
        }

        /**
         * Determines whether or not a player may solve the puzzle
         * and begins the solution process if so.
         */

    }, {
        key: 'processSolutionLogic',
        value: function processSolutionLogic() {
            // check if the solution is occupied by another player
            if (this.solutionOccupied) {
                return;
            }
            // check if a player is in close proximity with a valid solution
            var result = this.checkSolution();
            if (!this.players[result.playerId]) {
                return;
            }

            // occupy the solution, and lock the player's position for a given amount of time
            this.solutionOccupied = true;
            var player = this.players[result.playerId];

            player.playerSocket.emit('set-position', { locked: true }, function () {
                player.position = result.position;
                var startTime = new Date().getTime();
                // decrement the opacity of each block
                var transparencyIntervalId = setInterval(function () {
                    var currentTime = new Date().getTime();
                    for (var i = 1; i < player.blocks.length; i++) {
                        player.blocks[i].opacity = Math.max(0, 1 - 1 / SOLUTION_HOLD_TIME * (currentTime - startTime));
                    }
                }, PHYSICS_UPDATE_PERIOD);
                setTimeout(function () {
                    // unlock the player's position, remove their blocks, and update their score
                    player.playerSocket.emit('set-position', { locked: false }, function () {});
                    player.blocks = player.blocks.slice(0, 1);
                    player.score += this.solution.blocks.length * SCORE_SCALE_FACTOR;

                    // select a new solution and emit a solution changed event
                    var newSolutionIndex = Math.floor(Math.random() * this.possibleSolutions.length);
                    for (var playerId in this.players) {
                        if (this.players.hasOwnProperty(playerId)) {
                            var _player = this.players[playerId];
                            if (_player.playerSocket) {
                                _player.playerSocket.emit('solution-changed', { solutionIndex: newSolutionIndex });
                            } else {
                                console.log('Error: could not find player playerSocket when updating solution');
                            }
                        }
                    }

                    this.solution = this.possibleSolutions[newSolutionIndex];
                    this.solutionOccupied = false;
                    // stop decrementing the transparency of the player's blocks
                    clearInterval(transparencyIntervalId);
                }.bind(this), SOLUTION_HOLD_TIME);
            }.bind(this));
        }

        /**
         * Checks if any player is currently in close enough proximity
         * to a solution and has the correct block orientations to
         * complete the solution..
         * @returns {{playerId: string, position: (*|{x: (*|number), y: (*|number)})}} An object
         * containing the player id of the player and position of the block for which the
         * player must bind to, if such a player exists.
         */

    }, {
        key: 'checkSolution',
        value: function checkSolution() {

            // define the result to be returned
            var result = {
                playerId: '',
                position: vector.construct()
            };

            // return if a player is already in the solution
            if (this.solutionOccupied) {
                return result;
            }

            for (var playerId in this.players) {
                if (this.players.hasOwnProperty(playerId)) {
                    // check the position of the player's primary block
                    var playerPosition = this.players[playerId].position;
                    for (var i = 0; i < this.solution.blocks.length; i++) {

                        // determine where the solution block is
                        var x = world.width / 2 - NUM_COLS * SQUARE_SEPARATION + SQUARE_SEPARATION / 2;
                        var y = world.height / 2 - NUM_ROWS * SQUARE_SEPARATION + SQUARE_SEPARATION / 2;

                        var xOffset = Math.floor((NUM_COLS - this.solution.width) / 2) * SQUARE_SEPARATION;
                        var yOffset = Math.ceil((NUM_ROWS - this.solution.height) / 2) * SQUARE_SEPARATION;

                        var blockPosition = vector.construct(x + xOffset + this.solution.blocks[i].x * SQUARE_SEPARATION, y + yOffset + this.solution.blocks[i].y * SQUARE_SEPARATION);

                        // find the distance between the solution block and the player's primary block
                        var distance = vector.magnitude(vector.subtract(playerPosition, blockPosition));

                        // if the distance is small enough, set the required values and exit the inner loop
                        if (distance < MAX_SOLUTION_DISTANCE && this.checkSolutionValidity(playerId, this.solution.blocks[i])) {
                            result.playerId = playerId;
                            result.position = blockPosition;
                            break;
                        }
                    }
                    // exit the outer loop if a match has been foujd
                    if (result.playerId) {
                        break;
                    }
                }
            }
            return result;
        }

        /**
         * Determines whether or not a player meets the current solution.
         * @param playerId
         * @param relativePosition The relative position of the solution
         * block that the player's primary block is intended to bind to.
         * @returns {boolean}
         */

    }, {
        key: 'checkSolutionValidity',
        value: function checkSolutionValidity(playerId, relativePosition) {
            if (!this.players[playerId]) {
                return false;
            }

            var playerBlocks = this.players[playerId].blocks;

            // checks the lengths of the solution and the player's blocks
            if (playerBlocks.length != this.solution.blocks.length) {
                return false;
            }

            // find the minimum x and y offset for the player's blocks
            var xMin = 0;
            var yMin = 0;
            for (var i = 0; i < playerBlocks.length; i++) {
                if (playerBlocks[i].position.x < xMin) {
                    xMin = playerBlocks[i].position.x;
                }
                if (playerBlocks[i].position.y < yMin) {
                    yMin = playerBlocks[i].position.y;
                }
            }

            var offset = vector.construct(-xMin, -yMin);

            // check that the relative position of the chosen solution block matches
            // that of the player's primary block plus the offset above
            var primaryBlockOffsetPosition = vector.add(playerBlocks[0].position, offset);
            if (!vector.isEqual(primaryBlockOffsetPosition, relativePosition)) {
                return false;
            }

            // check each block in the player against each block in the solution
            var valid = true;
            for (var _i = 0; _i < playerBlocks.length; _i++) {
                // get the current player block's position relative to 0, 0
                var playerBlockPosition = vector.add(playerBlocks[_i].position, offset);
                var found = false;
                for (var j = 0; j < this.solution.blocks.length; j++) {
                    if (vector.isEqual(playerBlockPosition, this.solution.blocks[j])) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    valid = false;
                    break;
                }
            }
            return valid;
        }
    }, {
        key: 'detach',
        value: function detach(playerId) {
            if (!this.players[playerId] || this.players[playerId].blocks.length < 2) {
                return;
            }
            // remove the most recently added block
            var block = this.players[playerId].blocks.pop();

            // set the position back to absolute and restore the health
            block.position = vector.add(vector.scalarMultiply(block.position, SQUARE_SEPARATION), this.players[playerId].position);
            block.health = MAX_HEALTH;

            // add the block to the list of blocks
            var blockId = uuid();
            this.blocks[blockId] = block;
        }

        /**
         * Generates a set of randomly places blocks, as long as the blocks will not appear within the puzzle grid.
         * @param numBlocks The number of blocks to generate.
         */

    }, {
        key: 'generateBlocks',
        value: function generateBlocks(numBlocks) {
            for (var i = 0; i < numBlocks; i++) {
                // generate random x and y coordinates for the new block
                var x = getRandomInt(SQUARE_SIZE / 2, world.width - SQUARE_SIZE / 2);
                var y = getRandomInt(SQUARE_SIZE / 2, world.height - SQUARE_SIZE / 2);

                // if the position falls inside the solution grid, discard the created point and try again
                if (x >= world.width / 2 - NUM_COLS * SQUARE_SEPARATION && x < world.width / 2 - NUM_COLS * SQUARE_SEPARATION + NUM_COLS * SQUARE_SIZE && world.height / 2 - NUM_ROWS * SQUARE_SEPARATION && world.height / 2 - NUM_ROWS * SQUARE_SEPARATION + NUM_ROWS * SQUARE_SIZE) {

                    i--;
                } else {
                    // generate a block at the created position
                    var blockId = uuid();
                    this.blocks[blockId] = new Block(x, y);
                }
            }
        }

        /**
         * Updates the server-side players from information
         * received from the client.
         * @param playerId The player id of the client update.
         * @param input The input object sent to the server.
         */

    }, {
        key: 'processClientUpdate',
        value: function processClientUpdate(playerId, input) {
            var player = this.players[playerId];
            if (!player) {
                return;
            }
            player.inputs.push(input);
        }
    }]);

    return ServerGameLogic;
}(GameLogic);

/*********************************** Client Game Logic ***********************************/

var ClientGameLogic = function (_GameLogic2) {
    _inherits(ClientGameLogic, _GameLogic2);

    /**
     * Creates a new client game logic object.
     * @param camera the camera object used for tracking.
     */
    function ClientGameLogic(camera) {
        _classCallCheck(this, ClientGameLogic);

        // the id of the player associated with this client instance
        var _this2 = _possibleConstructorReturn(this, (ClientGameLogic.__proto__ || Object.getPrototypeOf(ClientGameLogic)).call(this));

        _this2.clientPlayerId = '';

        // the player object identified by clientPlayerId
        _this2.clientPlayer = undefined;

        // TODO remove
        _this2.predictMovement = true;

        // the camera object that will allow us to draw the player at the center of the screen
        _this2.camera = camera;
        console.log(_this2.camera);

        // a reference to the two-dimensional context of the canvas to render on
        _this2.context = {};

        // whether or not the position is locked by the server
        _this2.lockPosition = false;

        // collection of the various client inputs based on the keyboard and mouse
        _this2.clientState = {
            // a vector containing the mouse direction relative to to the client player's position
            mousePosition: vector.construct(),

            // whether or not the player's movement is enabled
            movementEnabled: true
        };

        // the current input number; used to identify inputs recorded and sent to the server
        _this2.inputNumber = 0;

        // the amount to smooth client movement if it lags behind the server
        _this2.clientSmoothing = 0.1;

        // the net latency and ping between the client and server (initial values are placeholders)
        _this2.netLatency = 0.001;
        _this2.netPing = 0.001;
        _this2.previousPingTime = 0.001;

        // the amount of time (in ms) the other players lag behind the real server time in the client's rendering
        // this is done to allow for smooth interpolation of other players' movements
        _this2.clientServerOffset = 100;

        // the length (in seconds) of the server history buffer that the client keeps in 'serverUpdates'
        // the actual buffer size is the frame rate multiplied by this value
        _this2.bufferLength = 2;
        _this2.targetTime = 0.01; //the time where we want to be in the server timeline

        // the oldest server update time in the server updates buffer
        _this2.oldestUpdateTime = 0.01;

        // the current server time minus the client server offset; this is the time at which other players are drawn
        _this2.clientTime = 0.01;

        // the server time, as retrieved from the last server update
        _this2.serverTime = 0.01;

        // recent server updates that allow for interpolation of player positions
        _this2.serverUpdates = [];

        // connect to the server using socket.io
        _this2.connect();

        // start the ping timer to record latency
        _this2.startPingTimer();
        return _this2;
    }

    /**
     * This is the main update loop for the client.
     * It clears the canvas, records the client player's input,
     * processes the server's updates, updates the client's local
     * position, and finally re-draws everything.
     */


    _createClass(ClientGameLogic, [{
        key: 'update',
        value: function update(time) {

            // perform server / client common updates
            _get(ClientGameLogic.prototype.__proto__ || Object.getPrototypeOf(ClientGameLogic.prototype), 'update', this).call(this, time);

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

            var leaderBoard = this.constructLeaderBoard();
            this.drawLeaderBoard(leaderBoard);
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

    }, {
        key: 'startPingTimer',
        value: function startPingTimer() {
            setInterval(function () {
                this.previousPingTime = new Date().getTime();
                this.playerSocket.emit('manual-ping', {
                    time: this.previousPingTime
                });
            }.bind(this), PING_PERIOD);
        }
    }, {
        key: 'scheduleUpdate',


        /**
         * Requests a new animation from with update() as the callback.
         */
        value: function scheduleUpdate() {
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

    }, {
        key: 'normalizeDirection',
        value: function normalizeDirection(directionVector) {

            // if the player's block is close enough to the mouse or if the player's movement is not enabled,
            // interpret that as a direction of (0, 0)
            if (vector.magnitude(directionVector) < SQUARE_SIZE / 2 || !this.clientState.movementEnabled || this.lockPosition) {
                return vector.construct();
            }

            // scale down the direction vector by the maximum possible magnitude
            var normalized = vector.scalarMultiply(directionVector, 1.0 / this.MAX_DIRECTION_MAGNITUDE);

            // if the resulting vector is too large, convert it into a unit vector
            if (vector.magnitude(normalized) > 1) {
                normalized = vector.unitVector(normalized);
            }

            return normalized;
        }

        /**
         * Draws the puzzle grid and the current solutions.
         */

    }, {
        key: 'drawPuzzle',
        value: function drawPuzzle() {
            // draw a grid in the center of the world
            // define the x and y coordinates of the top left of the grid
            var x = world.width / 2 - NUM_COLS * SQUARE_SEPARATION - this.camera.xView;
            var y = world.height / 2 - NUM_ROWS * SQUARE_SEPARATION - this.camera.yView;

            var xOffset = Math.floor((NUM_COLS - this.solution.width) / 2) * SQUARE_SEPARATION;
            var yOffset = Math.ceil((NUM_ROWS - this.solution.height) / 2) * SQUARE_SEPARATION;

            // draw the solution
            this.context.fillStyle = SQUARE_COLOR_SOLUTION;
            for (var i = 0; i < this.solution.blocks.length; i++) {
                this.context.fillRect(x + xOffset + this.solution.blocks[i].x * SQUARE_SEPARATION, y + yOffset + this.solution.blocks[i].y * SQUARE_SEPARATION, SQUARE_SEPARATION, SQUARE_SEPARATION);
            }

            // draw vertical lines
            for (var columnNumber = 0; columnNumber < NUM_COLS; columnNumber++) {
                var yStart = y;
                var yEnd = y + (NUM_ROWS - 1) * SQUARE_SEPARATION;

                // draw the first and last column lines longer to correct corners
                if (columnNumber == 0 || columnNumber == NUM_COLS - 1) {
                    yStart -= OUTLINE_SIZE / 4;
                    yEnd += OUTLINE_SIZE / 4;
                }
                this.context.moveTo(x + columnNumber * SQUARE_SEPARATION, yStart);
                this.context.lineTo(x + columnNumber * SQUARE_SEPARATION, yEnd);
            }

            // draw horizontal lines
            for (var rowNumber = 0; rowNumber < NUM_ROWS; rowNumber++) {
                this.context.moveTo(x, y + rowNumber * SQUARE_SEPARATION);
                this.context.lineTo(x + (NUM_COLS - 1) * SQUARE_SEPARATION, y + rowNumber * SQUARE_SEPARATION);
            }

            this.context.strokeStyle = 'rgb(255, 255, 255)';
            this.context.lineWidth = OUTLINE_SIZE / 2;
            this.context.stroke();
        }

        /**
         * Draws each player.
         */

    }, {
        key: 'drawPlayers',
        value: function drawPlayers() {
            for (var playerId in this.players) {
                if (this.players.hasOwnProperty(playerId)) {
                    Player.draw(this.players[playerId], this.context, this.camera);
                    //console.log("PLAYER NAME   " + this.players[playerId].name);
                }
            }
        }
    }, {
        key: 'constructLeaderBoard',
        value: function constructLeaderBoard() {
            var board = [];

            for (var playerId in this.players) {
                if (this.players.hasOwnProperty(playerId)) {
                    board.push({
                        playerId: playerId,
                        name: this.players[playerId].name,
                        score: this.players[playerId].score
                    });
                }
            }

            board.sort(function (firstEntry, secondEntry) {
                if (firstEntry.score > secondEntry.score) {
                    return -1;
                }
                if (firstEntry.score < secondEntry.score) {
                    return 1;
                }
                // first must be equal to second
                return 0;
            });

            return board;
        }
    }, {
        key: 'drawLeaderBoard',
        value: function drawLeaderBoard(leaderBoard) {
            var wView = this.camera.wView;
            var hView = this.camera.hView;

            wView = this.camera.wView;
            hView = this.camera.hView;

            for (var i = 0; i < leaderBoard.length && i < LEADERBOARD_MAX_PLAYERS; i++) {
                this.context.fillStyle = 'rgba(255, 255, 255, 1)';
                if (leaderBoard[i].playerId == this.clientPlayerId) {
                    this.context.fillStyle = SQUARE_COLOR_BLOCK;
                }
                this.context.fillText(i + 1 + ". " + leaderBoard[i].name + ':' + leaderBoard[i].score, wView - LEADERBOARD_WIDTH_OFFSET, LEADERRBOARD_HEIGHT_OFFSET + LEADERBOARD_HEIGHT_SEPARATION * i);
            }
        }

        /**
         * Draws every block.
         */

    }, {
        key: 'drawBlocks',
        value: function drawBlocks() {
            for (var blockId in this.blocks) {
                if (this.blocks.hasOwnProperty(blockId)) {
                    var outlineColor = SQUARE_OUTLINE_COLOR_DEFAULT;
                    if (blockId == this.clientPlayer.candidateBlockId) {
                        outlineColor = SQUARE_OUTLINE_COLOR_ACTIVE;
                    }
                    Block.draw(this.blocks[blockId], this.context, this.camera, outlineColor, edge.opposite(this.clientPlayer.activeEdge));
                }
            }
        }

        /**
         * Determines the closest block to the client player and
         * assigns this block as the player's candidate block if
         * it is within a limit distance.
         */

    }, {
        key: 'determineCandidateBlock',
        value: function determineCandidateBlock() {
            if (!this.clientPlayer || !this.clientPlayer.blocks.length) {
                return;
            }

            var closestBlockId = void 0;
            var clientBlockIndex = void 0;
            var closestDistance = 0;
            var start = true;
            for (var blockId in this.blocks) {
                if (this.blocks.hasOwnProperty(blockId)) {
                    for (var i = 0; i < this.clientPlayer.blocks.length; i++) {
                        if (start) {
                            // automatically set the minimum block to the first block
                            start = false;
                            closestBlockId = blockId;
                            clientBlockIndex = i;
                            closestDistance = vector.magnitude(vector.subtract(vector.add(this.clientPlayer.position, vector.scalarMultiply(this.clientPlayer.blocks[i].position, SQUARE_SEPARATION)), this.blocks[blockId].position));
                        } else {
                            // set distance if it is less than the current minimum
                            var distance = vector.magnitude(vector.subtract(vector.add(this.clientPlayer.position, vector.scalarMultiply(this.clientPlayer.blocks[i].position, SQUARE_SEPARATION)), this.blocks[blockId].position));
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
                var direction = vector.subtract(vector.add(this.clientPlayer.position, vector.scalarMultiply(this.clientPlayer.blocks[clientBlockIndex].position, SQUARE_SEPARATION)), this.blocks[closestBlockId].position);

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

    }, {
        key: 'attach',
        value: function attach() {
            if (!this.clientPlayer || !this.clientPlayer.candidateBlockId || !this.clientPlayer.activeEdge || !(this.clientPlayer.activeBlockIndex >= 0) || !this.blocks[this.clientPlayer.candidateBlockId] || this.clientPlayer.blocks.length > MAX_PLAYER_BLOCKS) {
                return;
            }

            try {
                // determine the relative position of the new block
                var relativePosition = edge.getRelativePosition(this.clientPlayer.activeEdge);
                relativePosition = vector.add(relativePosition, this.clientPlayer.blocks[this.clientPlayer.activeBlockIndex].position);
                // check if the client player already has a block at the relative position
                for (var i = 0; i < this.clientPlayer.blocks.length; i++) {
                    if (vector.isEqual(this.clientPlayer.blocks[i].position, relativePosition)) {
                        return;
                    }
                }

                // add an offset for the active block the new block is attaching to
                console.log('attaching to block ' + this.clientPlayer.activeBlockIndex);
                // relativePosition = vector.add(
                //     relativePosition,
                //     this.clientPlayer.blocks[this.clientPlayer.activeBlockIndex].position
                // );

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
                });
            } catch (error) {
                // this happens when someone spams the attach key for an unknown reason
                console.log('Caught attach error -' + error);
            }
        }
    }, {
        key: 'detach',
        value: function detach() {
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

    }, {
        key: 'updatePhysics',
        value: function updatePhysics() {
            if (!this.clientPlayer) {
                return;
            }

            // save the current state of the client player, and handle new inputs to determine a new position
            this.clientPlayer.previousState.position = vector.generate(this.clientPlayer.position);
            var displacement = this.processDirectionInputs(this.clientPlayer);
            this.clientPlayer.position = vector.add(this.clientPlayer.position, displacement);
            this.checkCollisions(this.clientPlayer);
        }

        /**
         * Records mouse input and appends it to the list of
         * unprocessed inputs; the new input is sent to the server.
         */

    }, {
        key: 'recordInput',
        value: function recordInput() {
            if (!this.clientPlayer) {
                return;
            }

            // obtain the direction of movement by subtracting the mouse position from the player's position
            var mouseDirection = vector.subtract(this.clientState.mousePosition, vector.construct(this.clientPlayer.position.x - this.camera.xView, this.clientPlayer.position.y - this.camera.yView));

            // normalize the mouse direction using various scaling methods
            var normalizedDirection = this.normalizeDirection(mouseDirection);

            // increase the input number before adding the next input
            this.inputNumber++;

            // store the input along with a time and the input number for identification
            var newInput = {
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

    }, {
        key: 'processServerUpdatePosition',
        value: function processServerUpdatePosition() {
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

    }, {
        key: 'processServerUpdates',
        value: function processServerUpdates() {

            // return if no inputs exist
            if (!this.serverUpdates.length) {
                return;
            }

            // record the current local time
            var currentTime = this.clientTime;
            var targetUpdate = null;
            var previousUpdate = null;

            // find a set of updates which 'contain' the current time
            for (var i = 0; i < this.serverUpdates.length - 1; i++) {
                var currentUpdate = this.serverUpdates[i];
                var nextUpdate = this.serverUpdates[i + 1];
                if (currentTime > currentUpdate.time && currentTime <= nextUpdate.time) {
                    targetUpdate = nextUpdate;
                    previousUpdate = currentUpdate;
                    break;
                }
            }

            // if no target can be found, simply use the least recent update
            if (!targetUpdate) {
                // console.log('using 0th update');
                targetUpdate = this.serverUpdates[0];
                previousUpdate = this.serverUpdates[0];
            }

            // set the new positions based on interpolation
            if (targetUpdate && previousUpdate) {

                // calculate the interpolation point (on [0, 1]) based on the
                // position of the current time with respect to both chosen times
                this.targetTime = targetUpdate.time;
                var difference = this.targetTime - currentTime;
                var maxDifference = targetUpdate.time - previousUpdate.time;
                var interpolationPoint = 0;

                // set the interpolation point to the ratio of the actual difference to the max difference
                // if the max difference is zero, we simply keep the interpolation point at zero
                if (maxDifference != 0) {
                    interpolationPoint = difference / maxDifference;
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
                    var allowPlayer = this.predictMovement || playerId != this.clientPlayerId;
                    if (allowPlayer && this.players.hasOwnProperty(playerId)) {
                        try {
                            // calculate the theoretical position of the current player
                            var playerTargetPosition = lastServerUpdate.players[playerId].position;
                            var playerPastPosition = previousUpdate.players[playerId].position;
                            var theoreticalPlayerPosition = vector.interpolate(playerTargetPosition, playerPastPosition, interpolationPoint);

                            // smooth the transition by interpolating between the client position and server position
                            this.players[playerId].position = vector.interpolate(this.players[playerId].position, theoreticalPlayerPosition, this.clientSmoothing);

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

    }, {
        key: 'connect',
        value: function connect() {

            // connect to the server
            this.playerSocket = io();

            // handle the disconnect event
            this.playerSocket.on('disconnect', this.onDisconnect.bind(this));

            // handle the reception of a server update
            this.playerSocket.on('server-update', this.onServerUpdate.bind(this));

            // handle the altering of a solution
            this.playerSocket.on('solution-changed', this.onSolutionChanged.bind(this));

            // handle the reception of a position set command
            this.playerSocket.on('set-position', this.onSetPosition.bind(this));

            // handle the initial information transferred upon connection
            this.playerSocket.on('connected', this.onConnected.bind(this));

            // handle the addition of a player to the game
            this.playerSocket.on('player-added', this.onPlayerAdded.bind(this));

            // handle the removal of players from the game
            this.playerSocket.on('player-removed', this.onPlayerRemoved.bind(this));

            // handle the reception of a ping
            this.playerSocket.on('manual-ping', this.onPing.bind(this));

            var name = localStorage.getItem('name');
            this.playerSocket.emit('playername', { name: name });
            console.log(name);
        }

        /**
         * Updates the clients position status and sends an
         * acknowledgement to the server.
         * @param data The data from the server.
         * @param callback The function to execute on the server.
         */

    }, {
        key: 'onSetPosition',
        value: function onSetPosition(data, callback) {
            this.lockPosition = data.locked;
            callback();
        }

        /**
         * Updates the client's current solution from server data.
         * @param data The data from te server, indicating teh new solution index.
         */

    }, {
        key: 'onSolutionChanged',
        value: function onSolutionChanged(data) {
            console.log('solution changed to ' + data.solutionIndex);
            this.solution = this.possibleSolutions[data.solutionIndex];
        }
        /**
         * Responds to a player added event by adding the new
         * player to the list.
         * @param data The event data.
         */

    }, {
        key: 'onPlayerAdded',
        value: function onPlayerAdded(data) {
            // add the new player to the list of players
            this.players[data.clientPlayerId] = data.player;
        }

        /**
         * Responds to a player removed event by removing the player
         * from the list.
         * @param data The event data.
         */

    }, {
        key: 'onPlayerRemoved',
        value: function onPlayerRemoved(data) {
            // remove the player from the list of players
            console.log('removing player ' + data.clientPlayerId);
            delete this.players[data.clientPlayerId];
        }

        /**
         * Handles the transfer of information from server
         * to client when connection occurs.
         * @param data The data receive on connection.
         */

    }, {
        key: 'onConnected',
        value: function onConnected(data) {
            // assign the client player's id and the array of players
            this.clientPlayerId = data.clientPlayerId;
            this.players = data.players;

            // create an actual player object for the client player
            this.players[this.clientPlayerId] = Player.lightCopy(this.players[this.clientPlayerId]);

            // assign the client player to the player identified by the client player id
            this.clientPlayer = this.players[this.clientPlayerId];

            // assign the list of blocks
            this.blocks = data.blocks;

            // assign the current solution
            this.solution = this.possibleSolutions[data.solutionIndex];
            console.log(data.solutionIndex);
            console.log(this.solution);

            // set the camera to track the client player
            this.camera.setTarget(this.clientPlayer, this.canvas.width / 2, this.canvas.height / 2);

            // obtain the server time based on ping data
            this.serverTime = data.time + this.netLatency;
        }

        /**
         * Updates the net ping and latency measures.
         * @param data The data received from a ping message.
         */

    }, {
        key: 'onPing',
        value: function onPing(data) {
            this.netPing = new Date().getTime() - data.time;
            this.netLatency = this.netPing / 2;
        }
    }, {
        key: 'onDisconnect',
        value: function onDisconnect(data) {
            // TODO this is a stub
            console.log('disconnected: ' + this.clientPlayerId);
        }

        /**
         * Responds ot a server update event by recording the update
         * in the buffer and processing the update data.
         * @param update the server update data.
         */

    }, {
        key: 'onServerUpdate',
        value: function onServerUpdate(update) {

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
            if (this.serverUpdates.length >= FPS * this.bufferLength) {
                this.serverUpdates.splice(0, 1);
            }

            // update the oldest time still accurately recorded
            this.oldestUpdateTime = this.serverUpdates[0].time;

            // update player scores
            for (var playerId in update.players) {
                if (update.players.hasOwnProperty(playerId) && this.players.hasOwnProperty(playerId)) {
                    this.players[playerId].score = update.players[playerId].score;
                    this.players[playerId].name = update.players[playerId].name;
                }
            }

            // handle position updates from the server and interpolate with local positions
            this.processServerUpdatePosition();
        }
    }]);

    return ClientGameLogic;
}(GameLogic);

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


function trapezoid(context, color, x1, y1, x2, y2, x3, y3, x4, y4) {
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.lineTo(x3, y3);
    context.lineTo(x4, y4);
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
 * @param opacity The opacity of te fill and outlines.
 * @param fillColor The fill color of the rectangle.
 * @param outlineColors An object containing an outline color for each edge
 * of the rectangle.
 */
function drawRectangle(context, x, y, width, height, lineWidth, opacity, fillColor, outlineColors) {

    outlineColors = outlineColors || {
        top: SQUARE_OUTLINE_COLOR_DEFAULT,
        bottom: SQUARE_OUTLINE_COLOR_DEFAULT,
        left: SQUARE_OUTLINE_COLOR_DEFAULT,
        right: SQUARE_OUTLINE_COLOR_DEFAULT
    };

    context.lineWidth = lineWidth;
    // use existing fillStyle if fillStyle is not supplied
    fillColor = fillColor || context.fillStyle;

    // set opacities
    for (var key in outlineColors) {
        if (outlineColors.hasOwnProperty(key)) {
            outlineColors[key] = setOpacity(outlineColors[key], opacity);
        }
    }

    fillColor = setOpacity(fillColor, opacity);

    // use existing strokeStyle if any strokeStyle is not supplied
    var strokeStyle = context.strokeStyle;

    // context will be modified, so save it
    context.save();

    // miter the lines
    context.lineJoin = "miter";

    // context lines are always drawn half-in/half-out
    // so context.lineWidth/2 is used a lot
    var lw = context.lineWidth / 2;

    // shortcut vars for boundaries
    var leftBoundary = x - lw;
    var rightBoundary = x + lw;
    var topBoundary = y - lw;
    var bottomBoundary = y + lw;

    // top
    trapezoid(context, outlineColors.top, leftBoundary, topBoundary, rightBoundary + width, topBoundary, leftBoundary + width, bottomBoundary, rightBoundary, bottomBoundary);
    // right
    trapezoid(context, outlineColors.right, rightBoundary + width, topBoundary, rightBoundary + width, bottomBoundary + height, leftBoundary + width, topBoundary + height, leftBoundary + width, bottomBoundary);
    // bottom
    trapezoid(context, outlineColors.bottom, rightBoundary + width, bottomBoundary + height, leftBoundary, bottomBoundary + height, rightBoundary, topBoundary + height, leftBoundary + width, topBoundary + height);
    // left
    trapezoid(context, outlineColors.left, leftBoundary, bottomBoundary + height, leftBoundary, topBoundary, rightBoundary, bottomBoundary, rightBoundary, topBoundary + height);

    // fill
    context.fillStyle = fillColor;
    context.fillRect(x, y, width, height);
    context.restore();
    context.beginPath();
}

/*********************************** Block ***********************************/

var Block = function () {
    function Block(x, y, color) {
        _classCallCheck(this, Block);

        color = color || SQUARE_COLOR_BLOCK;
        this.position = vector.construct(x, y);
        this.velocity = vector.construct();
        this.size = vector.construct(SQUARE_SIZE, SQUARE_SIZE);
        this.color = color;
        this.outlineColor = SQUARE_OUTLINE_COLOR_DEFAULT;
        this.opacity = 1;
        this.health = MAX_HEALTH;
    }

    _createClass(Block, null, [{
        key: 'draw',
        value: function draw(block, context, camera, outlineColor, outlineEdge) {
            outlineColor = outlineColor || SQUARE_OUTLINE_COLOR_DEFAULT;
            var outlineColors = edge.formatColors(outlineEdge, outlineColor, SQUARE_OUTLINE_COLOR_DEFAULT);
            drawRectangle(context, block.position.x - block.size.x / 2 - camera.xView, block.position.y - block.size.y / 2 - camera.yView, block.size.x, block.size.y, OUTLINE_SIZE, block.opacity, block.color, outlineColors);
        }
    }, {
        key: 'incrementVelocity',
        value: function incrementVelocity(block) {
            // TODO implement if needed
        }
    }]);

    return Block;
}();

/*********************************** Player ***********************************/

var Player = function () {
    function Player() {
        _classCallCheck(this, Player);

        // initialize rendering values
        this.color = SQUARE_COLOR_PLAYER;

        // set initial current state values
        this.position = vector.construct(20, 20);
        this.size = vector.construct(SQUARE_SIZE, SQUARE_SIZE);

        // store the previous state of the player
        this.previousState = {
            position: vector.construct()
        };

        //initializes the player's score
        this.score = 0;

        //initializes the player's name
        //TODO: RIGHT NOW THIS IS JUST A PLACEHOLDER. THIS SHOULD BE INITALIZED WITH THE PLAYER'S ACTUAL NAME
        this.name = "";

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
    }

    /**
     * Draws the given player.
     * @param player The player object to draw.
     * @param context The context in which to draw.
     * @param camera the camera object used for offsetting
     * the players position to reflect a centered client player.
     */


    _createClass(Player, null, [{
        key: 'draw',
        value: function draw(player, context, camera) {
            for (var i = 0; i < player.blocks.length; i++) {
                var activeEdge = edge.NONE;
                if (i == player.activeBlockIndex && player.activeEdge) {
                    activeEdge = player.activeEdge;
                }
                var outlineColors = edge.formatColors(activeEdge, SQUARE_OUTLINE_COLOR_ACTIVE, SQUARE_OUTLINE_COLOR_DEFAULT);

                var xOffset = player.blocks[i].position.x * SQUARE_SEPARATION;
                var yOffset = player.blocks[i].position.y * SQUARE_SEPARATION;

                var xPosition = player.position.x - player.size.x / 2 + xOffset;
                var yPosition = player.position.y - player.size.y / 2 + yOffset;

                drawRectangle(context, xPosition - camera.xView, yPosition - camera.yView, player.size.x, player.size.y, OUTLINE_SIZE, player.blocks[i].opacity, player.blocks[i].color, outlineColors);
            }

            var x = player.blocks[0].position.x * SQUARE_SEPARATION;
            var y = player.blocks[0].position.y * SQUARE_SEPARATION;
            var xPos = player.position.x - player.size.x / 2 + x;
            var yPos = player.position.y - player.size.y / 2 + y;

            context.fillStyle = "#999";
            context.strokeStyle = "#999";

            // Set rectangle values
            var rectX = xPos - camera.xView + 50;
            var rectY = yPos - camera.yView + 40;
            // var rectWidth = 50;
            // var rectHeight = 22.5;
            // var cornerRadius = 10;
            //
            // // Set  rounded corners
            // context.lineJoin = "round";
            // context.lineWidth = cornerRadius;
            //
            // // Change origin and dimensions to match true size (a stroke makes the shape a bit larger)
            // context.strokeRect(rectX+(cornerRadius/2), rectY+(cornerRadius/2), rectWidth-cornerRadius, rectHeight-cornerRadius);
            // context.fillRect(rectX+(cornerRadius/2), rectY+(cornerRadius/2), rectWidth-cornerRadius, rectHeight-cornerRadius);

            //Show player's name:
            context.font = "bold 18px verdana, sans-serif ";
            context.fillStyle = "#fff";
            context.fillText(player.name, rectX + 5, rectY + 9);

            var wView = camera.wView;
            var hView = camera.hView;

            //Show player's score
            context.fillText("Score: " + player.score, wView - 250, hView - 675);
        }

        /**
         * Creates a new Player from a ServerPlayer or Player object.
         * Note that the generated player will not have unique fields,
         * as the references will still point to the original player.
         * @param player The player object to copy.
         * @returns {Player}
         */

    }, {
        key: 'lightCopy',
        value: function lightCopy(player) {
            var copy = new Player();
            copy.position = player.position;
            copy.previousState.position = player.previousState.position;
            copy.inputs = player.inputs;
            copy.blocks = player.blocks;
            copy.lastRenderedInputNumber = player.lastRenderedInputNumber;
            copy.lastInputTime = player.lastInputTime;
            copy.score = player.score;
            copy.name = player.name;
            return copy;
        }
    }]);

    return Player;
}();

/**
 * An extension of the normal player object, containing
 * references to the player's socket object as well as
 * the player's corresponding game object.  This information
 * is only useful on the server.
 */


var ServerPlayer = function (_Player) {
    _inherits(ServerPlayer, _Player);

    /**
     * Creates a new server player.
     * @param game The game object corresponding to the game
     * this player is in.
     * @param playerSocket the socket object corresponding to
     * this player.
     */
    function ServerPlayer(game, playerSocket) {
        _classCallCheck(this, ServerPlayer);

        var _this3 = _possibleConstructorReturn(this, (ServerPlayer.__proto__ || Object.getPrototypeOf(ServerPlayer)).call(this));

        _this3.playerSocket = playerSocket;
        _this3.game = game;
        return _this3;
    }

    return ServerPlayer;
}(Player);

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

        var framePeriod = FPS / 1000;
        var lastTime = 0;
        var vendors = ['ms', 'moz', 'webkit', 'o'];

        for (var x = 0; x < vendors.length && !window.requestAnimationFrame; x++) {
            window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
            window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
        }

        if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = function (callback, element) {
                var currentTime = Date.now();
                var waitTime = Math.max(0, framePeriod - (currentTime - lastTime));
                var id = window.setTimeout(function () {
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
    })();
}

//# sourceMappingURL=game-compiled.js.map