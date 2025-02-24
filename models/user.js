const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: {type: String, required: true},
    username: {type: String, unique: true, required: true, minlength: 5},
    description: {type: String, required: false},
    password: {type: String, required: true, minlength: 6},
    groups: [{type: mongoose.Types.ObjectId, required: true, ref: 'Group'}],
    invites: [{type: mongoose.Types.ObjectId, required: false, ref: 'Invite'}]
});

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model('User', userSchema);