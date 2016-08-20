#!/bin/bash
PATH=/home/pi/.nvm/versions/node/v4.4.7/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/games:/usr/games:/opt/bin

nodemon /home/pi/AwwFrame/src/server.js &
nodemon /home/pi/AwwFrame/src/reddit.js &

