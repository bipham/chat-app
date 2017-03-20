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
app.use('/', express.static(__dirname + '/public'));

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
		connections.splice(connections.indexOf(socket), 1);
		// Notify the other person in the chat room
		// that his partner has left
		io.sockets.in(this.roomName).emit('leave', {
			boolean: true,
			room: this.roomName,
			user: this.username,
			avatar: this.avatar
		});
		// leave the room
		if (typeof this.roomName != 'undefined') {
			delete users[this.roomName][this.username];
			console.log('del success');
		}
		console.log('Dis room: ' + this.roomName);
		console.log('Dis user: ' + this.username);
		updateUsernames(this.roomName);
		// socket.leave(this.roomName);
		console.log('Disconnected: %s sockets connected', connections.length);

	});

	//Send messages:
	socket.on('send message', function(data) {
		console.log('mess: ' + data);
		console.log('User: ' + socket.username);
		console.log('Room: ' + socket.roomName);
		console.log('avatar: ' + socket.avatar);
		conn.query('INSERT INTO history (username, avatar, message, room) VALUES ("' + socket.username + '","' + socket.avatar + '","' + data  + '","'+ socket.roomName + '")', function(err) {
			if(err) {
				console.log('ERROR INSERT');
				throw err;
			}
			else {
				console.log('INSERT SUCCESS');
			}
		});
		io.sockets.in(socket.roomName).emit('new message', {msg: data, user: socket.username, avatar: socket.avatar});
	});

	//New user:
	socket.on('new user', function(data, callback) {
		callback(true);
		socket.username = data.username;
		socket.roomName = data.roomName;
		socket.avatar = data.myAvatar;
		socket.idVideo = data.idVideo;
		console.log(data);
		if (typeof users[socket.roomName] == 'undefined') {
    		// the variable is defined
    		users[socket.roomName] = {};
    		var idSocket = socket.id + '+++' + socket.idVideo + '+++' + socket.avatar;
    		users[socket.roomName][socket.username] = idSocket;
		}
		else {
            var idSocket = socket.id + '+++' + socket.idVideo + '+++' + socket.avatar;
            users[socket.roomName][socket.username] = idSocket;
		}
		socket.join(socket.roomName);
		updateUsernames(socket.roomName);
		io.sockets.in(socket.roomName).emit('new user join', socket.username);
	});

	function updateUsernames(room) {
		io.sockets.in(room).emit('get users', users[room]);
	}

	//Share image:
	socket.on('user image', function(image) {
		io.sockets.emit('addImage', {img: image, user: socket.username, avatar: socket.avatar});
	});

	//Upload Avatar:
	socket.on('upload avatar', function (data) {
		var avatar = data.avatar;
		var base64Data = avatar.replace(/^data:image\/png;base64,/, "");
		var imgName = data.user;
		imgName = imgName.replace(/\s+/g, '');
		console.log('imgs: ' + base64Data);
		require("fs").writeFile("public/img/" + imgName + ".png", base64Data, 'base64', function(err) {
			console.log(err);
		});
		var imgUrl = "img/" + imgName + ".png";
		io.sockets.in(socket.id).emit('change upload avatar', {img: imgUrl, user: socket.username, avatar: socket.avatar});
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

	//Update Name Register:
	socket.on('sendUserNameRegister', function (data) {
		socket.emit('updateUserNameRegister', data);
	});

	//Update avatar:
	socket.on('choose avatar', function (data) {
		socket.emit('updateAvatar', data);
	});

	//Who is typing:
	socket.on('typing', function () {
		socket.broadcast.in(socket.roomName).emit('who is typing');
	});

	socket.on('noLongerTypingMessage', function () {
		socket.broadcast.in(socket.roomName).emit('no one typing');
	});
});