const {validationResult} = require('express-validator');

const jwt = require('jsonwebtoken');
const HttpError = require('../models/http-error');

const validateRequest = async (req, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError("Invalid inputs", 422));
    }

    console.log(req.headers);
    // console.log(req.headers.authorization.split(' ')[1]);

    try {
        const token = await req.headers['x-auth-token'];
        // console.log(token);
        if (!token) {
            return next(new HttpError("There is no token provided", 401))
        }
        const decodedToken = jwt.verify(token, process.env.JWT_KEY);
        req.userData = {userId: decodedToken.userId};
    } catch (e) {
        console.log("error");
        // console.log(req.headers.authorization.split(' ')[1]);
        return next(new HttpError("Authentication failed", 401));
    }

};

module.exports = validateRequest;
