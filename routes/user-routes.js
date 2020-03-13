const express = require('express');
const {check} = require('express-validator');

const userController = require('../controllers/user-controller');

const router = express.Router();

router.get("/userinfo/:id", [], userController.getUserInfo);

router.post("/signup", [
    check('name').not().isEmpty(),
    check('username').isLength({min: 5}),
    check('password').isLength({min: 6})
], userController.signup);

router.post("/login", [
    check('username').isLength({min: 5}),
    check('password').isLength({min: 6})
], userController.login);

router.patch("/edit", [
    check('name').not().isEmpty(),
    check('username').isLength({min: 5}),
    check('currentPassword').not().isEmpty(),
    check('newPassword').isLength({min: 6})
], userController.editUser);

module.exports = router;