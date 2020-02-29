const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const matchSchema = new Schema({
    date: {type: Date, required: true},
    group: {type: mongoose.Types.ObjectId, required: true, ref: 'Group'},
    results: [{type: mongoose.Types.ObjectId, required: true, ref: 'Result'}]
});

matchSchema.plugin(uniqueValidator);

module.exports = mongoose.model('Match', matchSchema);