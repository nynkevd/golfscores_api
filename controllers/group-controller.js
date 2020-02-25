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

    let existingGroup;
    try {
        existingGroup = await Group.findById(group);
    } catch (e) {
        return next(new HttpError("Could not add new player(s), please try again", 401))
    }
    if (!existingGroup) {
        return next(new HttpError("The provided group could not be found", 404))
    }

    // CHECK IF USER IS ADMIN ON GROUP
    const admins = existingGroup['admins'];
    if (!admins.includes(user)) {
        return next(new HttpError("The provided user cannot update the provided group", 405))
    }

    // CHECK IF PROVIDED PLAYERS ARE IN GROUP
    const existingPlayers = existingGroup['players'];
    let playersToAdd = [];
    newPlayers.forEach(player => {
        if (!existingPlayers.includes(player)) {
            playersToAdd.push(player);
        }
    });

    // ADD PLAYERS TO GROUP
    try {
        for (const newPlayer of playersToAdd) {
            let player = await User.findById(newPlayer);
            existingGroup.players.push(player);
            await existingGroup.save();
            player.groups.push(existingGroup);
            await player.save();
        }
    } catch (e) {
        return next(new HttpError("Adding players failed, please try again", 500));
    }

    res.status(201).json({message: "Success"});
};

const addAdminToGroup = async (req, res, next) => {
    validateRequest(req, next);

    const {newAdmins, group, user} = req.body;

    let existingGroup;
    try {
        existingGroup = await Group.findById(group);
    } catch (e) {
        return next(new HttpError("Could not add new player(s), please try again", 500))
    }
    if (!existingGroup) {
        return next(new HttpError("The provided group could not be found", 404))
    }

    // CHECK IF USER IS ADMIN ON GROUP
    const admins = existingGroup['admins'];
    if (!admins.includes(user)) {
        return next(new HttpError("The provided user cannot update the provided group", 405))
    }

    // CHECK IF PROVIDED ADMINS ARE IN GROUP
    const existingPlayers = existingGroup['players'];
    const existingAdmins = existingGroup['admins'];
    let adminsToAdd = [];
    newAdmins.forEach(admin => {
        if (existingPlayers.includes(admin) && !existingAdmins.includes(admin)) {
            adminsToAdd.push(admin);
        }
    });

    // ADD PLAYERS TO GROUP
    try {
        for (const newAdmin of adminsToAdd) {
            let admin = await User.findById(newAdmin);
            existingGroup.admins.push(admin);
            await existingGroup.save();
        }
    } catch (e) {
        return next(new HttpError("Adding admins failed, please try again", 500));
    }

    res.status(201).json({message: "Success"});
};

exports.createGroup = createGroup;
exports.addPlayerToGroup = addPlayerToGroup;
exports.addAdminToGroup = addAdminToGroup;