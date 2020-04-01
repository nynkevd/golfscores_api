const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const groupSchema = new Schema({
    title: {type: String, required: true},
    players: [{type: mongoose.Types.ObjectId, required: true, ref: 'User'}],
    admins: [{type: mongoose.Types.ObjectId, required: true, ref: 'User'}],
    matches: [{type: mongoose.Types.ObjectId, required: true, ref: 'Match'}],
    invites: [{type: mongoose.Types.ObjectId, required: true, ref: 'Invite'}]
});

groupSchema.plugin(uniqueValidator);

module.exports = mongoose.model('Group', groupSchema);