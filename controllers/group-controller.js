const User = require('../models/user');
const Group = require('../models/group');
const Invite = require('../models/invite');
const validateRequest = require('../helper/valid-checker');

const getGroupInfo = async (req, res, next) => {
    await validateRequest(req, res, next);

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
    await validateRequest(req, res, next);
};

const createGroup = async (req, res, next) => {
    await validateRequest(req, res, next);

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
        res.status(500).send({message: 'Het is niet gelukt, probeer opnieuw.'});
    }

    res.status(201).json({message: "Succesvol een groep aangemaakt"});
};

const addPlayerToGroup = async (req, res, next) => {
    await validateRequest(req, res, next);

    const userId = req.userData.userId;
    const {newPlayers, groupId} = req.body;

    let existingGroup;
    try {
        existingGroup = await Group.findById(groupId);
    } catch (e) {
        res.status(401).send({message: 'Nieuwe spelers kunnen niet worden toegevoegd.'});
    }
    if (!existingGroup) {
        res.status(404).send({message: 'De groep kan niet worden gevonden.'});
    }

    const admins = existingGroup['admins'];
    if (!admins.includes(userId)) {
        res.status(405).send({message: 'Geen rechten om deze groep aan te passen.'});
    }

    const existingPlayers = existingGroup['players'];
    let playersToAdd = [];
    newPlayers.forEach(player => {
        if (!existingPlayers.includes(player)) {
            playersToAdd.push(player);
        }
    });

    if (!playersToAdd.length > 0) {
        res.status(401).send({message: 'Geen nieuwe gebruikers toegevoegd.'});
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
        res.status(500).send({message: 'Gebruikers kunnen niet worden toegevoegd, probeer het opnieuw.'});
    }

    //TODO create results for the group matches for the player

    res.status(200).json({message: "Succesvol een speler toegevoegd."});
};

const addAdminToGroup = async (req, res, next) => {
    await validateRequest(req, res, next);

    const userId = req.userData.userId;
    const {newAdminId, groupId} = req.body;

    let existingGroup;
    try {
        existingGroup = await Group.findById(groupId);
    } catch (e) {
        res.status(500).json({message: "Kon geen nieuwe admin toevoegen, probeer het opnieuw."});
    }
    if (!existingGroup) {
        res.status(404).json({message: "De groep kon niet gevonden worden, probeer het opnieuw."});
    }

    const admins = existingGroup['admins'];
    if (!admins.includes(userId)) {
        res.status(405).json({message: "Geen rechten om deze groep aan te passen."});
    }

    const existingPlayers = existingGroup['players'];
    const existingAdmins = existingGroup['admins'];
    if (!existingPlayers.includes(newAdminId)) {
        res.status(500).json({message: "Kon geen nieuwe admin toevoegen, probeer het opnieuw."});
    }

    if (!(existingPlayers.includes(newAdminId) && !existingAdmins.includes(newAdminId))) {
        res.status(500).json({message: "De speler kan niet worden toegevoegd."});
    }

    try {
        let admin = await User.findById(newAdminId);
        existingGroup.admins.push(admin);
        await existingGroup.save();
    } catch (e) {
        res.status(500).json({message: "Kon geen nieuwe admin toevoegen, probeer het opnieuw"});
    }

    res.status(200).json({message: "Succesvol een admin toegevoegd."});
};

const removePlayer = async (req, res, next) => {
    await validateRequest(req, res, next);

    const userId = req.userData.userId;
    const {playerId, groupId} = req.body;

    if (playerId === userId) {
        res.status(500).json({message: "Kan niet jezelf verwijderen."});
    }

    let selectedGroup;
    try {
        selectedGroup = await Group.findById(groupId);
    } catch (e) {
        res.status(500).json({message: "Kon de speler niet verwijderen, probeer het opnieuw."});
    }

    let selectedPlayer;
    try {
        selectedPlayer = await User.findById(playerId);
    } catch (e) {
        res.status(500).json({message: "Kon de speler niet verwijderen, probeer het opnieuw."});
    }

    const admins = selectedGroup['admins'];
    let isAdmin = false;
    if (!admins.includes(userId)) {
        res.status(403).json({message: "Geen rechten om deze speler te verwijderen."});
    } else {
        isAdmin = true;
    }

    const players = selectedGroup['players'];
    if (!players.includes(playerId)) {
        res.status(404).json({message: "De speler is niet in deze groep gevonden."});
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
        res.status(500).json({message: "Kon de speler niet verwijderen, probeer het opnieuw."});
    }

    res.status(200).json({message: "Succesvol de speler verwijderd."});
};

