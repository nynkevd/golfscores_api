const {validationResult} = require('express-validator');

const jwt = require('jsonwebtoken');

const validateRequest = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(422).json({message: "Ongeldige Body."});
    }

    try {
        const token = await req.headers['x-auth-token'];
        if (!token) {
            res.status(401).json({message: "Geen token meegegeven."});
        }
        const decodedToken = jwt.verify(token, process.env.JWT_KEY);
        req.userData = {userId: decodedToken.userId};
    } catch (e) {
        res.status(401).json({message: "Geen geldig account."});
    }

};

module.exports = validateRequest;
