const moment = require('moment');

const User = require('../models/user');
const Group = require('../models/group');
const Match = require('../models/match');
const Result = require('../models/result');
const validateRequest = require('../helper/valid-checker');

const getMatches = async (req, res, next) => {
    await validateRequest(req, res, next);

    const userId = req.userData.userId;
    const {groupId} = req.body;

    let group;
    try {
        group = await Group.findById(groupId);
    } catch (e) {
        res.status(500).json({message: "Kon wedstrijden niet ophalen, probeer het opnieuw."});
    }

    if (!group.players.includes(userId)) {
        res.status(500).json({message: "Kan de wedstrijden voor deze gebruiker niet ophalen."});
    }

    let matches;
    try {
        matches = await Match.find({group: group}).sort({date: 'asc'});
    } catch {
        res.status(500).json({message: "Kon wedstrijden niet ophalen, probeer het opnieuw."});
    }

    res.send(matches);
};

const addMatches = async (req, res, next) => {
    await validateRequest(req, res, next);

    const userId = req.userData.userId;
    const {dates, groupId} = req.body;

    let group;
    try {
        group = await Group.findById(groupId);
    } catch (e) {
        res.status(500).json({message: "Kon groep niet ophalen, probeer het opnieuw."});
    }

    if (!group.admins.includes(userId)) {
        res.status(500).json({message: "Geen rechten om een wedstrijd aan te maken."});
    }

    let successful = 0;
    let existing = "";
    let existingMatch = true;
    let newMatch;
    for (const date of dates) {
        let momentDate = moment(date, "DD-MM-YYYY");

        newMatch = new Match({
            date: momentDate,
            group,
            results: []
        });


        try {
            existingMatch = !!await Match.findOne({date: momentDate, group: groupId});
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

    if (!existingMatch) {
        let newMatches = await Match.find({group: groupId});
        for (const thisMatch of newMatches) {
            for (const player of group.players) {
                let newResult = new Result({
                    match: thisMatch._id,
                    user: player,
                    score: 0
                });
                try {
                    await newResult.save();
                    await thisMatch.results.push(newResult);
                    await thisMatch.save();
                } catch (e) {
                    console.log("Could not save this result");
                }
            }
        }
    }


    res.status(201).json({message: `Succesvol ${successful} nieuwe wedstrijd(en) aangemaakt. ${existing ? existing : ""}`})

};

const deleteMatch = async (req, res, next) => {
    await validateRequest(req, res, next);

    const userId = req.userData.userId;
    const {matchId, groupId} = req.body;

    let match;
    try {
        match = await Match.findById(matchId);
    } catch (e) {
        res.status(500).json({message: "Kon wedstrijd niet ophalen, probeer het opnieuw."});
    }

    if (!match) {
        res.status(404).json({message: "Geen wedstrijd gevonden."});
    }

    let group;
    try {
        group = await Group.findById(groupId);
    } catch (e) {
        res.status(500).json({message: "Kon groep niet ophalen, probeer het opnieuw."});
    }

    if (!group) {
        res.status(404).json({message: "Kon groep niet vinden, probeer het opnieuw."});
    }

    let user;
    try {
        user = await User.findById(userId);
    } catch (e) {
        res.status(500).json({message: "Kon gebruiker niet ophalen, probeer het opnieuw."});
    }

    if (!user) {
        res.status(404).json({message: "Kon gebruiker niet vinden, probeer het opnieuw."});
    }

    if (!group.matches.includes(match.id)) {
        res.status(404).json({message: "De wedstrijd kon niet bij deze groep gevonden worden."});
    }

    if (!group["admins"].includes(user.id)) {
        res.status(403).json({message: "Geen rechten om een wedstrijd te verwijderen."});
    }

    //TODO: REMOVE ALL RESULTS WITH MATCHID

    try {
        await group.matches.pull(match);
        await Match.findByIdAndDelete(match.id);
    } catch (e) {
        res.status(500).json({message: "Kon wedstrijd niet verwijderen, probeer het opnieuw."});
    }

    res.status(200).json({message: "Succesvol de wedstrijd verwijderd."});
};

exports.getMatches = getMatches;
exports.addMatches = addMatches;
exports.deleteMatch = deleteMatch;