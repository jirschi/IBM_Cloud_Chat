//Tom Maier, 751605; Jerg Bengel, 752685
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UserSchema = new mongoose.Schema({
    username: String
    , password: String
});

module.exports = mongoose.model('user', UserSchema);