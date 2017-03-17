var express = require('express');
var http = require('http');
var app = express();
var mysql = require('mysql');

var conn = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: '',
	database: 'simple-chat'
});

conn.connect(function(error){
	if(!!error) {
		console.log('Connect DB error');
	}
	else {
		console.log('DB Connected');
	}
});

var static = require('node-static');
var file = new(static.Server)();
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});
var server = http.createServer(app);
var io = require('socket.io').listen(server);
server.listen(5000);
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
		console.log('mess: ' + data);
		console.log('User: ' + socket.username);
		console.log('Room: ' + socket.roomName);
		conn.query('INSERT INTO history (username, message, room) VALUES ("' + socket.username + '","' + data  + '","'+ socket.roomName + '")', function(err, row, field) {
			if(err) {
				console.log('ERROR INSERT');
				throw err;
			}
			else {
				console.log('INSERT SUCCESS');
			}
		});
		io.sockets.in(socket.roomName).emit('new message', {msg: data, user: socket.username});
	});

	//New user:
	socket.on('new user', function(data, callback) {
		callback(true);
		socket.username = data.username;
		socket.roomName = data.roomName;
		socket.idVideo = data.idVideo;
		console.log(data);
		if (typeof users[socket.roomName] == 'undefined') {
    		// the variable is defined
    		users[socket.roomName] = {};
    		var idSocket = socket.id + '+++' + socket.idVideo;
    		users[socket.roomName][socket.username] = idSocket;
		}
		else {
            var idSocket = socket.id + '+++' + socket.idVideo;
            users[socket.roomName][socket.username] = idSocket;
		}
		console.log(users[socket.roomName]);
		socket.join(socket.roomName);
		updateUsernames();
	});

	function updateUsernames() {
		io.sockets.in(socket.roomName).emit('get users', users[socket.roomName])
	}

	//Share image:
	socket.on('user image', function(image) {
		io.sockets.emit('addImage', {img: image, user: socket.username});
	});

	//Show history:
	socket.on('show history', function(data) {
		console.log('Current: ' + data.timeStart);
		console.log('Current query: ' + data.startQuery);
		console.log('Room Name: ' + socket.roomName);
		var startQuery = data.startQuery;
		conn.query('SELECT * FROM history WHERE room = "' + socket.roomName + '" AND UNIX_TIMESTAMP(created) < ' + data.timeStart + ' ORDER BY ID DESC LIMIT ' + startQuery + ', 10', function(err, rows) {
			if(err) {
				console.log('ERROR SELECT');
				throw err;
			}
			else {
				if (rows.length > 0) {
					startQuery = startQuery + rows.length;
					var data = rows;
					console.log('ID SOCKET: ' + socket.id);
					console.log('DATA SELECTED: ' + rows.length);
					io.sockets.in(socket.id).emit('load history', {data: data, startQuery: startQuery});
				}
				else {
					io.sockets.in(socket.id).emit('full history');
				}
			}
		});
	});

	//Request call:
	socket.on('request call', function (data) {
        console.log(data);
        var idSocket = data.idSocket;
        socket.broadcast.in(idSocket).emit('confirm call', data.idVideoSocket);
    });
	socket.on('accepted', function (data) {
        console.log(data);
        io.sockets.in(socket.roomName).emit('start call', data);
    });
});