const express = require('express');
const {check} = require('express-validator');

const groupController = require('../controllers/group-controller');

const router = express.Router();

router.post("/create", [
    check('title').not().isEmpty()
], groupController.createGroup);

// router.post("/login", [
//     check('username').isLength({min: 5}),
//     check('password').isLength({min: 6})
// ], groupController.login);

module.exports = router;