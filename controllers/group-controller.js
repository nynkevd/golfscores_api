const moment = require('moment');

const User = require('../models/user');
const Group = require('../models/group');
const Match = require('../models/match');
const Invite = require('../models/invite');
const validateRequest = require('../helper/valid-checker');

const checkIfAdmin = async (req, res, next) => {
    await validateRequest(req, res, next);

    const userId = req.userData.userId;
    const {groupId} = req.params;

    const group = await Group.findById(groupId);

    if (group.admins.includes(userId)) {
        return res.status(200).send(true);
    } else {
        return res.status(403).send(false);
    }
};

const getGroupItemInfo = async (req, res, next) => {
    await validateRequest(req, res, next);

    const {groupId} = req.params;
    const userId = req.userData.userId;

    let group;
    try {
        group = await Group.findById(groupId);
    } catch (e) {
        return res.status(500).send({message: 'Probeer het opnieuw.'})
    }
    if (!group) {
        return res.status(404).send({message: 'Geen groep gevonden.'})
    }

    if (!group.players.includes(userId)) {
        return res.status(403).send({message: 'Je bent geen deel van deze groep.'})
    }

    return res.status(200).send({
        groupName: group.title,
        first: {
            player: 'Noa',
            score: 8
        }, second: {
            player: 'Anouk',
            score: 6
        }, third: {
            player: 'Lara',
            score: 5
        }
    });

    // return res.status(200).send(group);
};

const getGroupInfo = async (req, res, next) => {
    await validateRequest(req, res, next);

    const groupId = req.params.groupId;
    const userId = req.userData.userId;

    let group;
    try {
        group = await Group.findById(groupId);
    } catch (e) {
        return res.status(500).send({message: 'Probeer het opnieuw.'});
    }
    if (!group) {
        return res.status(404).send({message: 'Geen groep gevonden.'});
    }

    if (!group.players.includes(userId)) {
        return res.status(403).send({message: 'Je bent geen deel van deze groep.'});
    }

    let isAdmin = false;
    if (group.admins.includes(userId)) {
        isAdmin = true;
    }

    //TODO: Remove this and change to complete results
    let players = [];
    for (const player of group.players) {
        let thisPlayer = await User.findById(player._id);
        players.push({name: thisPlayer.name, id: thisPlayer._id})
    }

    let matches = [];
    try {
        let thisMatches = await Match.find({group: group, date: {$gt: moment().format()}}).sort({date: 'asc'}).limit(3);
        if (thisMatches) {
            for (const match of thisMatches) {
                if (!!Object.keys(match.results).length) {
                    let sortedResults = match.results.sort((a, b) => {
                        return b.score - a.score;
                    });
                    sortedResults = sortedResults.slice(0, 3);
                    matches.push({
                        date: moment(match.date).format('DD-MM-YYYY'),
                        id: match._id,
                        results: sortedResults
                    });
                } else {
                    matches.push({date: moment(match.date).format('DD-MM-YYYY'), id: match._id, results: null});
                }
            }
        }
    } catch (e) {
        return res.status(500).send({message: 'Probeer het opnieuw.'});
    }

    let matchToday = await Match.findOne({group: group, date: {$eq: moment().startOf('day').format()}});
    if (matchToday) {
        if (!!Object.keys(matchToday.results).length) {
            let sortedResults = matchToday.results.sort((a, b) => {
                return b.score - a.score;
            });
            sortedResults = sortedResults.slice(0, 3);
            matchToday = {
                date: moment(matchToday.date).format('DD-MM-YYYY'),
                id: matchToday._id,
                results: sortedResults
            };
        } else {
            matchToday = {date: moment(matchToday.date).format('DD-MM-YYYY'), id: matchToday._id, results: null};
        }
    }

    let prevMatches = [];
    try {
        let thisMatches = await Match.find({
            group: group,
            date: {$lte: moment().subtract(1, "days").format()}
        }).sort({date: 'desc'}).limit(3);
        if (thisMatches) {
            for (const match of thisMatches) {
                if (!!Object.keys(match.results).length) {
                    let sortedResults = match.results.sort((a, b) => {
                        return b.score - a.score;
                    });
                    sortedResults = sortedResults.slice(0, 3);
                    prevMatches.push({
                        date: moment(match.date).format('DD-MM-YYYY'),
                        id: match._id,
                        results: sortedResults
                    });
                } else {
                    prevMatches.push({date: moment(match.date).format('DD-MM-YYYY'), id: match._id, results: null});
                }
            }
        }

    } catch (e) {
        return res.status(500).send({message: 'Probeer het opnieuw.'});
    }

    return res.status(200).send({groupName: group.title, players, isAdmin, matchToday, matches, prevMatches});

};