const removeAdmin = async (req, res, next) => {
    await validateRequest(req, res, next);

    const userId = req.userData.userId;
    const {adminId, groupId} = req.body;

    if (adminId === userId) {
        res.status(500).json({message: "Kan niet jezelf verwijderen."});
    }

    let selectedGroup;
    try {
        selectedGroup = await Group.findById(groupId);
    } catch (e) {
        res.status(500).json({message: "Kon admin rechten niet intrekken."});
    }

    const admins = selectedGroup['admins'];
    if (!admins.includes(adminId)) {
        res.status(500).json({message: "Kon admin rechten niet intrekken."});
    }

    if (admins.length === 1) {
        res.status(500).json({message: "Kon admin rechten niet intrekken, minimaal 1 admin vereist."});
    }

    try {
        const selectedAdmin = await User.findById(adminId);
        selectedGroup.admins.pull(selectedAdmin);
        selectedGroup.save();
    } catch (e) {
        res.status(500).json({message: "Kon admin rechten niet intrekken."});
    }

    res.status(200).json({message: "Succesvol admin rechten verwijderd."});

};

const removeGroup = async (req, res, next) => {
    await validateRequest(req, res, next);

    const userId = req.userData.userId;
    const {groupId} = req.body;

    let selectedGroup;
    try {
        selectedGroup = await Group.findById(groupId);
    } catch (e) {
        res.status(500).json({message: "Kon groep niet verwijderen, probeer het opnieuw."});
    }

    let selectedUser;
    try {
        selectedUser = await User.findById(userId);
    } catch (e) {
        res.status(500).json({message: "Kon groep niet verwijderen, probeer het opnieuw."});
    }

    if (!selectedGroup['admins'].includes(selectedUser.id)) {
        res.status(403).json({message: "Geen rechten om de groep te verwijderen."});
    }

    let players = selectedGroup['players'];
    for (const player of players) {
        try {
            const thisPlayer = await User.findById(player);
            thisPlayer.groups.pull(selectedGroup);
            await thisPlayer.save();
        } catch (e) {
            res.status(500).json({message: "Kon groep niet verwijderen, probeer het opnieuw."});
        }
    }

    //TODO Remove Matches and result from matches when removing group


    try {
        await Group.findByIdAndDelete(groupId);
    } catch (err) {
        res.status(500).json({message: "Kon groep niet verwijderen, probeer het opnieuw."});
    }

    res.status(200).json({message: "Succesvol de groep verwijderd."});
};

const editGroup = async (req, res, next) => {
    await validateRequest(req, res, next);

    const userId = req.userData.userId;
    const {groupId, title} = req.body;

    let selectedGroup;
    try {
        selectedGroup = await Group.findById(groupId);
    } catch (e) {
        res.status(500).json({message: "Kon groep niet aanpassen, probeer het opnieuw."});
    }

    let selectedUser;
    try {
        selectedUser = await User.findById(userId);
    } catch (e) {
        res.status(500).json({message: "Kon groep niet aanpassen, probeer het opnieuw."});
    }

    if (!selectedGroup['admins'].includes(selectedUser.id)) {
        res.status(403).json({message: "Geen rechten om de groep aan te passen."});
    }

    try {
        selectedGroup.title = title;
        selectedGroup.save();
    } catch {
        res.status(500).json({message: "Kon groep niet aanpassen, probeer het opnieuw."});
    }

    res.status(200).json({message: "Succesvol de groep aangepast."});
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