var express = require('express');
var http = require('http');
var app = express();

var static = require('node-static');
var file = new(static.Server)();
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});
var server = http.createServer(app);
var io = require('socket.io').listen(server);
server.listen(2013);
// http.createServer(app, function (req, res) {
//   file.serve(req, res);
//   console.log('Listen on *:2013');
// }).listen(2013);

io.on('connection', function(socket) {
    console.log('a user connected');
    socket.on('disconnect', function() {
        console.log('user disconnected');
    });
    socket.on('chat message', function(msg) {
        console.log('message: ' + msg);
        io.emit('chat message', msg);
    });

});