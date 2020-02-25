const {validationResult} = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const Group = require('../models/group');
const validateRequest = require('../helper/valid-checker');
const HttpError = require('../models/http-error');

const createGroup = async (req, res, next) => {
    await validateRequest(req, next);

    const {title, creator} = req.body;

    let existingGroup;
    try {
        existingGroup = await Group.findOne({title: title})
    } catch (e) {
        return next(new HttpError("Could not create group, please try again", 500));
    }
    if (existingGroup) {
        return next(new HttpError("A group with this title already exists, please try a different title", 422));
    }

    const createdGroup = new Group({
        title,
        players: [creator],
        admins: [creator],
        matches: []
    });

    let user;
    try {
        user = await User.findById(creator);
    } catch (e) {
        return next(new HttpError("Could not create group, please try again", 500));
    }
    if (!user) {
        return next(new HttpError("Could not find user for provided ID", 404));
    }

    try {
        console.log(createdGroup);
        await createdGroup.save();
        user.groups.push(createdGroup);
        await user.save();

    } catch (e) {
        return next(new HttpError("Creating group failed, please try again", 500));
    }

    res.status(201).json({group: createdGroup});
};

const addPlayerToGroup = async (req, res, next) => {
    await validateRequest(req, next);

    const {newPlayers, group, user} = req.body;

    // CHECK IF GROUP EXISTS
    let existingGroup;
    try {
        existingGroup = await Group.findById(group);
    } catch (e) {
        return next(new HttpError("Could not add new player(s), please try again", 401))
    }

    // CHECK IF USER IS ADMIN ON GROUP

    // ADD PLAYERS TO GROUP


};


exports.createGroup = createGroup;
exports.addPlayerToGroup = addPlayerToGroup;