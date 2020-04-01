const {validationResult} = require('express-validator');

const jwt = require('jsonwebtoken');
const HttpError = require('../models/http-error');

const validateRequest = async (req, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError("Invalid inputs", 422));
    }

    try {
        const token = await req.headers['x-auth-token'];
        if (!token) {
            return next(new HttpError("There is no token provided", 401))
        }
        const decodedToken = jwt.verify(token, process.env.JWT_KEY);
        req.userData = {userId: decodedToken.userId};
    } catch (e) {
        return next(new HttpError("Authentication failed", 401));
    }

};

module.exports = validateRequest;
