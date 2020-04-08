const express = require('express');
const {check} = require('express-validator');

const inviteController = require('../controllers/invite-controller');

const router = express.Router();

router.get("/inviteinfo/:inviteId", [], inviteController.getInviteInfo);

router.patch("/accept/:inviteId", [], inviteController.acceptInvite);
router.patch("/decline/:inviteId", [], inviteController.declineInvite);

module.exports = router;