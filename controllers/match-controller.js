const moment = require('moment');

const User = require('../models/user');
const Group = require('../models/group');
const Match = require('../models/match');
const validateRequest = require('../helper/valid-checker');

const getMatchInfo = async (req, res, next) => {
    await validateRequest(req, res, next);

    const {matchId} = req.params;

    //TODO check if match belongs to group
    let match;
    try {
        match = await Match.findById(matchId);
    } catch (e) {
        return res.status(500).json({message: "Er is iets fout gegaan, probeer het opnieuw."});
    }

    if (!match) {
        return res.status(404).json({message: "Geen wedstrijd gevonden."});
    }

    let group;
    try {
        group = await Group.findById(match.group);
    } catch (e) {
        return res.status(500).json({message: "Er is iets fout gegaan, probeer het opnieuw."});
    }

    let players = [];
    for (const player of group.players) {
        let thisPlayer = await User.findById(player._id);
        players.push({name: thisPlayer.name, id: thisPlayer._id})
    }

    return res.status(200).json({match, players});
};

const enterMatchResults = async (req, res, next) => {
    await validateRequest(req, res, next);

    const {scores, groupId, matchId} = req.body;
    const userId = req.userData.userId;

    let match;
    try {
        match = await Match.findById(matchId);
    } catch (e) {
        return res.status(500).json({message: "Er is iets fout gegaan, probeer het opnieuw."});
    }

    if (!match) {
        return res.status(404).json({message: "Geen wedstrijd gevonden."});
    }

    if (match.group.toString() !== groupId) {
        return res.status(403).json({message: "Opgegeven wedstrijd hoort niet bij de groep."});
    }

    if (!!Object.keys(match.results).length) {
        return res.status(403).json({message: "Wedstrijd heeft al resultaten."});
    }

    let group;
    try {
        group = await Group.findById(match.group);
    } catch (e) {
        return res.status(500).json({message: "Er is iets fout gegaan, probeer het opnieuw."});
    }

    let admins = group['admins'];
    if (!admins.includes(userId)) {
        return res.status(403).json({message: "Geen rechten om voor deze groep wedstrijden in te vullen."});
    }

    try {
        let matchResults = [];
        let groupResults = group.standings || [];
        let thisScores = Object.entries(scores);
        for (const thisScore of thisScores) {
            let [player, score] = thisScore;
            if (score) {
                score = +score;
            }
            let thisUser = await User.findById(player);
            matchResults.push({name: thisUser.name, score: score, userId: player});

            let userInGroup = groupResults.find(user => user.userId === player);
            if (!userInGroup) {
                groupResults.push({
                    userId: player,
                    name: thisUser.name,
                    allResults: [],
                    average: 0,
                    total: 0,
                    matchesPlayed: 0
                });
            }

            userInGroup = groupResults.find(user => user.userId === player);
            if (!userInGroup.allResults.find(result => result.matchId === matchId)) {
                userInGroup.allResults.push({matchId, score});
            }

            if (score) {
                userInGroup.total += score;
                userInGroup.matchesPlayed += 1;
            }

            if (userInGroup.matchesPlayed > 0) {
                userInGroup.average = Math.round(userInGroup.total / userInGroup.matchesPlayed);
            }

        }
        match.results = matchResults;
        await match.save();
        group.standings = groupResults;
        group.markModified('standings');
        await group.save();

    } catch (err) {
        console.log("hier");
        return res.status(500).json({message: "Er is iets fout gegaan, probeer het opnieuw."});
    }

    return res.status(200).json({message: "Gelukt."});
};

const addMatches = async (req, res, next) => {
    await validateRequest(req, res, next);

    const {dates, groupId} = req.body;
    const userId = req.userData.userId;

    let group;
    try {
        group = await Group.findById(groupId);
    } catch (e) {
        return res.status(500).json({message: "Kon groep niet ophalen, probeer het opnieuw."});
    }

    if (!group.admins.includes(userId)) {
        return res.status(500).json({message: "Geen rechten om een wedstrijd aan te maken."});
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
                existing += " Er bestaat al een wedstrijd op: " + date + " , probeer een andere dag.";
            } else {
                await newMatch.save();
                await group.matches.push(newMatch.id);
                await group.save();
                successful += 1;
            }

        } catch {
            return res.status(500).json({message: "Niet gelukt wedstrijd aan te maken, probeer het opnieuw."});
        }
    }

    // return res.status(201).json({message: `Succesvol ${successful} nieuwe wedstrijd(en) aangemaakt. ${existing ? existing : ""}`})
    return res.status(201).json({message: `Succesvol een nieuwe wedstrijd aangemaakt.`})

};

const deleteMatch = async (req, res, next) => {
    await validateRequest(req, res, next);

    const userId = req.userData.userId;
    const {matchId, groupId} = req.body;

    let match;
    try {
        match = await Match.findById(matchId);
    } catch (e) {
        return res.status(500).json({message: "Kon wedstrijd niet ophalen, probeer het opnieuw."});
    }

    if (!match) {
        return res.status(404).json({message: "Geen wedstrijd gevonden."});
    }

    let group;
    try {
        group = await Group.findById(groupId);
    } catch (e) {
        return res.status(500).json({message: "Kon groep niet ophalen, probeer het opnieuw."});
    }

    if (!group) {
        return res.status(404).json({message: "Kon groep niet vinden, probeer het opnieuw."});
    }

    let user;
    try {
        user = await User.findById(userId);
    } catch (e) {
        return res.status(500).json({message: "Kon gebruiker niet ophalen, probeer het opnieuw."});
    }

    if (!user) {
        return res.status(404).json({message: "Kon gebruiker niet vinden, probeer het opnieuw."});
    }

    if (!group.matches.includes(match.id)) {
        return res.status(404).json({message: "De wedstrijd kon niet bij deze groep gevonden worden."});
    }

    if (!group["admins"].includes(user.id)) {
        return res.status(403).json({message: "Geen rechten om een wedstrijd te verwijderen."});
    }

    try {
        for (const user of group.standings) {
            let index = user.allResults.findIndex(thisUser => thisUser.matchId === matchId);
            if (user.allResults[index]) {
                let score = user.allResults[index].score
                user.allResults.splice(index, 1);

                if (score) {
                    user.total -= score;
                    user.matchesPlayed -= 1;
                }

                if (user.matchesPlayed > 0) {
                    user.average = Math.round(user.total / user.matchesPlayed);
                } else {
                    user.average = 0;
                    user.total = 0;
                }
            }
        }

        await group.matches.pull(match);
        group.markModified('standings');
        await group.save();
        await Match.findByIdAndDelete(match.id);
    } catch (e) {
        return res.status(500).json({message: "Kon wedstrijd niet verwijderen, probeer het opnieuw."});
    }

    return res.status(200).json({message: "Succesvol de wedstrijd verwijderd."});
};

exports.getMatchInfo = getMatchInfo;
exports.addMatches = addMatches;
exports.deleteMatch = deleteMatch;
exports.enterMatchResults = enterMatchResults;