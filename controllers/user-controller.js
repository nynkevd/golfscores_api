const {validationResult} = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const validateRequest = require('../helper/valid-checker');

const getDashboardInfo = async (req, res, next) => {
    await validateRequest(req, res, next);
    const userId = req.userData.userId;

    //get invites
    let user;
    try {
        user = await User.findById(userId);
    } catch (e) {
        return res.status(500).send({message: 'De informatie kan niet opgehaald worden.'})
    }

    return res.status(200).send({message: 'Dashboard', invites: user.invites, groups: user.groups, name: user.name});
};

const getUserInfo = async (req, res, next) => {
    await validateRequest(req, res, next);

    const userId = req.userData.userId;

    let existingUser;
    try {
        existingUser = await User.findById(userId);
    } catch (e) {
        return res.status(500).send({message: 'De informatie kan niet opgehaald worden.'})
    }

    if (!existingUser) {
        return res.status(404).send({message: 'Kan de gebruiker niet vinden.'})
    }

    return res.status(200).json({
        name: existingUser.name,
        username: existingUser.username,
        description: existingUser.description
    });
};

const getUsersBySearch = async (req, res, next) => {
    await validateRequest(req, res, next);
    const userId = req.userData.userId;

    const searchQuery = req.params.searchQuery;

    let users = await User.find({
            $and: [
                {$or: [{username: {$regex: searchQuery}}, {name: {$regex: searchQuery}}, {description: {$regex: searchQuery}}]},
                {_id: {$ne: userId}}
            ]
        }
        , function (err) {
            if (err) {
                return res.status(500).send({message: 'Kan geen gebruikers ophalen, probeer het opnieuw.'})
            }
        });

    let newusers = users.map(user => ({
        name: user.name,
        username: user.username,
        description: user.description,
        userId: user._id.toString()
    }));

    res.send(newusers);
};

const login = async (req, res, next) => {
    const {username, password} = req.body;
    let existingUser;
    try {
        existingUser = await User.findOne({username: username});
    } catch (e) {
        return res.status(500).send({message: 'Kan niet inloggen, probeer het opnieuw.'})
    }

    if (!existingUser) {
        return res.status(500).send({message: 'Kan niet inloggen, probeer het opnieuw.'})
    }

    let isValidPassword = false;
    try {
        isValidPassword = await bcrypt.compare(password, existingUser.password);
    } catch (e) {
        return res.status(500).send({message: 'Kan niet inloggen, probeer het opnieuw.'})
    }

    if (!isValidPassword) {
        return res.status(403).send({message: 'Wachtwoord klopt niet.'})
    }

    let token;
    try {
        token = jwt.sign(
            {userId: existingUser.id, username: existingUser.username},
            process.env.JWT_KEY,
            {expiresIn: '7d'});
    } catch (e) {
        return res.status(500).json({message: "Kan niet inloggen, probeer het opnieuw."}).send();
        next();
    }

    res.json({userId: existingUser.id, username: existingUser.username, token: token});

};

const signup = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).send({message: 'Kan niet aanmelden, controleer de velden.'});
    }

    const {name, username, description, password} = req.body;

    let existingUser;
    try {
        existingUser = await User.findOne({username: username});
    } catch (e) {
        return res.status(500).send({message: 'Kan niet aanmelden, probeer het opnieuw.'});
    }

    if (existingUser) {
        return res.status(422).send({message: 'Er bestaat al een gebruiker met deze gebruikersnaam'})
    }

    let hashedPassword;
    try {
        hashedPassword = await bcrypt.hash(password, 12);
    } catch (e) {
        return res.status(500).send({message: 'Kan niet aanmelden, probeer het opnieuw.'});
    }

    const createdUser = new User({
        name,
        username,
        description,
        password: hashedPassword,
        groups: []
    });

    try {
        await createdUser.save();
    } catch (e) {
        return res.status(500).send({message: 'Kan niet aanmelden, probeer het opnieuw.'});
    }

    let token;
    try {
        token = jwt.sign(
            {userId: createdUser.id, username: createdUser.username},
            process.env.JWT_KEY,
            {expiresIn: '7d'});
    } catch (e) {
        return res.status(500).send({message: 'Kan niet aanmelden, probeer het opnieuw.'});
    }

    return res.status(201).json({userId: createdUser.id, username: createdUser.username, token: token});
};

const editUser = async (req, res, next) => {
    await validateRequest(req, res, next);

    const userId = req.userData.userId;
    const {name, username, description, currentPassword, newPassword} = req.body;

    let user;
    try {
        user = await User.findById(userId);
    } catch (e) {
        return res.status(500).json({message: "Kon gebruiker niet ophalen, probeer het opnieuw."});
    }

    if (!await bcrypt.compare(currentPassword, user.password)) {
        return res.status(403).json({message: "Wachtwoord onjuist."});
    }

    try {
        let existingUser = !!await User.findOne({username: username});
        if (existingUser && user.username !== username) {
            return res.status(500).json({message: "Er bestaat al een gebruiker met deze gebruikersnaam."});
        } else if (user.username !== username) {
            user.username = username;
            await user.save();
        }
    } catch (e) {
        return res.status(500).json({message: "Lukte niet om te updaten."});
    }

    try {
        user.password = await bcrypt.hash(newPassword, 12);
        user.description = description;
        user.name = name;
        await user.save();
    } catch (e) {
        return res.status(500).json({message: "Lukte niet om te updaten."});
    }

    return res.status(200).json({message: "Succesvol de gebruiker geüpdate"});

};

exports.getUserInfo = getUserInfo;
exports.getUsersBySearch = getUsersBySearch;
exports.getDashboardInfo = getDashboardInfo;
exports.signup = signup;
exports.login = login;
exports.editUser = editUser;