

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
    const boundingRectangle = canvas.getBoundingClientRect();
    return vector.construct(
        (event.clientX - boundingRectangle.left) / (boundingRectangle.right - boundingRectangle.left) * canvas.width,
        (event.clientY - boundingRectangle.top) / (boundingRectangle.bottom - boundingRectangle.top) * canvas.height
    );
}

// the key code to trigger attachment and detachment (the 'c' key)
const ATTACH_KEY_CODE = 67;

window.onload = function () {

    // obtain a reference to the canvas
    let canvas = document.getElementById('canvas');

    // set the width of the canvas to the width of the client's screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    console.log(document.body.clientHeight);

    // create the camera object for the game
    let camera = new Camera(0, 0, canvas.width, canvas.height, world.width, world.height);

    // create the game logic object to simulate the client-side game
    let gameLogic = new ClientGameLogic(camera);

    // create a reference to the canvas and reset the dimensions
    gameLogic.canvas = canvas;

    // create a reference to the rendering context for drawing
    gameLogic.context = gameLogic.canvas.getContext('2d');

    // add a mouse listener to report mouse position
    gameLogic.canvas.addEventListener('mousemove', function (event) {
        gameLogic.clientState.mousePosition = getMousePosition(gameLogic.canvas, event);
    }, false);

    // add key-pressed event for movement, attachment, detachment
    window.addEventListener('keyup', function (event) {
        event.preventDefault();
        let character = event.which || event.keyCode;
        if (character === 0 || character === 32) {
            // toggle movement
            gameLogic.clientState.movementEnabled = !gameLogic.clientState.movementEnabled;
        } else if (character === ATTACH_KEY_CODE && !event.shiftKey) {
            // attach to the candidate block
            gameLogic.attach();
        } else if (character === ATTACH_KEY_CODE && event.shiftKey) {
            // detach the most recently added block
            gameLogic.detach();
        }
    });


    // add a window-resize listener to update the camera if the window is resized
    window.addEventListener('resize', function () {
        // resize the canvas
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        console.log(canvas.width + ', ' + canvas.height);

        // notify the camera of this change
        camera.updateConfiguration(window.innerWidth, window.innerHeight);
    });

    // start the client update loop
    gameLogic.update(new Date().getTime());

};
