

/*********************************** Rectangle ***********************************/

class Rectangle {
    constructor(left, top, width, height) {
        this.left = left || 0;
        this.top = top || 0;
        this.width = width || 0;
        this.height = height || 0;
        this.right = this.left + this.width;
        this.bottom = this.top + this.height;
    }

    set(left, top, /*optional*/width, /*optional*/height) {
        width = width || this.width;
        height = height || this.height;

        this.left = left;
        this.top = top;
        this.width = width;
        this.height = height ;
        this.right = this.left + this.width;
        this.bottom = this.top + this.height;
    }

    within(r) {
        return (
            r.left <= this.left &&
            r.right >= this.right &&
            r.top <= this.top &&
            r.bottom >= this.bottom
        );
    }

    overlaps(r) {
        return (
            this.left < r.right &&
            r.left < this.right &&
            this.top < r.bottom &&
            r.top < this.bottom
        );
    }
}


/*********************************** Camera ***********************************/

// possibles axis to move the camera
const AXIS = {
    NONE: "none",
    HORIZONTAL: "horizontal",
    VERTICAL: "vertical",
    BOTH: "both"
};


class Camera {
    constructor(xView, yView, canvasWidth, canvasHeight, worldWidth, worldHeight) {
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

    // gameObject needs to have "x" and "y" properties (as world(or room) position)
    follow(gameObject, xDeadZone, yDeadZone) {
        this.target = gameObject;
        this.xDeadZone = xDeadZone;
        this.yDeadZone = yDeadZone;
    };

    update() {
        // keep following the target
        if (this.target != null) {
            if(this.axis == AXIS.HORIZONTAL || this.axis == AXIS.BOTH) {
                // moves camera on horizontal axis based on followed object position
                if (this.target.position.x - this.xView  + this.xDeadZone > this.wView) {
                    this.xView = this.target.position.x - (this.wView - this.xDeadZone);
                } else if (this.target.position.x  - this.xDeadZone < this.xView) {
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
            if( this.viewportRect.top < this.worldRect.top) {
                this.yView = this.worldRect.top;
            }
            if(this.viewportRect.right > this.worldRect.right) {
                this.xView = this.worldRect.right - this.wView;
            }
            if(this.viewportRect.bottom > this.worldRect.bottom) {
                this.yView = this.worldRect.bottom - this.hView;
            }
        }
    };
}
