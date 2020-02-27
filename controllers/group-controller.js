const User = require('../models/user');
const Group = require('../models/group');
const validateRequest = require('../helper/valid-checker');
const HttpError = require('../models/http-error');

const createGroup = async (req, res, next) => {
    await validateRequest(req, next);

    const {title, userId} = req.body;

    let existingGroup;
    try {
        existingGroup = await Group.findOne({title: title})
    } catch (e) {
        return next(new HttpError("Could not create group, please try again", 500));
    }
    if (existingGroup) {
        return next(new HttpError("A group with this title already exists, please try a different title", 422));
    }

    let user;
    try {
        user = await User.findById(userId);
    } catch (e) {
        return next(new HttpError("Could not create group, please try again", 500));
    }
    if (!user) {
        return next(new HttpError("Could not find user for provided ID", 404));
    }

    try {
        const createdGroup = new Group({
            title,
            players: [user],
            admins: [user],
            matches: []
        });

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

    const {newPlayers, groupId, userId} = req.body;

    let existingGroup;
    try {
        existingGroup = await Group.findById(groupId);
    } catch (e) {
        return next(new HttpError("Could not add new player(s), please try again", 401))
    }
    if (!existingGroup) {
        return next(new HttpError("The provided group could not be found", 404))
    }

    const admins = existingGroup['admins'];
    if (!admins.includes(userId)) {
        return next(new HttpError("The provided user cannot update the provided group", 405))
    }

    const existingPlayers = existingGroup['players'];
    let playersToAdd = [];
    newPlayers.forEach(player => {
        if (!existingPlayers.includes(player)) {
            playersToAdd.push(player);
        }
    });

    if (!playersToAdd.length > 0) {
        res.status(201).json({message: "No new players were added, try adding other users"});
        return next();
    }

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

    res.status(200).json({message: "Successfully added a player"});
};

const addAdminToGroup = async (req, res, next) => {
    await validateRequest(req, next);

    const {newAdminId, groupId, userId} = req.body;

    let existingGroup;
    try {
        existingGroup = await Group.findById(groupId);
    } catch (e) {
        return next(new HttpError("Could not add new admin, please try again", 500))
    }
    if (!existingGroup) {
        return next(new HttpError("The provided group could not be found", 404))
    }

    const admins = existingGroup['admins'];
    if (!admins.includes(userId)) {
        return next(new HttpError("The provided user cannot update the provided group", 405))
    }

    const existingPlayers = existingGroup['players'];
    const existingAdmins = existingGroup['admins'];
    if (!existingPlayers.includes(newAdminId)) {
        return next(new HttpError("The provided new admin cannot be added to the group", 500))
    }

    if (!(existingPlayers.includes(newAdminId) && !existingAdmins.includes(newAdminId))) {
        return next(new HttpError("The provided new admin cannot be added to the group", 500))
    }

    try {
        let admin = await User.findById(newAdminId);
        existingGroup.admins.push(admin);
        await existingGroup.save();
    } catch (e) {
        return next(new HttpError("Adding admins failed, please try again", 500));
    }

    res.status(200).json({message: "Successfully added an admin"});
};

const removePlayer = async (req, res, next) => {
    await validateRequest(req, next);

    const {playerId, groupId, userId} = req.body;

    if (playerId === userId) {
        return next(new HttpError("Cannot remove yourself", 500));
    }

    let selectedGroup;
    try {
        selectedGroup = await Group.findById(groupId);
    } catch (e) {
        return next(new HttpError("Removing player failed, please try again", 500));
    }

    let selectedPlayer;
    try {
        selectedPlayer = await User.findById(playerId);
    } catch (e) {
        return next(new HttpError("Removing player failed, please try again", 500));
    }

    const admins = selectedGroup['admins'];
    let isAdmin = false;
    if (!admins.includes(userId)) {
        return next(new HttpError("No permission", 403));
    } else {
        isAdmin = true;
    }

    const players = selectedGroup['players'];
    if (!players.includes(playerId)) {
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

    res.status(200).json({message: "Succesfully removed user"});
};

const removeAdmin = async (req, res, next) => {
    await validateRequest(req, next);

    const {adminId, groupId, userId} = req.body;

    if (adminId === userId) {
        return next(new HttpError("Cannot remove yourself", 500));
    }

    let selectedGroup;
    try {
        selectedGroup = await Group.findById(groupId);
    } catch (e) {
        return next(new HttpError("Removing admin permissions failed, please try again.", 500));
    }

    const admins = selectedGroup['admins'];
    if (!admins.includes(adminId)) {
        return next(new HttpError("The provided user is not an admin.", 500));
    }

    if (admins.length === 1) {
        return next(new HttpError("Cannot remove this admin, a group needs at least 1 admin.", 500));
    }

    try {
        const selectedAdmin = await User.findById(adminId);
        selectedGroup.admins.pull(selectedAdmin);
        selectedGroup.save();
    } catch (e) {
        return next(new HttpError("Cannot remove the provided admin, please try again.", 500));
    }

    res.status(200).json({message: "Succesfully removed admin of group"});

};

const removeGroup = async (req, res, next) => {
    await validateRequest(req, next);

    const {groupId, userId} = req.body;

    let selectedGroup;
    try {
        selectedGroup = await Group.findById(groupId);
    } catch (e) {
        return next(new HttpError("Could not remove the group, please try again.", 500));
    }

    let selectedUser;
    try {
        selectedUser = await User.findById(userId);
    } catch (e) {
        return next(new HttpError("Could not remove the group, please try again.", 500));
    }

    if (!selectedGroup['admins'].includes(selectedUser.id)) {
        return next(new HttpError("Not permitted to remove this group.", 403));
    }

    let players = selectedGroup['players'];
    for (const player of players) {
        try {
            const thisPlayer = await User.findById(player);
            thisPlayer.groups.pull(selectedGroup);
            await thisPlayer.save();
        } catch (e) {
            return next(new HttpError("Could not remove the group, please try again.", 500));
        }
    }

    try {
        await Group.findByIdAndDelete(groupId);
    } catch (err) {
        return next(new HttpError("Could not remove the group, please try again.", 500));
    }

    res.status(200).json({message: "Succesfully deleted the group"});
};

const editGroup = async (req, res, next) => {
    await validateRequest(req, next);

    const {groupId, title, userId} = req.body;

    let selectedGroup;
    try {
        selectedGroup = await Group.findById(groupId);
    } catch (e) {
        return next(new HttpError("Could not edit the group, please try again.", 500));
    }

    let selectedUser;
    try {
        selectedUser = await User.findById(userId);
    } catch (e) {
        return next(new HttpError("Could not edit the group, please try again.", 500));
    }

    if (!selectedGroup['admins'].includes(selectedUser.id)) {
        return next(new HttpError("Not permitted to edit this group.", 403));
    }

    try {
        selectedGroup.title = title;
        selectedGroup.save();
    } catch {
        return next(new HttpError("Could not edit the group, please try again.", 500));
    }

    res.status(200).json({message: "Succesfully edited the group"});
};

exports.createGroup = createGroup;
exports.addPlayerToGroup = addPlayerToGroup;
exports.addAdminToGroup = addAdminToGroup;
exports.removePlayer = removePlayer;
exports.removeAdmin = removeAdmin;
exports.removeGroup = removeGroup;
exports.editGroup = editGroup;