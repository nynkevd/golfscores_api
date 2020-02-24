const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.json());

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");

    next();
});

app.use('/api/user');

mongoose
    .connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@udemy-drnvg.azure.mongodb.net/${process.env.DB_DATABASE}?retryWrites=true&w=majority`)
    .then(() => {
        app.listen(process.env.PORT || 5000);
    })
    .catch(() => {
        console.log("Something went wrong!")
    });