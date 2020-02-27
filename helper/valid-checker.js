const {validationResult} = require('express-validator');

const jwt = require('jsonwebtoken');
const HttpError = require('../models/http-error');

const validateRequest = async (req, next) => {
    console.log("validation");
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError("Invalid inputs", 422));
    }

    if (!req.headers.userdata) {
        return next(new HttpError("There is no token provided", 401))
    }
    const token = (JSON.parse(req.headers.userdata))["Bearer Token"];
    try {
        jwt.verify(token, process.env.JWT_KEY);
    } catch (err) {
        return next(new HttpError("The provided token is not valid", 401))
    }

};

module.exports = validateRequest;
