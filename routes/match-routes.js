const express = require('express');
const {check} = require('express-validator');

const matchController = require('../controllers/match-controller');

const router = express.Router();

router.post("/add", [
    check('dates').isArray({min: 1}),
    check('groupId').not().isEmpty(),
    check('userId').not().isEmpty()
], matchController.addMatches);

module.exports = router;