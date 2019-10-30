"use strict";
var express = require('express');
const cors = require('cors');
var cookieParser = require('cookie-parser')

const PORT = process.env.PORT || process.env.port || 38082;

// Setup the Express app that will run the server
var app = express();
var server = require('http').Server(app);
app.use(cors());
app.enable('trust proxy');
app.options('*', cors());
app.use(cookieParser())
app.all('/', function(req, res, next) {
    res.header("Cache-Control", "no-cache, no-store, must-revalidate");
    res.header("Pragma", "no-cache");
    res.header("Expires", 0);
    next();
});

const webSockets = require('./websockets.js').start(server, PORT, app);

app.all('/proxy/:device/*', function(req, res, next) {
    const deviceID = req.params.device;
    var cookieDevice = req.cookies.device;
    if (cookieDevice === undefined)
    {
      // no: set a new cookie
      res.cookie('device', deviceID, { maxAge: 900000, httpOnly: true });
      console.log('cookie created successfully');
    } 
    else
    {
      // yes, cookie was already present 
      console.log('cookie exists', cookieDevice);
    } 

    console.log('device', req.params, req.path);
    // websocket request to device ID

    webSockets.send(deviceID, res, req.path.split('/proxy/' + deviceID).join(''), next);
});

app.get('/devices', function(req, res, next) {
    res.send(webSockets.fyoClients);
});

app.all('*', function(req, res, next) {
    var cookieDevice = req.cookies.device;
    console.log(req.cookies, req.cookies.device);
    if (req.cookies.device)
    {
        webSockets.send(req.cookies.device, res, req.path, next);
    } else {
        console.log('no cookie');
        next();
    }
});

server.listen(PORT, function(err) {
    if (err) {
        return;
    }
    console.log('server listening on port: ' + PORT);
});