//Tom Maier, 751605; Jerg Bengel, 752685
var mongoose = require('mongoose'),
    UserSchema = require('./model/user');
var bcrypt = require('bcrypt');

//save user to database
exports.createUser = function (username, password, callback) {
    if (!username || !password) {
        console.log('[DEBUG-SERVER] User: ' + username + ' missing username or password!');
        callback(false);
    }

    var hash = bcrypt.hashSync(password, 10);
    var newUser = new UserSchema({
        username: username,
        password: hash
    });

    newUser.save(function (err, artist) {
        if (err) {
            console.log('[DEBUG-SERVER] User: ' + username + ' unable to save to database!');
            callback(false);
        } else {
            callback(username);
            console.log('[DEBUG-SERVER] User: ' + username + ' saved to database successfully!');
        }
    });
};

exports.findUser = function (username, callback) {
    UserSchema.find({ username: username }, function (err, user) {
        if (err)
            callback(false);

        if (user.length > 0) {
            callback(username);
        } else {
            callback(false);
        }
    });
};

exports.findPasswordHashForUser = function (username, password, callback) {
    UserSchema.findOne({ username: username }, function (err, user) {
        if (err)
            callback(false);

        if (user._doc.username.length > 0 && user._doc.password.length > 0) {
            var passwordMatch = bcrypt.compare(password, user._doc.password).then(function (res) {
                // the password is correct
                if (res.valueOf()) {
                    callback(user._doc.username);
                } else {
                    console.log('[DEBUG-SERVER] Password mismatch for user ' + user._doc.username);
                }
            });
        } else {
            callback(false);
        }
    });
};