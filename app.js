//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect("mongodb://localhost:27017/nickDB", {useNewUrlParser: true});

const burgerTitle = "THE TROPICAL MANGO BURGER";
const burgerDesc = "Our 1/4 pound beef patty topped with our home made Fresh Mango Salsa, Mozzarella cheese, and finished off with our home made Mango Mayo, all on a sesame bun! Only for July, only at Nick's Jr! Try one today!!";

app.get("/", function(req, res)
{
  res.render("index", {burgTitle: burgerTitle, burgDesc: burgerDesc});
});

app.get("/admin", function(req, res)
{
  res.render("admin", {burgTitle: burgerTitle, burgDesc: burgerDesc});
});

app.post("/admin", function(req, res)
{
  // TODO: update all vars in database here, redirect to home to test
});

app.listen(process.env.PORT || 3000, function()
{
  console.log("Server started!");
});
