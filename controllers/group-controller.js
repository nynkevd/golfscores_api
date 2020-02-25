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

    res.status(201).json({message: "Succesfully created a new group"});
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

    const admins = existingGroup['admins'];
    if (!admins.includes(user)) {
        return next(new HttpError("The provided user cannot update the provided group", 405))
    }

    const existingPlayers = existingGroup['players'];
    let playersToAdd = [];
    newPlayers.forEach(player => {
        if (!existingPlayers.includes(player)) {
            playersToAdd.push(player);
        }
    });

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

    res.status(201).json({message: "Successfully added a player"});
};

const addAdminToGroup = async (req, res, next) => {
    await validateRequest(req, next);

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

    const admins = existingGroup['admins'];
    if (!admins.includes(user)) {
        return next(new HttpError("The provided user cannot update the provided group", 405))
    }

    const existingPlayers = existingGroup['players'];
    const existingAdmins = existingGroup['admins'];
    let adminsToAdd = [];
    newAdmins.forEach(admin => {
        if (existingPlayers.includes(admin) && !existingAdmins.includes(admin)) {
            adminsToAdd.push(admin);
        }
    });

    try {
        for (const newAdmin of adminsToAdd) {
            let admin = await User.findById(newAdmin);
            existingGroup.admins.push(admin);
            await existingGroup.save();
        }
    } catch (e) {
        return next(new HttpError("Adding admins failed, please try again", 500));
    }

    res.status(201).json({message: "Successfully added an admin"});
};

const removePlayer = async (req, res, next) => {
    await validateRequest(req, next);

    const {player, group, user} = req.body;

    if (player === user) {
        return next(new HttpError("Cannot remove yourself", 500));
    }

    let selectedGroup;
    try {
        selectedGroup = await Group.findById(group);
    } catch (e) {
        return next(new HttpError("Removing player failed, please try again", 500));
    }

    let selectedPlayer;
    try {
        selectedPlayer = await User.findById(player);
    } catch (e) {
        return next(new HttpError("Removing player failed, please try again", 500));
    }

    const admins = selectedGroup['admins'];
    let isAdmin = false;
    if (!admins.includes(user)) {
        return next(new HttpError("No permission", 403));
    } else {
        isAdmin = true;
    }

    const players = selectedGroup['players'];
    if (!players.includes(player)) {
        return next(new HttpError("The provided player does not exist in this group", 500));
    }

    try {
        selectedGroup.players.pull(selectedPlayer);
        if (isAdmin) {
            selectedGroup.admins.pull(selectedPlayer);
        }
        await selectedGroup.save();

        selectedPlayer.groups.pull(selectedGroup);
        selectedPlayer.save();

    } catch (e) {
        return next(new HttpError("Removing player failed, please try again", 500));
    }

    res.status(201).json({message: "Succesfully removed user"});
};

const removeAdmin = async (req, res, next) => {
    await validateRequest(req, next);

    const {admin, group, user} = req.body;

    if (admin === user) {
        return next(new HttpError("Cannot remove yourself", 500));
    }

    let selectedGroup;
    try {
        selectedGroup = await Group.findById(group);
    } catch (e) {
        return next(new HttpError("Removing admin permissions failed, please try again.", 500));
    }

    const admins = selectedGroup['admins'];
    if (!admins.includes(admin)) {
        return next(new HttpError("The provided user is not an admin.", 500));
    }

    if (admins.length === 1) {
        return next(new HttpError("Cannot remove this admin, a group needs at least 1 admin.", 500));
    }

    try {
        const selectedUser = await User.findById(admin);
        selectedGroup.admins.pull(selectedUser);
        selectedGroup.save();
    } catch (e) {
        return next(new HttpError("Cannot remove the provided admin, please try again.", 500));
    }

    res.status(201).json({message: "Succesfully removed admin of group"});

};

exports.createGroup = createGroup;
exports.addPlayerToGroup = addPlayerToGroup;
exports.addAdminToGroup = addAdminToGroup;
exports.removePlayer = removePlayer;
exports.removeAdmin = removeAdmin;