const getGroupAdminInfo = async (req, res, next) => {
    await validateRequest(req, res, next);
    const groupId = req.params.groupId;
    const userId = req.userData.userId;

    let group;
    try {
        group = await Group.findById(groupId);
    } catch (e) {
        return res.status(500).send({message: 'Probeer het opnieuw.'})
    }
    if (!group) {
        return res.status(404).send({message: 'Geen groep gevonden.'})
    }

    if (!group.players.includes(userId)) {
        return res.status(403).send({message: 'Je bent geen deel van deze groep.'})
    }

    let matches = [];
    let thisMatches = await Match.find({
        group: groupId,
        date: {$gte: moment().subtract(1, "week").format(), $lte: moment().add(1, "week").format()}
    }).sort({date: 'asc'});
    for (const match of thisMatches) {
        let thisMatch = await Match.findById(match);
        matches.push({
            date: moment(thisMatch.date).format('DD-MM-YYYY'),
            id: thisMatch._id,
            hasResults: !!Object.keys(thisMatch.results).length
        })
    }

    let players = [];
    let possibleAdmins = [];
    for (const player of group.players) {
        let thisPlayer = await User.findById(player._id);
        players.push({name: thisPlayer.name, id: thisPlayer._id})
        if (!group.admins.includes(thisPlayer._id)) {
            possibleAdmins.push({name: thisPlayer.name, id: thisPlayer._id});
        }
    }

    let admins = [];
    for (const admin of group.admins) {
        let thisAdmin = await User.findById(admin._id);
        admins.push({name: thisAdmin.name, id: thisAdmin._id})
    }

    let invites = [];
    for (const invite of group.invites) {
        let thisInvite = await Invite.findById(invite);
        let thisPlayer = await User.findById(thisInvite.user);
        invites.push({player: thisPlayer.name, id: invite})
    }

    return res.status(200).send({matches, players, invites, admins, possibleAdmins})

};

const createGroup = async (req, res, next) => {
    await validateRequest(req, res, next);

    const {title, invites} = req.body;
    const userId = req.userData.userId;

    let existingGroup;
    try {
        existingGroup = await Group.findOne({title: title})
    } catch (e) {
        return res.status(500).send({message: 'Probeer opnieuw de group aan te maken.'})
    }
    if (existingGroup) {
        return res.status(500).send({message: 'Er bestaat al een groep met deze naam.'})
    }

    let user;
    try {
        user = await User.findById(userId);
    } catch (e) {
        return res.status(500).send({message: 'Probeer opnieuw de group aan te maken.'})
    }
    if (!user) {
        return res.status(404).send({message: 'Gebruiker kan niet gevonden worden.'})
    }

    //Create invites
    let createdGroup;
    try {
        createdGroup = new Group({
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
                inviter: user.id,
                user: newInviteUserId
            });
            await invite.save();
            let newInviteUser = await User.findById(invite.user);
            newInviteUser.invites.push(invite);
            await newInviteUser.save();
            groupInvites.push(invite);
        }

        if (groupInvites) {
            createdGroup.invites = groupInvites;
        }

        user.groups.push(createdGroup);
        await user.save();

        await createdGroup.save();
    } catch (e) {
        return res.status(500).send({message: 'Het is niet gelukt, probeer opnieuw.'});
    }

    return res.status(201).json({message: "Succesvol een groep aangemaakt", groupId: createdGroup.id});
};

const addAdminToGroup = async (req, res, next) => {
    await validateRequest(req, res, next);

    const userId = req.userData.userId;
    const {newAdminId, groupId} = req.body;

    let existingGroup;
    try {
        existingGroup = await Group.findById(groupId);
    } catch (e) {
        return res.status(500).json({message: "Kon geen nieuwe admin toevoegen, probeer het opnieuw."});
    }
    if (!existingGroup) {
        return res.status(404).json({message: "De groep kon niet gevonden worden, probeer het opnieuw."});
    }

    const admins = existingGroup['admins'];
    if (!admins.includes(userId)) {
        return res.status(405).json({message: "Geen rechten om deze groep aan te passen."});
    }

    const existingPlayers = existingGroup['players'];
    const existingAdmins = existingGroup['admins'];
    if (!existingPlayers.includes(newAdminId)) {
        return res.status(500).json({message: "Kon geen nieuwe admin toevoegen, probeer het opnieuw."});
    }

    if (!(existingPlayers.includes(newAdminId) && !existingAdmins.includes(newAdminId))) {
        return res.status(500).json({message: "De speler kan niet worden toegevoegd."});
    }

    try {
        let admin = await User.findById(newAdminId);
        existingGroup.admins.push(admin);
        await existingGroup.save();
    } catch (e) {
        return res.status(500).json({message: "Kon geen nieuwe admin toevoegen, probeer het opnieuw"});
    }

    return res.status(200).json({message: "Succesvol een admin toegevoegd."});
};

