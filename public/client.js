

/**
 * Returns a vector of the position of the mouse in
 * the given canvas element triggered on an event.
 * @param canvas The canvas element to report the
 * mouse position in.
 * @param event The data from the event containing
 * the mouse position.
 * @returns {vector} The mouse position.
 */
function getMousePosition(canvas, event) {
    var boundingRectangle = canvas.getBoundingClientRect();
    return vector.construct(
        (event.clientX - boundingRectangle.left) / (boundingRectangle.right - boundingRectangle.left) * canvas.width,
        (event.clientY - boundingRectangle.top) / (boundingRectangle.bottom - boundingRectangle.top) * canvas.height
    );
}

window.onload = function () {

    // obtain a reference to the canvas
    var canvas = document.getElementById('canvas');

    // set the wdth of the canvas to the width of the client's screen
    canvas.width = window.innerWidth; //document.body.clientWidth;
    canvas.height = window.innerHeight; //document.body.clientHeight;
    console.log(document.body.clientHeight);

    // create the camera object for the game
    var camera = new Camera(0, 0, canvas.width, canvas.height, world.width, world.height);
    //console.log('(' + canvas.width + ', ' + canvas.height + ')');
    //console.log(camera);

    // create the game logic object to simulate the client-side game
    var gameLogic = new ClientGameLogic(camera);

    // create a reference to the canvas and reset the dimensions
    gameLogic.viewport = canvas;
    // gameLogic.viewport.width = world.width;
    // gameLogic.viewport.height = world.height;

    // create a reference to the rendering context for drawing
    gameLogic.context = gameLogic.viewport.getContext('2d');

    // add a mouse listener to report mouse position
    gameLogic.viewport.addEventListener('mousemove', function (event) {
        gameLogic.clientState.mousePosition = getMousePosition(gameLogic.viewport, event);
    }, false);

    // add key-pressed event for the space bar to toggle movement
    $(window).keypress(function (event) {
        if (event.keyCode === 0 || event.keyCode === 32) {
            event.preventDefault();
            gameLogic.clientState.movementEnabled = !gameLogic.clientState.movementEnabled;
        }
    });

    // start the client update loop
    gameLogic.update(new Date().getTime());

};
