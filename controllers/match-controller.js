const moment = require('moment');

const User = require('../models/user');
const Group = require('../models/group');
const Match = require('../models/match');
const validateRequest = require('../helper/valid-checker');
const HttpError = require('../models/http-error');

const addMatches = async (req, res, next) => {
    await validateRequest(req, next);

    const {dates, groupId, userId} = req.body;

    let group;
    try {
        group = await Group.findById(groupId);
    } catch (e) {
        return next(new HttpError("Could not get the selected group.", 500));
    }

    let user;
    try {
        user = User.findById(userId);
    } catch (e) {
        return next(new HttpError("Could not find the selected user", 500));
    }

    if (!group.admins.includes(userId)) {
        return next(new HttpError("User not permitted to edit this group", 500));
    }

    let successful = 0;
    let existing = "";
    let newMatch;
    for (const date of dates) {
        let momentDate = moment(date, "DD-MM-YYYY");

        newMatch = new Match({
            date: momentDate,
            group,
            results: []
        });

        try {
            let existingMatch = !!await Match.findOne({date: momentDate, group: groupId});
            if (existingMatch) {
                existing += " A match on " + date + " already exists, please try a different day.";
            } else {
                await newMatch.save();
                await group.matches.push(newMatch.id);
                await group.save();
                successful += 1;
            }

        } catch {
            console.log("Saving failed");
        }
    }

    res.status(201).json({message: `Succesfully created ${successful} new match(es).${existing ? existing : ""}`})

};

const deleteMatch = async (req, res, next) => {
    await validateRequest(req, next);

    const {matchId, groupId, userId} = req.body;

    let match;
    try {
        match = await Match.findById(matchId);
    } catch (e) {
        return next(new HttpError("Could not get match, please try again", 500));
    }

    if (!match) {
        return next(new HttpError("No match was found.", 404));
    }

    let group;
    try {
        group = await Group.findById(groupId);
    } catch (e) {
        return next(new HttpError("Could not get group, please try again", 500));
    }

    if (!group) {
        return next(new HttpError("No group was found.", 404));
    }

    let user;
    try {
        user = await User.findById(userId);
    } catch (e) {
        return next(new HttpError("Could not get user, please try again", 500));
    }

    if (!user) {
        return next(new HttpError("No user was found.", 404));
    }

    console.log(group);

    if (!group.matches.includes(match.id)) {
        return next(new HttpError("The provided match does not belong to the provided group", 404));
    }

    if (!group["admins"].includes(user.id)) {
        return next(new HttpError("The provided user is not permitted to update this group", 403));
    }

    // REMOVE ALL RESULTS WITH MATCHID

    // REMOVE MATCH
    try {
        await group.matches.pull(match);
        await Match.findByIdAndDelete(match.id);
    } catch (e) {
        return next(new HttpError("The match could not be removed, please try again", 500));
    }

    res.status(200).json({message: "Succesfully removed the match"});
};

exports.addMatches = addMatches;
exports.deleteMatch = deleteMatch;