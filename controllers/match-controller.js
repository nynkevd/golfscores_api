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
            // console.log(momentDate);
            let existingMatch = !!await Match.findOne({date: momentDate, group: groupId});
            if (existingMatch) {
                existing += " A match on " + date + " already exists, please try a different day.";
            } else {
                await newMatch.save();
                await group.matches.push(newMatch.id);
                group.save();
                successful += 1;
            }

        } catch {
            console.log("Saving failed");
        }
    }

    res.status(201).json({message: `Succesfully created ${successful} new match(es).${existing ? existing : ""}`})

};

exports.addMatches = addMatches;