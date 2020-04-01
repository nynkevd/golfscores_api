const User = require('../models/user');
const Group = require('../models/group');
const Invite = require('../models/invite');
const validateRequest = require('../helper/valid-checker');
const HttpError = require('../models/http-error');

const getGroupInfo = async (req, res, next) => {
    await validateRequest(req, next);

    const groupName = req.params.groupName;
    const userId = req.userData.userId;

    let group;
    try {
        group = await Group.findOne({title: groupName})
    } catch (e) {
        res.status(500).send({message: 'Probeer het opnieuw.'})
    }
    if (!group) {
        res.status(500).send({message: 'Er bestaat geen groep met deze naam.'})
    }

    if (!group.players.includes(userId)) {
        res.status(403).send({message: 'Je bent geen deel van deze groep.'})
    }

    let players = [];
    for (const player of group.players) {
        let thisPlayer = await User.findById(player._id);
        players.push({name: thisPlayer.name, id: thisPlayer._id})
    }

    res.status(200).send({players})

};

const getGroups = async (req, res, next) => {
    await validateRequest(req, next);
};

const createGroup = async (req, res, next) => {
    await validateRequest(req, next);

    const {title, invites} = req.body;
    const userId = req.userData.userId;

    let existingGroup;
    try {
        existingGroup = await Group.findOne({title: title})
    } catch (e) {
        res.status(500).send({message: 'Probeer opnieuw de group aan te maken.'})
    }
    if (existingGroup) {
        res.status(500).send({message: 'Er bestaat al een groep met deze naam.'})
    }

    let user;
    try {
        user = await User.findById(userId);
    } catch (e) {
        res.status(500).send({message: 'Probeer opnieuw de group aan te maken.'})
    }
    if (!user) {
        res.status(404).send({message: 'Gebruiker kan niet gevonden worden.'})
    }

    //Create invites
    console.log(invites);
    try {
        const createdGroup = new Group({
            title,
            players: [user],
            admins: [user],
            matches: [],
            invites: []
        });

        let groupInvites = [];
        for (const newInviteUserId of invites) {
            const invite = new Invite({
                group: createdGroup.id,
                groupName: createdGroup.title,
                player: user.id,
                user: newInviteUserId
            });
            await invite.save();
            let newInviteUser = await User.findById(invite.user);
            console.log(newInviteUser);
            newInviteUser.invites.push(invite._id);
            await newInviteUser.save();
            groupInvites.push(invite._id);
        }

        if (groupInvites) {
            createdGroup.invites = groupInvites;
        }

        console.log(createdGroup);

        await createdGroup.save();
    } catch (e) {
        console.log(e);
        res.status(500).send({message: 'Het is hier niet gelukt, probeer opnieuw.'})
    }

    res.status(201).json({message: "Succesvol een groep aangemaakt"});
};

const addPlayerToGroup = async (req, res, next) => {
    await validateRequest(req, next);

    const userId = req.userData.userId;
    const {newPlayers, groupId} = req.body;

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

    //TODO create results for the group matches for the player

    res.status(200).json({message: "Successfully added a player"});
};

const addAdminToGroup = async (req, res, next) => {
    await validateRequest(req, next);

    const userId = req.userData.userId;
    const {newAdminId, groupId} = req.body;

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

    const userId = req.userData.userId;
    const {playerId, groupId} = req.body;

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

    const userId = req.userData.userId;
    const {adminId, groupId} = req.body;

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

    const userId = req.userData.userId;
    const {groupId} = req.body;

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

    //TODO Remove Matches and result from matches when removing group


    try {
        await Group.findByIdAndDelete(groupId);
    } catch (err) {
        return next(new HttpError("Could not remove the group, please try again.", 500));
    }

    res.status(200).json({message: "Succesfully deleted the group"});
};

const editGroup = async (req, res, next) => {
    await validateRequest(req, next);

    const userId = req.userData.userId;
    const {groupId, title} = req.body;

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

exports.getGroupInfo = getGroupInfo;
exports.getGroups = getGroups;
exports.createGroup = createGroup;
exports.addPlayerToGroup = addPlayerToGroup;
exports.addAdminToGroup = addAdminToGroup;
exports.removePlayer = removePlayer;
exports.removeAdmin = removeAdmin;
exports.removeGroup = removeGroup;
exports.editGroup = editGroup;