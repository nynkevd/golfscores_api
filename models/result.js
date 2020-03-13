const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const resultSchema = new Schema({
    match: {type: mongoose.Types.ObjectId, required: true, ref: 'Match'},
    user: {type: mongoose.Types.ObjectId, required: true, ref: 'User'},
    score: {type: Number, required: true}
});

resultSchema.plugin(uniqueValidator);

module.exports = mongoose.model('Result', resultSchema);