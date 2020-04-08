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
        res.status(500).send({message: "Kon uitnodiging niet vinden, probeer het opnieuw."})
    }

    let inviter;
    try {
        inviter = await User.findById(invite.inviter);
    } catch (e) {
        res.status(500).send({message: "Kon gebruiker niet vinden, probeer het opnieuw."})
    }

    let group;
    try {
        group = await Group.findById(invite.group);
    } catch (e) {
        res.status(404).send({message: "Kon groep niet vinden, probeer het opnieuw."})
    }

    let player;
    let players = [];
    for (let i = 1; i <= 3; i++) {
        if (group.players[i]) {
            console.log(group.players[i]);
            try {
                player = await User.findById(group.players[i]);
                players.push(player.name);
            } catch (e) {
                res.status(404).send({message: "Kon groep niet vinden, probeer het opnieuw."})
            }
        }
    }

    res.status(200).send({groupName: invite.groupName, inviter: inviter.name, inviteId, players});
};

const acceptInvite = async (req, res, next) => {
    await validateRequest(req, res, next);

    const {inviteId} = req.params;
    const userId = req.userData.userId;

    let invite;
    try {
        invite = await Invite.findById(inviteId);
    } catch {
        res.status(500).send({message: "Er is iets fout gegaan, probeer het opnieuw."})
    }

    if (!invite) {
        res.status(404).send({message: "Kon de uitnodiging niet vinden."})
    }

    if (!invite.user === userId) {
        res.status(403).send({message: "Kan deze uitnodiging niet accepteren."})
    }

    let group;
    let user;
    try {
        group = await Group.findById(invite.group);
        if (!group) {
            res.status(404).send({message: "Kon de groep niet vinden."})
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
        res.status(500).send({message: "Er is iets fout gegaan, probeer het opnieuw."})
    }

    res.status(200).send({message: "Succesvol uitnodiging geaccepteerd."})

};

const declineInvite = async (req, res, next) => {
    await validateRequest(req, res, next);

    const {inviteId} = req.params;
    const userId = req.userData.userId;

    let invite;
    try {
        invite = await Invite.findById(inviteId);
    } catch {
        res.status(500).send({message: "Er is iets fout gegaan, probeer het opnieuw."})
    }

    if (!invite) {
        res.status(404).send({message: "Kon de uitnodiging niet vinden."})
    }

    if (!invite.user === userId) {
        res.status(403).send({message: "Kan deze uitnodiging niet afwijzen."})
    }

    let group;
    let user;
    try {
        group = await Group.findById(invite.group);
        if (!group) {
            res.status(404).send({message: "Kon de groep niet vinden."})
        }
        user = await User.findById(userId);

        group.invites.pull(invite);
        await group.save();
        user.invites.pull(invite);
        await user.save();
        await Invite.findByIdAndDelete(invite.id);

    } catch (err) {
        res.status(500).send({message: "Er is iets fout gegaan, probeer het opnieuw."})
    }

    res.status(200).send({message: "Succesvol uitnodiging geweigerd."})

};

exports.getInviteInfo = getInviteInfo;
exports.acceptInvite = acceptInvite;
exports.declineInvite = declineInvite;