const express = require('express');
const {check} = require('express-validator');

const groupController = require('../controllers/group-controller');

const router = express.Router();

router.post("/create", [
    check('title').not().isEmpty(),
    check('creator').not().isEmpty()
], groupController.createGroup);

router.post("/addplayer", [
    check('newPlayers').isArray({min: 1}),
    check('group').not().isEmpty(),
    check('user').not().isEmpty()
], groupController.addPlayerToGroup);

router.post("/addadmin", [
    check('newAdmins').isArray({min: 1}),
    check('group').not().isEmpty(),
    check('user').not().isEmpty()
], groupController.addAdminToGroup);

// router.post("/login", [
//     check('username').isLength({min: 5}),
//     check('password').isLength({min: 6})
// ], groupController.login);

module.exports = router;