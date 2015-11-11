var app = {
    currentUser : '',
    globalUsers : [],
    socketClient : null,
    events : {
        front : {
            newRoom : function () {
                var randomInt = Math.floor(Math.random() * 1000);
                var room = moment().unix() + randomInt;

                var tab = $('#chat-tabpanel .nav-tabs li.hidden').html();
                var content = $('.tab-content #newroom').clone().html();

                $('#chat-tabpanel .nav-tabs').append('<li role="presentation">' + tab.replace('newroom', room).replace('+', 'Room ' + room) + '</li>');
                $('#chat-tabpanel .tab-content').append('<div role="tabpanel" class="tab-pane active custom-room" id="' + room + '">' + content + '</div>');
                $('#chat-tabpanel .nav-tabs a:last').tab('show');

                var invitableUsersContainer = $('#' + room + ' .other-users');
                var elmt = '';
                app.globalUsers.forEach(function (userName) {
                    if (userName != app.currentUser) {
                        elmt = '<li data-user="' + userName + '" class="list-group-item"><button data-user="' + userName + '" type="button" class="btn btn-sm btn-primary invite-button">Invite</button>' + userName + '</li>';
                        $(elmt).appendTo(invitableUsersContainer);
                    }
                });

                app.socketClient.emit('add-user', room, app.currentUser);
            },
            newMessage : function () {
                var messageBox = $('#message-box');
                var message = messageBox.val();

                if (message) {
                    var room = $('#chat-tabpanel .tab-content .active').attr('id');
                    app.socketClient.emit('new-reply', room, message);
                    messageBox.val('');
                } else {
                    messageBox.focus();
                }
            },
            inviteUser : function (_this) {
                var room = $('#chat-tabpanel .tab-content .active').attr('id');
                var user = _this.data('user');

                if (room !== 'global') {
                    if (user === app.currentUser) {
                        alert('You cannot invite yourself');
                    } else {
                        app.socketClient.emit('invite-user', room, user);
                    }
                }
            }
        },
        socket : {
            onConnect : function () {
                app.currentUser = prompt('Please provide a username');

                if (app.currentUser) {
                    app.socketClient.emit('add-user', 'global', app.currentUser);
                    document.title = 'Minichat - ' + app.currentUser;
                    $('#message-box').focus();
                }
            },
            onDuplicateUserName : function () {
                app.currentUser = prompt('This name is already used. Please choose another one.');
                if (app.currentUser) {
                    app.socketClient.emit('add-user', 'global', app.currentUser);
                }
            },
            onUpdateChat : function (room, userName, message) {
                $('<li data-user="' + userName + '"><i><b>' + userName + '</b>: ' + message + '</i></li>').appendTo($('#' + room + ' .messages'));
            },
            onUpdateRoomUsers : function (room, users) {
                if (room === 'global') {
                    app.globalUsers = users;
                }

                var usersListElement = $('#' + room + ' .users');
                $('li.one-user-in-room', usersListElement).remove();

                users.forEach(function(userName) {
                    $('<li class="list-group-item one-user-in-room" data-user="' + userName + '"><span>' + userName + '</span></li>').appendTo(usersListElement);
                });
            },
            onInvitation : function (room) {
                if (confirm('You are invited in the room ' + room) && room !== 'global') {
                    var tab = $('#chat-tabpanel .nav-tabs li.hidden').html();
                    var content = $('.tab-content #newroom').clone().html();

                    $('#chat-tabpanel .nav-tabs').append('<li role="presentation">' + tab.replace('newroom', room).replace('+', 'Room ' + room) + '</li>');
                    $('#chat-tabpanel .tab-content').append('<div role="tabpanel" class="tab-pane active" id="' + room + '">' + content + '</div>');

                    $('#chat-tabpanel .nav-tabs a:last').tab('show');
                    app.socketClient.emit('add-user', room, app.currentUser);
                }
            }
        }
    }
};

var theDoc = $(document);
theDoc.on('ready', function () {
    app.socketClient = io();

    app.socketClient
    .on('connect', app.events.socket.onConnect)
    .on('reconnect', function () {
        console.log('reconnection event');
    })
    .on('duplicate-username', app.events.socket.onDuplicateUserName)
    .on('update-chat', app.events.socket.onUpdateChat)
    .on('update-room-users', app.events.socket.onUpdateRoomUsers)
    .on('invitation',app.events.socket.onInvitation)
    .on('user-missing', function (userName) {
        alert('Cannot find user ' + userName);
    });


    $('#chat-form').on('submit', function () {
        app.events.front.newMessage();
        return false;
    });


    $('#new-room').on('click', function (evt) {
        app.events.front.newRoom();
        return false;
    });


    theDoc.on('click', '.invite-button', function () {
        app.events.front.inviteUser($(this));
        return false;
    });
});
