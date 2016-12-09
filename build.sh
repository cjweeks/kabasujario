
# ths script will transpile each javascript file into a *-compiled.js file to be used in production.

babel --source-maps --out-file public/camera-compiled.js --presets es2015 public/camera.js
babel --source-maps --out-file public/client-compiled.js --presets es2015 public/client.js
babel --source-maps --out-file public/game-compiled.js --presets es2015 public/game.js
# babel --source-maps --out-file app-compiled.js --presets es2015 app.js
# babel --source-maps --out-file game-server-compiled.js --presets es2015 game-server.js
