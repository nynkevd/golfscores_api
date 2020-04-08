const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const inviteSchema = new Schema({
    group: {type: mongoose.Types.ObjectId, required: true, ref: 'Group'},
    groupName: {type: String, required: true},
    inviter: {type: mongoose.Types.ObjectId, required: true, ref: 'User'},
    user: {type: mongoose.Types.ObjectId, required: true, ref: 'User'}
});

inviteSchema.plugin(uniqueValidator);

module.exports = mongoose.model('Invite', inviteSchema);