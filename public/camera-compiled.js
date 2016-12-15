"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/*********************************** Rectangle ***********************************/

var Rectangle = function () {
    function Rectangle(left, top, width, height) {
        _classCallCheck(this, Rectangle);

        this.left = left || 0;
        this.top = top || 0;
        this.width = width || 0;
        this.height = height || 0;
        this.right = this.left + this.width;
        this.bottom = this.top + this.height;
    }

    _createClass(Rectangle, [{
        key: "set",
        value: function set(left, top, /*optional*/width, /*optional*/height) {
            width = width || this.width;
            height = height || this.height;
            this.left = left;
            this.top = top;
            this.width = width;
            this.height = height;
            this.right = this.left + this.width;
            this.bottom = this.top + this.height;
        }
    }, {
        key: "within",
        value: function within(r) {
            return r.left <= this.left && r.right >= this.right && r.top <= this.top && r.bottom >= this.bottom;
        }
    }, {
        key: "overlaps",
        value: function overlaps(r) {
            return this.left < r.right && r.left < this.right && this.top < r.bottom && r.top < this.bottom;
        }
    }]);

    return Rectangle;
}();

/*********************************** Camera ***********************************/

// possibles axis to move the camera


var AXIS = {
    NONE: "none",
    HORIZONTAL: "horizontal",
    VERTICAL: "vertical",
    BOTH: "both"
};

var Camera = function () {
    function Camera(xView, yView, canvasWidth, canvasHeight, worldWidth, worldHeight) {
        _classCallCheck(this, Camera);

        // position of camera (left-top coordinate)
        this.xView = xView || 0;
        this.yView = yView || 0;

        // distance from target object to border before camera starts move
        this.xDeadZone = 0; // min distance to horizontal borders
        this.yDeadZone = 0; // min distance to vertical borders

        // viewport dimensions
        this.wView = canvasWidth;
        this.hView = canvasHeight;

        // allow camera to move in vertical and horizontal axis
        this.axis = AXIS.BOTH;

        // object that should be followed
        this.target = null;

        // rectangle that represents the viewport
        this.viewportRect = new Rectangle(this.xView, this.yView, this.wView, this.hView);

        // rectangle that represents the world's boundary (room's boundary)
        this.worldRect = new Rectangle(0, 0, worldWidth, worldHeight);
    }
    /**
     * Updates the parameters of the camera to respond to changes in the window size.
     * @param canvasWidth the new canvas width.
     * @param canvasHeight the new canvas height.
     * @param xDeadZone The new x dead zone (defaults to canvasWidth / 2).
     * @param yDeadZone The new y dead zone (defaults to canvasHeight / 2).
     */


    _createClass(Camera, [{
        key: "updateConfiguration",
        value: function updateConfiguration(canvasWidth, canvasHeight, xDeadZone, yDeadZone) {
            xDeadZone = xDeadZone || canvasWidth / 2;
            yDeadZone = yDeadZone || canvasHeight / 2;
            this.wView = canvasWidth;
            this.hView = canvasHeight;
            this.xDeadZone = xDeadZone;
            this.yDeadZone = yDeadZone;
            this.viewportRect = new Rectangle(this.xView, this.yView, this.wView, this.hView);
        }

        /**
         * Configures the camera to follow the given game object.
         * @param gameObject The game object to follow.
         * @param xDeadZone The maximum x distance from the target
         * to the border before the camera begins moving.
         * @param yDeadZone The maximum y distance from the target
         * to the border before the camera begins moving.
         */

    }, {
        key: "setTarget",
        value: function setTarget(gameObject, xDeadZone, yDeadZone) {
            this.target = gameObject;
            this.xDeadZone = xDeadZone;
            this.yDeadZone = yDeadZone;
        }

        /**
         * Updates the camera position.
         */

    }, {
        key: "update",
        value: function update() {
            // keep following the target
            if (this.target != null) {
                if (this.axis == AXIS.HORIZONTAL || this.axis == AXIS.BOTH) {
                    // moves camera on horizontal axis based on followed object position
                    if (this.target.position.x - this.xView + this.xDeadZone > this.wView) {
                        this.xView = this.target.position.x - (this.wView - this.xDeadZone);
                    } else if (this.target.position.x - this.xDeadZone < this.xView) {
                        this.xView = this.target.position.x - this.xDeadZone;
                    }
                }
                if (this.axis == AXIS.VERTICAL || this.axis == AXIS.BOTH) {
                    // moves camera on vertical axis based on target object's position
                    if (this.target.position.y - this.yView + this.yDeadZone > this.hView) {
                        this.yView = this.target.position.y - (this.hView - this.yDeadZone);
                    } else if (this.target.position.y - this.yDeadZone < this.yView) {
                        this.yView = this.target.position.y - this.yDeadZone;
                    }
                }
            }

            // update viewportRect
            this.viewportRect.set(this.xView, this.yView);

            // don't let camera leaves the world's boundary
            if (!this.viewportRect.within(this.worldRect)) {
                if (this.viewportRect.left < this.worldRect.left) {
                    this.xView = this.worldRect.left;
                }
                if (this.viewportRect.top < this.worldRect.top) {
                    this.yView = this.worldRect.top;
                }
                if (this.viewportRect.right > this.worldRect.right) {
                    this.xView = this.worldRect.right - this.wView;
                }
                if (this.viewportRect.bottom > this.worldRect.bottom) {
                    this.yView = this.worldRect.bottom - this.hView;
                }
            }
        }
    }]);

    return Camera;
}();

//# sourceMappingURL=camera-compiled.js.map