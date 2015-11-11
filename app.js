var express    = require('express');
var app        = express();
var server     = require('http').createServer(app);
var io         = require('socket.io')(server);
var bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/', function (req, res) {
    res.sendfile('./public/index.html');
});


var userNames = {};
var clients = [];

io.on('connection', function (theSocket) {
    theSocket.on('add-user', function (room, username) {
        console.log('\rUser ' + username + ' joined room ' + room + '\r');
        if (typeof userNames[room] === 'undefined') {
            userNames[room] = [];
        }

        if (room === 'global') {
            if (userNames[room].indexOf(username) >= 0) {
                theSocket.emit('duplicate-username');
                return false;
            } else {
                clients[username] = theSocket.id;
            }
        }

        userNames[room].push(username);

        theSocket.username = username;
        theSocket.room = room;
        theSocket.join(room);

        io.to(room).emit('update-room-users', room, userNames[room]);
        io.to(room).emit('update-chat', room, ':::', '<span class="new-user-message">' + username + ' has connected to this chat</span>');
    });

    theSocket.on('invite-user', function (room, username) {
        if (typeof clients[username] === 'undefined') {
            theSocket.emit('user-missing', username);
        } else {
            io.to(clients[username]).emit('invitation', room);
        }
    });

    theSocket.on('create-room', function (room, username) {
        theSocket.username = username;

        userNames[room] = {};
        userNames[room][username] = username;

        theSocket.room = room;
        theSocket.join(room);

        io.to(room).emit('update-room-users', room, username[room]);
    });

    theSocket.on('new-reply', function (room, message) {
        io.to(room).emit('update-chat', room, theSocket.username, message);
    });

    theSocket.on('disconnect', function () {
        var index;
        for (var room in userNames) {
            index = userNames[room].indexOf(theSocket.username);
            if (index != -1) {
                userNames[room].splice(index, 1);
                io.emit('update-room-users', room, userNames[room]);
                io.to(room).emit('update-chat', room, ':::', '<span class="user-left-message">' + theSocket.username + ' has left this chat</span>');
            }
        }
    });
});

server.listen(process.env.PORT || 8000, function () {
    /* (process.env.PORT for the Heroku deployment, 8000 for localhost) */
    console.log('Server is running on port %d', 8000);
});
