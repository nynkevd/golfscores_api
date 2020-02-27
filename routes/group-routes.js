const express = require('express');
const {check} = require('express-validator');

const groupController = require('../controllers/group-controller');

const router = express.Router();

router.post("/create", [
    check('title').isLength({min: 5}),
    check('userId').not().isEmpty()
], groupController.createGroup);

router.post("/addplayer", [
    check('newPlayers').isArray({min: 1}),
    check('groupId').not().isEmpty(),
    check('userId').not().isEmpty()
], groupController.addPlayerToGroup);

router.post("/addadmin", [
    check('newAdminId').not().isEmpty(),
    check('groupId').not().isEmpty(),
    check('userId').not().isEmpty()
], groupController.addAdminToGroup);

router.delete('/removeplayer', [
    check('playerId').not().isEmpty(),
    check('groupId').not().isEmpty(),
    check('userId').not().isEmpty()
], groupController.removePlayer);

router.delete('/removeadmin', [
    check('adminId').not().isEmpty(),
    check('groupId').not().isEmpty(),
    check('userId').not().isEmpty()
], groupController.removeAdmin);

router.delete('/remove', [
    check('groupId').not().isEmpty(),
    check('userId').not().isEmpty()
], groupController.removeGroup);

router.patch('/edit', [
    check('groupId').not().isEmpty(),
    check('title').isLength({min: 5}),
    check('userId').not().isEmpty()
], groupController.editGroup);

module.exports = router;