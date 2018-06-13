//Tom Maier, 751605; Jerg Bengel, 752685

var globalUserList = [];

$(function () {
    var socket = io.connect();
    var mediaFile = null;

    var user = {
        "username": username,
        "language": language
    };

    socket.emit('send-nickname', user);

    socket.on('connection ready', function (callback) {
        callback(username);
    });

    //Mockup for <input type="file">
    $('#file').before('<input type="button" id="button-file" class=" form-control btn btn-md btn-primary btn-block" value="Add File" onchange="checkIfMsgEx()"/> ');
    $('#file').hide();
    $('body').on('click', '#button-file', function () {
        $('#file').trigger('click');
    });

    $('#m').focus();

    //Send messages to Server as JSON with username message and file
    $('#chatForm').submit(function () {
        console.log("cookie used: " + _csrf);
        var m = $('#m').val();
        if (m.includes("<") || m.includes("&lt;")) {
            if (m.includes("<")) {
                m = m.replace("<", "");
            } else {
                m = m.replace("&lt;", "");
            }
            if (m.includes(">")) {
                m = m.replace(">", "");
            } else {
                m = m.replace("&gt;", "");
            }
        }
        var message = {
            "from": username,
            "message": m,
            "file": mediaFile//,
            //"language": language
        };
        socket.emit('chat message', message);
        $('#m').val('');
        mediaFile = null;
        $("#file").val('');
        return false;
    });

    //Prepare Mediafile for transfer
    $('#file').on('change', function (e) {
        var file = e.originalEvent.target.files[0];
        var reader = new FileReader();
        reader.onload = function (evt) {
            mediaFile = evt.target.result;
            console.log('Prepared: ' + mediaFile);
        };
        reader.readAsDataURL(file);
    });

    //Write usernames in list of online-users
    socket.on('users', function (data) {
        globalUserList = data;
        $('.userList').empty();
        $.each(data, function (i, v) {
            $('.userList').append('<div class="row"><div class="col-md-4"><img src="' + v.image + '" alt="" class="rounded-circle" height="52" width="52"/></div><div class="col-md-8 namelink nameInList" value="' + v.username + '">' + v.username + '</div></div>');
        });
    });

    //System-msg when user connects
    socket.on("welcome", function (msg) {
        if (msg.user === username) {
            addPost("Herzlich Willkommen im Chat " + msg.user + "!", 'System', msg.timestamp, 'msg-response', 'response');
        } else {
            addPost(nameLink(msg.user) + " ist dem Chat beigetreten!", 'System', msg.timestamp, 'msg-response', 'response');
        }
    });

    //Receive message with timestamp username and message
    socket.on('chat message', function (msg) {
        if (msg.from === username) {
            if (msg.message.length > 0) {
                addPost(msg.message, msg.from + ": " + msg.mood, msg.timestamp, 'msg', '');
            }
            if (msg.file !== null) {
                addPost('<a target ="_blank" href="' + msg.file + '"><object data="' + msg.file + '"></object></a>', nameLink(msg.from) + ": " + msg.mood, msg.timestamp, 'msg', '');
            }
        } else {
            if (msg.message.length > 0) {
                addPost(msg.message, nameLink(msg.from) + ": " + msg.mood, msg.timestamp, 'msg-response', 'response');
            }
            if (msg.file !== null) {
                addPost('<a target ="_blank" href="' + msg.file + '"><object data="' + msg.file + '"></object></a>', nameLink(msg.from) + ": " + msg.mood, msg.timestamp, 'msg-response', 'response');
            }
        }
    });

    //Receive Private Message
    socket.on('private message', function (msg) {
        if (msg.from === username) {
            if (msg.message.length > 0) {
                addPost("Private message von " + msg.from + ": " + msg.message, nameLink(msg.from) + ": " + msg.mood, msg.timestamp, 'msg', '');
            }
            if (msg.file !== null) {
                addPost('Private message von ' + msg.from + ': <a target ="_blank" href="' + msg.file + '"><object data="' + msg.file + '"></object></a>', nameLink(msg.from) + ": " + msg.mood, msg.timestamp, 'msg', '');
            }
        } else {
            if (msg.message.length > 0) {
                addPost("Private message von " + msg.from + ": " + msg.message, nameLink(msg.from) + ": " + msg.mood, msg.timestamp, 'msg-response', 'response');
            }
            if (msg.file !== null) {
                addPost('Private message von ' + msg.from + ': <a target ="_blank" href="' + msg.file + '"><object data="' + msg.file + '"></object></a>', nameLink(msg.from) + ": " + msg.mood, msg.timestamp, 'msg-response', 'response');
            }
        }
    });

    //Show private messages
    socket.on('private message sender', function (msg) {
        if (msg.to !== username) {
            if (msg.message.length > 0) {
                addPost("Private message to - " + nameLink(msg.to) + ": " + msg.message, nameLink(msg.to) + ": " + msg.mood, msg.timestamp, 'msg', '');
            }
            if (msg.file !== null) {
                addPost("Private message to - " + nameLink(msg.to) + '<a target ="_blank" href="' + msg.file + '"><object data="' + msg.file + '"></object></a>', nameLink(msg.to) + ": " + msg.mood, msg.timestamp, 'msg', '');
            }
        }
    });

    //System-msg to all users when user disconnects
    socket.on("disconnect", function (msg) {
        if (msg === "transport close" || msg === "transport error") {
            addPost("Connection closed by web service!", 'System', new Date(new Date().getTime()).toLocaleTimeString(), 'msg-response', 'response');
        } else {
            addPost(msg.username + " hat den Chat verlassen.", 'System', msg.timestamp, 'msg-response', 'response');
        }
    });

    //System-msg on error
    socket.on('error message', function (msg) {
        addPost(msg, 'System', msg.timestamp, 'msg-response', 'response');
    });
});