const removePlayer = async (req, res, next) => {
    await validateRequest(req, res, next);

    const userId = req.userData.userId;
    const {playerId, groupId} = req.body;

    if (playerId === userId) {
        return res.status(500).json({message: "Kan niet jezelf verwijderen."});
    }

    let selectedGroup;
    try {
        selectedGroup = await Group.findById(groupId);
    } catch (e) {
        return res.status(500).json({message: "Kon de speler niet verwijderen, probeer het opnieuw."});
    }

    let selectedPlayer;
    try {
        selectedPlayer = await User.findById(playerId);
    } catch (e) {
        return res.status(500).json({message: "Kon de speler niet verwijderen, probeer het opnieuw."});
    }

    const admins = selectedGroup['admins'];
    let isAdmin = false;
    if (!admins.includes(userId)) {
        return res.status(403).json({message: "Geen rechten om deze speler te verwijderen."});
    } else {
        isAdmin = true;
    }

    const players = selectedGroup['players'];
    if (!players.includes(playerId)) {
        return res.status(404).json({message: "De speler is niet in deze groep gevonden."});
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
        return res.status(500).json({message: "Kon de speler niet verwijderen, probeer het opnieuw."});
    }

    return res.status(200).json({message: "Succesvol de speler verwijderd."});
};

const removeAdmin = async (req, res, next) => {
    await validateRequest(req, res, next);

    const userId = req.userData.userId;
    const {adminId, groupId} = req.body;

    if (adminId === userId) {
        return res.status(500).json({message: "Kan niet jezelf verwijderen."});
    }

    let selectedGroup;
    try {
        selectedGroup = await Group.findById(groupId);
    } catch (e) {
        return res.status(500).json({message: "Kon admin rechten niet intrekken."});
    }

    const admins = selectedGroup['admins'];
    if (!admins.includes(adminId)) {
        return res.status(500).json({message: "Kon admin rechten niet intrekken."});
    }

    if (admins.length === 1) {
        return res.status(500).json({message: "Kon admin rechten niet intrekken, minimaal 1 admin vereist."});
    }

    try {
        const selectedAdmin = await User.findById(adminId);
        selectedGroup.admins.pull(selectedAdmin);
        selectedGroup.save();
    } catch (e) {
        return res.status(500).json({message: "Kon admin rechten niet intrekken."});
    }

    return res.status(200).json({message: "Succesvol admin rechten verwijderd."});

};

const removeGroup = async (req, res, next) => {
    await validateRequest(req, res, next);

    const userId = req.userData.userId;
    const {groupId} = req.body;

    let selectedGroup;
    try {
        selectedGroup = await Group.findById(groupId);
    } catch (e) {
        return res.status(500).json({message: "Kon groep niet verwijderen, probeer het opnieuw."});
    }

    let selectedUser;
    try {
        selectedUser = await User.findById(userId);
    } catch (e) {
        return res.status(500).json({message: "Kon groep niet verwijderen, probeer het opnieuw."});
    }

    if (!selectedGroup['admins'].includes(selectedUser.id)) {
        return res.status(403).json({message: "Geen rechten om de groep te verwijderen."});
    }

    let players = selectedGroup['players'];
    for (const player of players) {
        try {
            const thisPlayer = await User.findById(player);
            thisPlayer.groups.pull(selectedGroup);
            await thisPlayer.save();
        } catch (e) {
            return res.status(500).json({message: "Kon groep niet verwijderen, probeer het opnieuw."});
        }
    }

    //TODO Remove Matches and result from matches when removing group


    try {
        await Group.findByIdAndDelete(groupId);
    } catch (err) {
        return res.status(500).json({message: "Kon groep niet verwijderen, probeer het opnieuw."});
    }

    return res.status(200).json({message: "Succesvol de groep verwijderd."});
};

const editGroup = async (req, res, next) => {
    await validateRequest(req, res, next);

    const userId = req.userData.userId;
    const {groupId, title} = req.body;

    let selectedGroup;
    try {
        selectedGroup = await Group.findById(groupId);
    } catch (e) {
        return res.status(500).json({message: "Kon groep niet aanpassen, probeer het opnieuw."});
    }

    let selectedUser;
    try {
        selectedUser = await User.findById(userId);
    } catch (e) {
        return res.status(500).json({message: "Kon groep niet aanpassen, probeer het opnieuw."});
    }

    if (!selectedGroup['admins'].includes(selectedUser.id)) {
        return res.status(403).json({message: "Geen rechten om de groep aan te passen."});
    }

    try {
        selectedGroup.title = title;
        selectedGroup.save();
    } catch {
        return res.status(500).json({message: "Kon groep niet aanpassen, probeer het opnieuw."});
    }

    return res.status(200).json({message: "Succesvol de groep aangepast."});
};

nestedSort = (prop1, prop2 = null, direction = 'asc') => (e1, e2) => {
    const a = prop2 ? e1[prop1][prop2] : e1[prop1],
        b = prop2 ? e2[prop1][prop2] : e2[prop1],
        sortOrder = direction === "asc" ? 1 : -1
    return (a < b) ? -sortOrder : (a > b) ? sortOrder : 0;
}

exports.checkIfAdmin = checkIfAdmin;
exports.getGroupInfo = getGroupInfo;
exports.getGroupAdminInfo = getGroupAdminInfo;
exports.getGroupItemInfo = getGroupItemInfo;
exports.createGroup = createGroup;
// exports.addPlayerToGroup = addPlayerToGroup;
exports.addAdminToGroup = addAdminToGroup;
exports.removePlayer = removePlayer;
exports.removeAdmin = removeAdmin;
exports.removeGroup = removeGroup;
exports.editGroup = editGroup;