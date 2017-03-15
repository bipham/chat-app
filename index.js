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
console.log('Server running ....');
users = [];
connections = [];
io.sockets.on('connection', function(socket) {
	connections.push(socket);
	console.log('Connected: ' + connections.length + ' sockets connected');

	//Disconnect
	socket.on('disconnect', function(data) {
		users.splice(users.indexOf(socket.username, 1));
		connections.splice(connections.indexOf(socket), 1);
		console.log('Disconnected: %s sockets connected', connections.length);
	});

	//Send messages:
	socket.on('send message', function(data) {
		console.log(data);
		io.sockets.emit('new message', {msg: data, user: socket.username});
	});

	//New user:
	socket.on('new user', function(data, callback) {
		callback(true);
		socket.username = data;
		users.push(socket.username);
		updateUsernames();
	})

	function updateUsernames() {
		io.sockets.emit('get users', users)
	}
});