const User = require('../models/user');
const Group = require('../models/group');
const Invite = require('../models/invite');

const validateRequest = require('../helper/valid-checker');

const getInviteInfo = async (req, res, next) => {
    await validateRequest(req, res, next);

    const userId = req.userData.userId;
    const inviteId = req.params.inviteId;

    let invite;
    try {
        invite = await Invite.findById(inviteId);
    } catch (e) {
        return res.status(500).send({message: "Kon uitnodiging niet vinden, probeer het opnieuw."})
    }

    let inviter;
    try {
        inviter = await User.findById(invite.inviter);
    } catch (e) {
        return res.status(500).send({message: "Kon gebruiker niet vinden, probeer het opnieuw."})
    }

    let group;
    try {
        group = await Group.findById(invite.group);
    } catch (e) {
        return res.status(404).send({message: "Kon groep niet vinden, probeer het opnieuw."})
    }

    let player;
    let players = [];
    for (let i = 1; i <= 3; i++) {
        if (group.players[i]) {
            try {
                player = await User.findById(group.players[i]);
                players.push(player.name);
            } catch (e) {
                return res.status(404).send({message: "Kon speler niet vinden, probeer het opnieuw."})
            }
        }
    }

    return res.status(200).send({groupName: invite.groupName, inviter: inviter.name, inviteId, players});
};

const inviteByUsername = async (req, res, next) => {
    await validateRequest(req, res, next);

    const userId = req.userData.userId;
    const {username, groupId} = req.body;

    let group;
    let user;
    let toInvite;
    try {
        group = await Group.findById(groupId);
        user = await User.findById(userId);
        toInvite = await User.findOne({username: username});
    } catch (err) {
        return res.status(500).send({message: "this Er is iets fout gegaan, probeer het opnieuw."})
    }

    if (!group) {
        return res.status(404).send({message: 'Geen groep gevonden.'})
    }
    if (!user) {
        return res.status(404).send({message: 'Geen gebruiker gevonden.'})
    }
    if (!toInvite) {
        return res.status(404).send({message: 'Geen gebruiker gevonden met deze gebruikersnaam.'})
    }
    if (!group.admins.includes(userId)) {
        return res.status(403).send({message: 'Geen admin bij de gegeven groep.'})
    }
    let existingInvite;
    try {
        existingInvite = await Invite.findOne({group: groupId, user: toInvite.id})
    } catch (err) {
        return res.status(500).send({message: "Er is iets fout gegaan, probeer het opnieuw."})
    }

    if (!!existingInvite) {
        return res.status(500).send({message: "Er bestaat al een uitnodiging voor deze gebruiker."})
    }

    const newInvite = new Invite({
        group: groupId,
        groupName: group.title,
        inviter: userId,
        user: toInvite._id
    });
    try {
        await newInvite.save();
        await group.invites.push(newInvite);
        await group.save();
        await toInvite.invites.push(newInvite);
        await toInvite.save();
    } catch (err) {
        return res.status(500).send({message: "Er is iets fout gegaan bij het opslaan, probeer het opnieuw."})
    }

    let invites = [];
    for (const invite of group.invites) {
        let thisInvite = await Invite.findById(invite);
        let thisPlayer = await User.findById(thisInvite.user);
        invites.push({player: thisPlayer.name, id: invite})
    }

    return res.status(200).send({invites})
};

const acceptInvite = async (req, res, next) => {
    await validateRequest(req, res, next);

    const {inviteId} = req.params;
    const userId = req.userData.userId;

    let invite;
    try {
        invite = await Invite.findById(inviteId);
    } catch {
        return res.status(500).send({message: "Er is iets fout gegaan, probeer het opnieuw."})
    }

    if (!invite) {
        return res.status(404).send({message: "Kon de uitnodiging niet vinden."})
    }

    if (!invite.user === userId) {
        return res.status(403).send({message: "Kan deze uitnodiging niet accepteren."})
    }

    let group;
    let user;
    try {
        group = await Group.findById(invite.group);
        if (!group) {
            return res.status(404).send({message: "Kon de groep niet vinden."})
        }
        user = await User.findById(userId);

        group.invites.pull(invite);
        group.players.push(user);
        await group.save();
        user.invites.pull(invite);
        user.groups.push(group);
        await user.save();
        await Invite.findByIdAndDelete(invite.id);

    } catch (err) {
        return res.status(500).send({message: "Er is iets fout gegaan, probeer het opnieuw."})
    }

    return res.status(200).send({message: "Succesvol uitnodiging geaccepteerd.", groupId: group.id})

};

const declineInvite = async (req, res, next) => {
    await validateRequest(req, res, next);

    const {inviteId} = req.params;
    const userId = req.userData.userId;

    let invite;
    try {
        invite = await Invite.findById(inviteId);
    } catch {
        return res.status(500).send({message: "Er is iets fout gegaan, probeer het opnieuw."})
    }

    if (!invite) {
        return res.status(404).send({message: "Kon de uitnodiging niet vinden."})
    }

    if (!invite.user === userId) {
        return res.status(403).send({message: "Kan deze uitnodiging niet afwijzen."})
    }

    let group;
    let user;
    try {
        group = await Group.findById(invite.group);
        if (!group) {
            return res.status(404).send({message: "Kon de groep niet vinden."})
        }
        user = await User.findById(userId);

        group.invites.pull(invite);
        await group.save();
        user.invites.pull(invite);
        await user.save();
        await Invite.findByIdAndDelete(invite.id);

    } catch (err) {
        return res.status(500).send({message: "Er is iets fout gegaan, probeer het opnieuw."})
    }

    return res.status(200).send({message: "Succesvol uitnodiging geweigerd."})

};

const deleteInvite = async (req, res, next) => {
    await validateRequest(req, res, next);

    const {inviteId} = req.params;
    const userId = req.userData.userId;

    let invite;
    try {
        invite = await Invite.findById(inviteId);
    } catch {
        return res.status(500).send({message: "Er is iets fout gegaan, probeer het opnieuw."})
    }

    if (!invite) {
        return res.status(404).send({message: "Kon de uitnodiging niet vinden."})
    }

    let group;
    let user;
    try {
        group = await Group.findById(invite.group);
        if (!group) {
            return res.status(404).send({message: "Kon de groep niet vinden."})
        }
        if (!group.admins.includes(userId)) {
            return res.status(403).send({message: "Mag deze uitnodiging niet verwijderen."})
        }
        user = await User.findById(userId);

        group.invites.pull(invite);
        await group.save();
        user.invites.pull(invite);
        await user.save();
        await Invite.findByIdAndDelete(invite.id);

    } catch (err) {
        return res.status(500).send({message: "Er is iets fout gegaan, probeer het opnieuw."})
    }

    return res.status(200).send({message: "Succesvol uitnodiging geweigerd."})
}

exports.getInviteInfo = getInviteInfo;
exports.inviteByUsername = inviteByUsername;
exports.acceptInvite = acceptInvite;
exports.declineInvite = declineInvite;
exports.deleteInvite = deleteInvite;