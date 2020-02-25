const express = require('express');
const {check} = require('express-validator');

const userController = require('../controllers/user-controller');

const router = express.Router();

router.post("/signup", [
    check('name').not().isEmpty(),
    check('username').isLength({min: 5}),
    check('password').isLength({min: 6})
], userController.signup);

router.post("/login", [
    check('username').isLength({min: 5}),
    check('password').isLength({min: 6})
], userController.login);

module.exports = router;