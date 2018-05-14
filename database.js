//Tom Maier, 751605; Jerg Bengel, 752685
var bcrypt = require('bcrypt');
var mysql = require('mysql');
var fs = require('fs');

const connection = mysql.createConnection(
    {
        host: 'sl-eu-fra-2-portal.4.dblayer.com',
        port: 16713,
        user: 'admin',
        password: 'SVZBHTBXIYEOAZOV',
        ssl: {
            ca: fs.readFileSync('./db_cert.crt')
        }
    });


//save user to database
exports.createUser = function (username, password, image, language, callback) {
    if (!username || !password || !language) {
        console.log('[DEBUG-SERVER] MySQL: Unable to INSERT because username/password/language are missing!');
        callback(false);
    }
    var hash = bcrypt.hashSync(password, 10);
  
    var sql = "INSERT INTO compose.Users (username, password, image, language) VALUES ?";
    var values = [[username, hash, image, language]];

    connection.query(sql, [values], function (err, result) {
        if (err) {
            console.log('[DEBUG-SERVER] MySQL: ' + username + ' unable to save to database!');
            console.log(err.message);
            callback(false);
        } else {
            callback(username);
            console.log('[DEBUG-SERVER] MySQL: INSERT of user ' + username + ' successful!');
        }
    });
};

//find a user
exports.findUser = function (username, callback) {
    if (!username) {
        console.log('[DEBUG-SERVER] MySQL: Unable to QUERY because username is missing!');
        callback(false);
    }
    var sql = "SELECT username FROM compose.Users WHERE username = '" + username + "'";

    connection.query(sql, function (err, result) {
        if (err) {
            console.log('[DEBUG-SERVER] MySQL: Error while trying to find user ' + username + '!');
            console.log(err.message);
            callback(false);
        } else {
            if (result !== null && result.length > 0) {
                //user exists
                callback(result);
            } else {
                //user does not exist
                callback(false);
            }
        }
    });
};

//check if password supplied is right or wrong
exports.findPasswordHashForUser = function (username, password, callback) {
    if (!username) {
        console.log('[DEBUG-SERVER] MySQL: Unable to QUERY because username is missing!');
        callback(false);
    }
    var sql = "SELECT password FROM compose.Users WHERE username = '" + username + "'";

    connection.query(sql, function (err, result) {
        if (err) {
            console.log('[DEBUG-SERVER] MySQL: Error while trying to query password for user ' + username + '!');
            console.log(err.message);
            callback(false);
        } else {
            if (result !== null && result.length > 0) {
                //user exists
                var passwordMatch = bcrypt.compare(password, result[0].password).then(function (res) {
                    // the password is correct
                    if (res.valueOf()) {
                        callback(username);
                    } else {
                        console.log('[DEBUG-SERVER] MySQL: Password mismatch for user ' + username);
                        callback(false);
                    }
                });
            } else {
                console.log('[DEBUG-SERVER] MySQL: Error while trying to query password for user ' + username);
                callback(false);
            }
        }
    });
};

//find the image a user has
exports.findImageForUser = function (username, callback) {
    if (!username) {
        console.log('[DEBUG-SERVER] MySQL: Unable to QUERY image because username is missing!');
        callback(false);
    }
    var sql = "SELECT image FROM compose.Users WHERE username = '" + username + "'";

    connection.query(sql, function (err, result) {
        if (err) {
            console.log('[DEBUG-SERVER] MySQL: Error while trying to find user ' + username + '!');
            console.log(err.message);
            callback(false);
        } else {
            if (result !== null && result.length > 0) {
                //user exists
                callback(result[0].image);
            } else {
                //user does not exist
                callback(false);
            }
        }
    });
};

//find the language a user has
exports.findLanguageForUser = function (username, callback) {
    if (!username) {
        console.log('[DEBUG-SERVER] MySQL: Unable to QUERY image because username is missing!');
        callback(false);
    }
    var sql = "SELECT language FROM compose.Users WHERE username = '" + username + "'";

    connection.query(sql, function (err, result) {
        if (err) {
            console.log('[DEBUG-SERVER] MySQL: Error while trying to find user ' + username + '!');
            console.log(err.message);
            callback(false);
        } else {
            if (result !== null && result.length > 0) {
                //user exists
                callback(result[0].language);
            } else {
                //user does not exist
                callback(false);
            }
        }
    });
};