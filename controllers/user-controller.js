const {validationResult} = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const validateRequest = require('../helper/valid-checker');
const HttpError = require('../models/http-error');

const getUserInfo = async (req, res, next) => {
    await validateRequest(req, next);

    const userId = req.userData.userId;

    let existingUser;
    try {
        existingUser = await User.findById(userId);
    } catch (e) {
        return next(new HttpError("Informatie kan niet worden opgehaald, probeer nog een keer", 500));
    }

    if (!existingUser) {
        return next(new HttpError("Kan de gegeven gebruiker niet vinden", 404));
    }

    res.status(200).json({name: existingUser.name, username: existingUser.username});
};

const login = async (req, res, next) => {
    const {username, password} = req.body;

    let existingUser;
    try {
        existingUser = await User.findOne({username: username});
    } catch (e) {
        return next(new HttpError("Kan niet inloggen, probeer het opnieuw", 500));
    }

    if (!existingUser) {
        return next(new HttpError("Deze gebruiker bestaat niet", 403));
    }

    let isValidPassword = false;
    try {
        isValidPassword = await bcrypt.compare(password, existingUser.password);
    } catch (e) {
        return next(new HttpError("Kan niet inloggen, probeer het opnieuw", 500));
    }

    if (!isValidPassword) {
        return next(new HttpError("Deze gebruiker bestaat niet", 403));
    }

    let token;
    try {
        token = jwt.sign(
            {userId: existingUser.id, username: existingUser.username},
            process.env.JWT_KEY,
            {expiresIn: '7d'});
    } catch (e) {
        return next(new HttpError("Kan niet inloggen, probeer het opnieuw", 500));
    }

    res.json({userId: existingUser.id, username: existingUser.username, token: token});

};

const signup = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError("Kan niet aanmelden, probeer het opnieuw", 422));
    }

    const {name, username, password} = req.body;

    let existingUser;
    try {
        existingUser = await User.findOne({username: username});
    } catch (e) {
        return next(new HttpError("Kan niet aanmelden, probeer het opnieuw", 500));
    }

    if (existingUser) {
        return next(new HttpError("Er bestaat al een gebruiker met deze gebruikersnaam", 422));
    }

    let hashedPassword;
    try {
        hashedPassword = await bcrypt.hash(password, 12);
    } catch (e) {
        return next(new HttpError("Kan niet aanmelden, probeer het opnieuw", 500));
    }

    const createdUser = new User({
        name,
        username,
        password: hashedPassword,
        groups: []
    });

    try {
        await createdUser.save();
    } catch (e) {
        return next(new HttpError("Kan niet aanmelden, probeer het opnieuw", 500));
    }

    let token;
    try {
        token = jwt.sign(
            {userId: createdUser.id, username: createdUser.username},
            process.env.JWT_KEY,
            {expiresIn: '7d'});
    } catch (e) {
        return next(new HttpError("Kan niet aanmelden, probeer het opnieuw", 500));
    }

    res.status(201).json({userId: createdUser.id, username: createdUser.username, token: token});
};

const editUser = async (req, res, next) => {
    await validateRequest(req, next);

    const userId = req.userData.userId;
    const {name, username, currentPassword, newPassword} = req.body;

    let user;
    try {
        user = await User.findById(userId);
    } catch (e) {
        return next(new HttpError("Kan gebruiker niet vinden", 500));
    }

    if (!await bcrypt.compare(currentPassword, user.password)) {
        return next(new HttpError("Wachtwoord onjuist", 403));
    }

    try {
        console.log("checking username");
        let existingUser = !!await User.findOne({username: username});
        if (existingUser && user.username !== username) {
            return next(new HttpError("Er bestaat al een gebruiker met deze gebruikersnaam", 500));
        } else if (user.username !== username) {
            console.log("Changing username");
            user.username = username;
            await user.save();
        }
    } catch (e) {
        return next(new HttpError("Lukte niet om te updaten", 500));
    }

    try {
        user.password = await bcrypt.hash(newPassword, 12);
        user.name = name;
        await user.save();
    } catch (e) {
        return next(new HttpError("Lukte niet om te updaten", 500));
    }

    res.status(200).json({message: "Succesvol de gebruiker geüpdate"});

};

exports.getUserInfo = getUserInfo;
exports.signup = signup;
exports.login = login;
exports.editUser = editUser;