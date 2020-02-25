const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const userRoutes = require('./routes/user-routes');

const app = express();

app.get('/', (req, res) => res.send('API Running'));

app.use(bodyParser.json());

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");

    next();
});

app.use("/api/user", userRoutes);

mongoose
    .connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@golfscores-97j88.azure.mongodb.net/${process.env.DB_DATABASE}?retryWrites=true&w=majority`)
    .then(() => {
        app.listen(5000, "localhost", () => {
            console.log("Running")
        });
    })
    .catch((err) => {
        console.log("Something went wrong!")
    });