//Replace name with link for whisper
function nameLink(name) {
    return name;
}

//Function to append message to chat-div
function addPost(text, sender, date, styleClass, rowClass) {
    if (rowClass === "response") {
        $('#history').append($('<div class="row message ' + rowClass + '"><div class="col-md-11"><p class="' + styleClass + '">' + text + '</p> <div class="clearfix"></div><small class="text-muted">' + nameLink(sender) + ', ' + date + '</small><div class="clearfix"></div></div><div class="col-md-1"><img src="' + findImageForUser(sender) + '" alt="" class="rounded-circle" width="52" height="52"></div></div >'));
    } else {
        $('#history').append($('<div class="row message ' + rowClass + '"><div class="col-md-1"><img src="' + findImageForUser(sender) + '" alt="" class="rounded-circle" width="52" height="52"></div><div class="col-md-11"><p class="' + styleClass + '">' + text + '</p> <div class="clearfix"></div><small class="text-muted">' + nameLink(sender) + ', ' + date + '</small><div class="clearfix"></div></div></div >'));
    }
    $(".namelink").click(function () {
        autoWhisper($(this).attr("value"));
    });
    scrollToBottom();
}

//Add wisper command and target-username
function autoWhisper(username) {
    if ($('#m').val().indexOf("/w") === -1) {
        if ($('#m').val().length === 0) {
            $('#m').val("/w " + username + " ");
        } else {
            var text = $('#m').val();
            $('#m').val("/w " + username + text);
        }
    } else {
        if ($('#m').val().length <= 3 || $('#m').val().indexOf(username) === -1) {
            $('#m').val("");
            autoWhisper(username);
        }
    }
    $('#m').focus();
}

//Autoscroll
function scrollToBottom() {
    var div = $("#history");
    div.scrollTop(div.prop('scrollHeight'));
}

function findImageForUser(username) {
    var result = "common/img/chatDummy.jpg";
    if (username !== "System") {
        if (username.includes(":")) {
            username = username.split(":")[0];
        }

        for (var i = 0; i < globalUserList.length; i++) {
            if (globalUserList[i].username === username) {
                if (globalUserList[i].image)
                    result = globalUserList[i].image;
            }
        }
    }
    return result;
}