const {validationResult} = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const HttpError = require('../models/http-error');

const login = async (req, res, next) => {
    const {username, password} = req.body;

    let existingUser;
    try {
        existingUser = await User.findOne({username: username});
    } catch (e) {
        return next(new HttpError("Could not perform call", 500));
    }

    if (!existingUser) {
        return next(new HttpError("Invalid Credentials", 403));
    }

    let isValidPassword = false;
    try {
        isValidPassword = await bcrypt.compare(password, existingUser.password);
    } catch (e) {
        return next(new HttpError("Cannot log in, try again", 500));
    }

    if (!isValidPassword) {
        return next(new HttpError("Invalid Credentials", 403));
    }

    let token;
    try {
        token = jwt.sign(
            {userId: existingUser.id, username: existingUser.username},
            process.env.JWT_KEY,
            {expiresIn: '7d'});
    } catch (err) {
        return next(new HttpError("Logging in failed", 500));
    }

    res.json({userId: existingUser.id, username: existingUser.username, token: token});

};

const signup = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError("Invalid inputs", 422));
    }

    const {name, username, password} = req.body;

    let existingUser;
    try {
        existingUser = await User.findOne({username: username});
    } catch (e) {
        return next(new HttpError("Could not create user, please try again", 500));
    }

    if (existingUser) {
        return next(new HttpError("This user already exists, please choose a different username", 422));
    }

    let hashedPassword;
    try {
        hashedPassword = await bcrypt.hash(password, 12);
    } catch (e) {
        return next(new HttpError("Could not create user, please try again", 500));
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
        return next(new HttpError("Could not create user, please try again", 500));
    }

    let token;
    try {
        token = jwt.sign(
            {userId: createdUser.id, username: createdUser.username},
            process.env.JWT_KEY,
            {expiresIn: '10s'});
    } catch (err) {
        return next(new HttpError("Signing up failed", 500));
    }

    res.status(201).json({userId: createdUser.id, username: createdUser.username, token: token});
};

exports.signup = signup;
exports.login = login;