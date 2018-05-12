//Tom Maier, 751605; Jerg Bengel, 752685
var express = require("express");
var app = express();
var port = process.env.PORT || process.env.VCAP_APP_PORT || 3000;
//var port = 3000;
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');
var request = require('request');
var mongoose = require('mongoose');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var passport = require('passport');
var local = require('passport-local');
var database = require('./database');
var LanguageTranslatorV2 = require('watson-developer-cloud/language-translator/v2');
var fs = require('fs');
var userSocketList = {};
var users = [];

var languageTranslator = new LanguageTranslatorV2({
    username: '{username}',
    password: '{password}'
});

app.use(express.static("public"));
app.set("view engine", "ejs");
app.set('views', __dirname + '/view');

//body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//MongoDB Connectoin
mongoose.connect('mongodb://sa_reader:readerpwd2017!@ds046067.mlab.com:46067/cloudcomputing');
var db = mongoose.connection;

//Passport intialization
app.use(passport.initialize());
app.use(passport.session());

//handle mongo error
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log('connected to mongodb successfully');
});

//use sessions for tracking logins
app.use(session({
    secret: 'SuperSecretPasword!',
    resave: true,
    saveUninitialized: false,
    store: new MongoStore({
        mongooseConnection: db
    })
}));

//error handler define as the last app.use callback
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.send(err.message);
});

//------------------ THE ROUTES ---------------------------------
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/view/login.html');
});
app.get('/login', function (req, res) {
    res.sendFile(__dirname + '/view/login.html');
});
app.get('/register', function (req, res) {
    res.sendFile(__dirname + '/view/register.html');
});
app.get('/error', function (req, res) {
    res.sendFile(__dirname + '/view/error.html');
});

app.get('/chat', function (req, res) {
    console.log('[SERVER] forwarding user: ' + req.session.passport.user + ' to chat');
    if (req.session.passport.user !== null) {
        res.render('index', {
            username: req.session.passport.user
        });
    } else {
        res.redirect('/');
    }
});

app.post('/register', passport.authenticate('passport-local-register', {
    successRedirect: '/chat',
    failureRedirect: '/'
}));

app.post('/login', passport.authenticate('passport-local-login', {
    successRedirect: '/chat',
    failureRedirect: '/'
}));

//----------------- PASSPORT HANDLING ---------------------------
//Passport will maintain persistent login sessions

passport.serializeUser(function (user, done) {
    console.log("serializing " + user);
    done(null, user);
});

passport.deserializeUser(function (obj, done) {
    console.log("deserializing " + obj);
    done(null, obj);
});

passport.use('passport-local-register', new local({
    passReqToCallback: true
},
    function (req, username, password, done) {
        if (req.body.username || req.body.password) {
            //do not allow whitespaces or usernames longer than 15
            if (isWhitespaceOrEmpty(req.body.username) || req.body.username.length > 15) {
                console.log('username has whitespaces or is empty or exceeded the length of 15!');
                done(null, false);
            }
            else {
                if (req.body.password.length > 15) {
                    console.log('password has exceeded the length of 15!');
                    done(null, false);
                }
                database.findUser(req.body.username, function (cb) {
                    if (cb) {
                        console.log('user already exists!');
                        done(null, false);
                    } else {
                        //Check if there is already a user with this name saved
                        database.createUser(req.body.username, req.body.password, function (user) {
                            if (user) {
                                done(null, user);
                                console.log('[SERVER] Register of ' + req.body.username + ' successful!');
                            } else {
                                done(null, false);
                                console.log('[SERVER] Register of ' + req.body.username + ' failed!');
                            }
                        });
                    }
                });
            }
        } else {
            console.log('username or password missing!');
        }
    }));

