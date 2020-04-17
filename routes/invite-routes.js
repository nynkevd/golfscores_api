const express = require('express');
const {check} = require('express-validator');

const inviteController = require('../controllers/invite-controller');

const router = express.Router();

router.get("/inviteinfo/:inviteId", [], inviteController.getInviteInfo);

router.post("/invitebyusername", [
    check('username').not().isEmpty(),
    check('groupId').not().isEmpty()
], inviteController.inviteByUsername);

router.patch("/accept/:inviteId", [], inviteController.acceptInvite);
router.patch("/decline/:inviteId", [], inviteController.declineInvite);
router.patch("/delete/:inviteId", [], inviteController.deleteInvite);

module.exports = router;