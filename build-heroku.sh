#!/usr/bin/env bash

node_modules/.bin/babel --source-maps --out-file public/camera-compiled.js --presets es2015 public/camera.js
node_modules/.bin/babel --source-maps --out-file public/client-compiled.js --presets es2015 public/client.js
node_modules/.bin/babel --source-maps --out-file public/game-compiled.js --presets es2015 public/game.js
echo everything
ls