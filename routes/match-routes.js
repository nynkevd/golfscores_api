const express = require('express');
const {check} = require('express-validator');

const matchController = require('../controllers/match-controller');

const router = express.Router();

router.post("/add", [
    check('dates').isArray({min: 1}),
    check('groupId').not().isEmpty(),
    check('userId').not().isEmpty()
], matchController.addMatches);

router.delete("/remove", [
    check('matchId').not().isEmpty(),
    check('groupId').not().isEmpty(),
    check('userId').not().isEmpty(),
], matchController.deleteMatch);

module.exports = router;