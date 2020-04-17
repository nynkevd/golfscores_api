const express = require('express');
const {check} = require('express-validator');

const matchController = require('../controllers/match-controller');

const router = express.Router();

router.get("/matchinfo/:matchId", [], matchController.getMatchInfo);

router.post("/add", [
    check('dates').isArray({min: 1}),
    check('groupId').not().isEmpty()
], matchController.addMatches);

router.delete("/remove", [
    check('matchId').not().isEmpty(),
    check('groupId').not().isEmpty()
], matchController.deleteMatch);

router.post("/enterMatchResults", [
    check('scores').not().isEmpty(),
    check('groupId').not().isEmpty(),
    check('matchId').not().isEmpty()
], matchController.enterMatchResults);

module.exports = router;