/**
 * Created by nobik on 20-Mar-17.
 */
$(function() {
    var socket = io.connect();
    var $messageForm = $('#messageForm');
    var $message = $('#message');
    var $chats = $('.chats');
    var $userForm = $('#userForm');
    var $userFormArea = $('#userFormArea');
    var $registerArea = $('#registerArea');
    var $messageArea = $('#messageArea');
    var $users = $('#list-users');
    var $roomName = $('#roomName');
    var $username = $('#username');
    var myAvatar;
    var usernameSocket;
    var $imageFile = $('#imageFile');
    var $shareImage = $('#shareImage');
    var $showHistory = $('#showHistory');
    var idVideo = '';
    var socketID = '';
    var roomName = '';
    var timeStart;
    var startQuery = 0;
    var limit = 5;
    var typing = false;
    var timeout = undefined;

    //Disconnect:
    socket.on('leave',function(data){
        if(data.boolean && roomName==data.room){
            $chats.append($('<li class="alert-user"><strong>' + data.user + '</strong> leaves this room!</strong></li>'));
        }
    });

    //Send mess
    $messageForm.submit(function() {
        // e.prventDefault();
        console.log($message.val());
        if ($message.val() != '') {
            socket.emit('send message', $message.val());
            $message.val('');
        }
        return false;
    });

    //Recieved new mess
    socket.on('new message', function(data) {
        console.log(data);
        console.log('username: ' + usernameSocket);
        if (data.user == usernameSocket) {
            $chats.append($(
                '<li class="me" tabindex="1">'+
                '<div class="image">' +
                '<img class="rounded-circle chat-avatar" src=' + data.avatar + ' />' +
                '<br />' +
                '<strong class="name">' + data.user + '</strong> ' +
                '</div>' +
                '<p>' + data.msg + '</p>' +
                '</li>'));
        }
        else {
            $chats.append($(
                '<li class="you" tabindex="1">'+
                '<div class="image">' +
                '<img class="rounded-circle chat-avatar" src=' + data.avatar + ' />' +
                '<br />' +
                '<strong class="name">' + data.user + '</strong> ' +
                '</div>' +
                '<p>' + data.msg + '</p>' +
                '</li>'));
        }
        // $('#chatContent').animate({scrollTop: $('ul.chats li:last-child').position().top}, 'slow');
        $('#chatContent').animate({ scrollTop:  $('ul.chats').height() }, 1000);
    });

    //New User:
    $userForm.submit(function() {
        // e.prventDefault();
        console.log(socket);
        console.log(socket.id);
        var timestamp = Date.now();
        timeStart = Math.floor(timestamp / 1000);
        console.log('Time: ' + timeStart);
        socketID = socket.id;
        usernameSocket = $username.val();
        roomName = $roomName.val();
        myAvatar = $('img.my-avatar').attr('src');
        console.log(myAvatar);
        $('.messages-box .card-header').html('Room: ' + roomName);
        console.log('Room: ' + $roomName.val());
        if ((usernameSocket != '') && (roomName != '')) {
            socket.emit('new user', {
                username: $username.val(),
                roomName: $roomName.val(),
                myAvatar: myAvatar,
                idVideo: idVideo,
                socketID: socketID
            }, function(data) {
                if (data) {
                    $registerArea.hide();
                    $messageArea.show();
                }
            });
            console.log(socket);
            $username.val('');
            $roomName.val('');
            return false;
        }
    });

    //Update Users Online
    socket.on('get users', function(data) {
        var html = '';
        var tmpString;
        var idSocket;
        var idVideoSocket;
        var idAvatar;
        // alert('1');
        console.log('new: ' + data);
        for (var key in data) {
            tmpString = data[key].split('+++');
            idSocket = tmpString[0];
            idVideoSocket = tmpString[1];
            idAvatar = tmpString[2];
            console.log('key: ' + key + ' --- data' + data[key]);
            if (key != usernameSocket) {
                html += '<li class="list-group-item"><img src="' + idAvatar + '" class="rounded-circle choose-avatar">' + key + '<span class="call-area"><button type="button" onclick="" class="video-call" id="call-' + key + '" value="' + data[key] + '">Call</button></span></li>';
            }
        }
        $users.html(html);
    });

    //User join:
    socket.on('new user join', function (data) {
        $chats.append($('<li class="alert-user"><strong>' + data + '</strong> joined this room!</strong></li>'));
    });

    //Send Image
    $imageFile.on('change', function(e) {
        var file = e.originalEvent.target.files[0];
        var reader = new FileReader();
        reader.onload = function(evt) {
            console.log('Image: ' + evt);
            socket.emit('user image', evt.target.result);
        };
        reader.readAsDataURL(file);
    });

    //Load Image:
    socket.on('addImage', function(data) {
        // $chats.append($('<div class="well"><strong>' + data.user + '</strong>: <img height="100" width="100" src="' + data.img + '"></div>'));
        if (data.user == usernameSocket) {
            $chats.append($(
                '<li class="me">'+
                '<div class="image">' +
                '<img class="rounded-circle chat-avatar" src=' + data.avatar + ' />' +
                '<br />' +
                '<strong class="name">' + data.user + '</strong> ' +
                '</div>' +
                ' <img height="300" width="300" src="' + data.img + '">' +
                '</li>'));
        }
        else {
            $chats.append($(
                '<li class="you">'+
                '<div class="image">' +
                '<img class="rounded-circle chat-avatar" src=' + data.avatar + ' />' +
                '<br />' +
                '<strong class="name">' + data.user + '</strong> ' +
                '</div>' +
                ' <img height="300" width="300" src="' + data.img + '">' +
                '</li>'));
        }
         $('#chatContent').animate({ scrollTop:  $('ul.chats').height() }, 1000);
    });

    //Upload avatar:
    $("#avatarUpload").on('change', function (e) {
        var file = e.originalEvent.target.files[0];
        var reader = new FileReader();
        usernameSocket = $username.val();
        if (usernameSocket == '') {
            alert('nhap ho ten');
            return true;
        }
        else {
            reader.onload = function(evt) {
                console.log('Avatar: ' + evt);
                socket.emit('upload avatar', {avatar: evt.target.result, user: usernameSocket});
            };
            reader.readAsDataURL(file);
        }

    });

    socket.on('change upload avatar', function (data) {
        $('img.my-avatar').attr('src', data.img);
    });

    //Show History:
    $showHistory.click(function() {
        socket.emit('show history', {timeStart: timeStart, startQuery: startQuery});
//                $showHistory.hide();
    });

    socket.on('load history', function(data) {
        console.log(data.data);
        $.each(data.data, function() {
            if (this.username == usernameSocket) {
                $chats.prepend($(
                    '<li class="me">'+
                    '<div class="image">' +
                    '<img class="rounded-circle chat-avatar" src=' + this.avatar + ' />' +
                    '<br />' +
                    '<strong class="name">' + this.username + '</strong> ' +
                    '</div>' +
                    '<p>' + this.message + '</p>' +
                    '</li>'));
            }
            else {
                $chats.prepend($(
                    '<li class="you">'+
                    '<div class="image">' +
                    '<img class="rounded-circle chat-avatar" src=' + this.avatar + ' />' +
                    '<br />' +
                    '<strong class="name">' + this.username + '</strong> ' +
                    '</div>' +
                    '<p>' + this.message + '</p>' +
                    '</li>'));
            }
        });
        startQuery = data.startQuery;
        console.log('startQuery: ' + startQuery);
    });

    socket.on('full history', function () {
        alert('History up to date!');
    });

    //Update user name register:
    $username.keyup(function (e) {
       var user_name_tmp = $username.val();
        if (user_name_tmp != '') {
            socket.emit('sendUserNameRegister', user_name_tmp);
        }
    });

    socket.on('updateUserNameRegister', function (data) {
       $('h3.my-name').html(data);
    });

    //Who is typing:
    $('#message').keyup(function (e) {
        if (e.keyCode != 13) {
            if ($message.val() != '') {
                typing = true;
                socket.emit('typing');
                timeout = setTimeout(timeoutFunction, 5000);
            }
            else {
                clearTimeout(timeout);
                timeout = setTimeout(timeoutFunction, 100);
            }
        }
        else {
            clearTimeout(timeout);
            timeout = setTimeout(timeoutFunction, 100);
        }
    });

    function timeoutFunction(){
        typing = false;
        socket.emit('noLongerTypingMessage');
    }

    socket.on('who is typing', function () {
        $('.whoType').html('Someone is typing....');
    });

    socket.on('no one typing', function () {
        $('.whoType').html('');
    });
    //Update avatar:
    $('ul.list-avatar li').click(function () {
       var my_avatar_src = $(this).find('img').attr('src');
        socket.emit('choose avatar', my_avatar_src);
    });

    socket.on('updateAvatar', function (data) {
        console.log(data);
        $('img.my-avatar').attr('src', data);
    });

    // Video Call - Peer2Peer
    // Compatibility shim
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

    // PeerJS object
    var peer = new Peer({
        key: 'xdfzho06d6wm6lxr',
        debug: 3
    });

    peer.on('open', function() {
        console.log(peer);
        idVideo = peer.id;
        $('#my-id').text(peer.id);
    });

    // Receiving a call
    peer.on('call', function(call) {
        // Answer the call automatically (instead of prompting user) for demo purposes
        call.answer(window.localStream);
        remoteControl(call);
    });
    peer.on('error', function(err) {
        alert(err.message);
        // Return to step 2 if error occurs
        infoLocal();
    });

    //Confirm call:
    socket.on('confirm call', function(data) {
        result = confirm('Accept Call?');
        if (result == true) {
            socket.emit('accepted', data);
        }
    });

    //Starting call:
    socket.on('start call', function(data) {
        $('#videoCallArea').show();
        localVideo(data);
        console.log(data);

    });
    // Click handlers setup
    $(document).on('click', 'button.video-call', function() {
        // Initiate a call!
        var idCall = $(this).val();
        var tmpString = idCall.split('+++');
        var idSocket = tmpString[0];
        var idVideoSocket = tmpString[1];
        console.log('idSocket: ' + idSocket);
        console.log('idVideoSocket: ' + idVideoSocket);
        socket.emit('request call', {
            idSocket: idSocket,
            idVideoSocket: idVideoSocket
        });
    });

    $('#end-call').click(function() {
        window.existingCall.close();
        window.localStream.close();
        $('#videoCallArea').show();
        $('#their-video').hide();
        infoLocal();
    });

    // Retry if getUserMedia fails
    $('#localVideo-retry').click(function() {
        $('#localVideo-error').hide();
        localVideo();
    });

    // Get things started
    // localVideo();
    function localVideo(data, callback) {
        // Get audio/video stream
        navigator.getUserMedia({
            audio: true,
            video: true
        }, function(stream) {
            // Set your video displays
            $('#my-video').prop('src', URL.createObjectURL(stream));
            window.localStream = stream;
            var call = peer.call(data, window.localStream);
            remoteControl(call);
        }, function() {
            $('#localVideo-error').show();
        });
    }

    function infoLocal() {
        $('#localVideo, #remoteControl').hide();
        $('#their-video').hide();
    }

    function remoteControl(call) {
        // Hang up on an existing call if present
        if (window.existingCall) {
            window.existingCall.close();
        }

        // Wait for stream on the call, then set peer video display
        call.on('stream', function(stream) {
            $('#their-video').prop('src', URL.createObjectURL(stream));
            $('#their-video').show();
        });

        // UI stuff
        window.existingCall = call;
        $('#their-id').text(call.peer);
        call.on('close', infoLocal);
        $('#localVideo, #infoLocal').hide();
        $('#remoteControl').show();
    }
});