passport.use('passport-local-login', new local({
    passReqToCallback: true
},
    function (req, username, password, done) {
        if (req.body.username || req.body.password) {
            if (!isWhitespaceOrEmpty(req.body.username) || req.body.username.length > 15) {
                console.log('username has whitespaces or is empty or exceeded the length of 15!');
                done(null, false);
            } if (req.body.password.length > 15) {
                console.log('password has exceeded the length of 15!');
                done(null, false);
            }
            database.findUser(req.body.username, function (cb) {
                if (!cb) {
                    console.log('[SERVER] Unable to find user ' + req.body.username + '!');
                    done(null, false);
                } else {
                    //Check if there is already a user with this name saved
                    database.findPasswordHashForUser(req.body.username, req.body.password, function (user) {
                        if (user) {
                            done(null, user);
                            console.log('[SERVER] Login of ' + req.body.username + ' successful!');
                        } else {
                            done(null, false);
                            console.log('[SERVER] Login of ' + req.body.username + ' failed!');
                        }
                    });
                }
            });
        } else {
            console.log('[SERVER] Password missing!');
        }
    }));

function isWhitespaceOrEmpty(text) {
    return !/[^\s]/.test(text);
}

//----------------- SOCKET HANDLING -----------------------------
io.on('connection', function (socket) {
    socket.on('send-nickname', function (data) {
        socket.username = data.username;
        if (users.indexOf(socket.username) < 0) {
            users.push(socket.username);
        }
        updateUsers();
    });

    function updateUsers() {
        io.emit('users', users);
    }

    //Send message to client
    socket.emit('connection ready', function (username) {
        if (username !== null) {
            userSocketList[username] = socket.id;
            var d = new Date(new Date().getTime()).toLocaleTimeString();
            io.emit('welcome', { user: username, timestamp: d });
        }
        else {
            console.log('[SERVER] Invalid User!');
        }
    });

    //Send name of disconnected user
    socket.on('disconnect', function () {
        var d = new Date(new Date().getTime()).toLocaleTimeString();
        var data = {};
        for (var key in userSocketList) {
            if (userSocketList[key] === socket.id) {
                data.timestamp = d;
                data.username = key;
                data.message = "Disconnected";
                console.log(users);
                var index = users.indexOf(key);
                if (index >= 0) {
                    users.splice(index, 1);
                }
                updateUsers();
                delete userSocketList[key];
                io.emit("disconnect", data);
            }
        }
    });

    //Message handler
    socket.on('chat message', function (data) {
        var d = new Date(new Date().getTime()).toLocaleTimeString();
        data.timestamp = d;
        var msg = data.message.trim(); //remove white space
        if (msg.substr(0, 3) === '/w ') { //is the user whispering?
            msg = msg.substr(3); //substring /w
            var ind = msg.indexOf(' ');
            if (ind !== -1 || data.file !== null) {
                if (ind !== -1) {
                    username = msg.substr(0, ind);
                    msg = msg.substr(ind + 1);
                } else {
                    username = msg.substr(0, msg.length);
                    msg = "";
                }
                if (username in userSocketList) {
                    //Send private-msg to sender and receiver
                    io.to(userSocketList[username]).emit('private message', {
                        timestamp: data.timestamp,
                        from: data.from,
                        message: msg,
                        file: data.file
                    });
                    socket.emit('private message sender', {
                        timestamp: data.timestamp,
                        from: data.from,
                        to: username,
                        message: msg,
                        file: data.file
                    });
                } else {
                    socket.emit('error message', 'FEHLER: Der User ist nicht verf&uuml;gbar!');
                }
            } else {
                socket.emit('error message', 'FEHLER: Bitte gib eine Nachricht ein!');
            }
        } else {
            //Send regular msg
            if (msg.length > 0 || data.file !== null) {
                request.post(
                    {
                        method: 'POST',
                        url: 'https://xenodochial-nightingale.eu-de.mybluemix.net/tone',
                        json: {
                            "texts": [msg]
                        }
                    }
                    , function (error, response, body) {
                        io.emit('chat message', {
                            timestamp: data.timestamp,
                            from: data.from,                            
                            message: msg,
                            file: data.file,
                            mood: body.mood
                        });
                    }
                )
            } else {
                socket.emit('error message', 'FEHLER: Bitte gib eine Nachricht ein!');
            }
        }
    });
});

http.listen(port, function () {
    console.log(port);
});
