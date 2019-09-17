//jshint esversion:6

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const jimp = require("jimp");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const path = require("path");
const fs = require("fs");

// Set storage engine

const imgStoragePath = "./public/images/";

const storage = multer.diskStorage(
{
  destination: imgStoragePath,
  filename: function(req, file, callback)
  {
    callback(null, "_item-month-image" + "-" + Date.now() + path.extname(file.originalname)); //change to be modifible per section
  }
});

//Init upload
const upload = multer(
{
  storage: storage,
  limits: {fileSize: 5000000}, //5mb max
  fileFilter: function(req, file, cb)
  {
    checkFileType(req, file, cb);
  }
}).single("itemMonthImage");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session(
{
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

//Check file type
function checkFileType(req, file, cb)
{
  // Allowed extenstions
  const fileTypes = /jpeg|jpg|png/;
  const extName = fileTypes.test(
    path.extname(file.originalname).toLowerCase());

  //Check mime type
  const mimeType = fileTypes.test(file.mimetype);

  if(extName && mimeType)
  {
    return cb(null, true);
  }
  else
  {
    req.fileValidError = "Error: Allowed file types are: jpeg, jpg and png!";
    cb(null, false, new Error("Error: Allowed file types are: jpeg, jpg and png!"));
  }
}

mongoose.connect("mongodb://localhost:27017/nickDB", {useNewUrlParser: true});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema(
{
  username: String,
  password: String
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const articleSchema = new mongoose.Schema({
  id: String,
  title: String,
  content: String,
  img: String
});

const Article = mongoose.model("Article", articleSchema);

let burgerTitle = "";
let burgerDesc = "";
let burgerImg = "";

async function initArticles(req, res, next)
{
  await setItemMonthArticle();

  next();
}

/* Sets up the local vars by pulling from the database */
async function setItemMonthArticle ()
{
  await Article.findOne({id: "item-month"}, function(err, article)
  {
    if(err)
      console.log(err);
    else
    {
      if(article) // Article exists
      {
        burgerTitle = article.title;
        burgerDesc = article.content;
        burgerImg = article.img;

        console.log("Title: " + burgerTitle + " Content: " + burgerDesc + " Img: " + burgerImg);
      }
      else
      {
        const itemMonthArticle = new Article({
          id: "item-month",
          title: burgerTitle,
          content: burgerDesc,
          img: burgerImg
        });

        console.log("Title: " + burgerTitle + " Content: " + burgerDesc + " Img: " + burgerImg);

        itemMonthArticle.save();
      }
    }
  });
}

async function resizeImg(imgPath)
{
  await jimp.read(imgPath)
    .then(img => {
      return img
        .resize(500, 500) // resize
        .write(imgPath); // save
    })
    .catch(err => {
      console.error(err);
    });
}

async function updateItemMonthArticle(req, res)
{
  console.log("Called Update");
  console.log("In update: " + burgerImg);

  const localImg = burgerImg; // Here because burgerImg was getting randomly deleted 50% of the time (I don't even know)

  if(req.method == "POST")
  {
    console.log("Local: " + localImg + " Global: " + burgerImg);

    await resizeImg("./public" + localImg);

    await Article.findOne({id: "item-month"}, function(err, article)
    {
      console.log("Local: " + localImg + " Global: " + burgerImg);
      if(article)
      {
        console.log("Update Found Article");
        console.log("Local: " + localImg + " Global: " + burgerImg);

        console.log("Title: " + burgerTitle + " Content: " + burgerDesc + " Img: " + localImg);

        Article.updateOne(
          {id: "item-month"},
          {title: burgerTitle, content: burgerDesc, img: localImg},
          function(err, results)
          {
            if(err)
              console.log(err);
          }
        )

        console.log("Title: " + burgerTitle + " Content: " + burgerDesc + " Img: " + localImg);
      }
      else
      {
        const itemMonthArticle = new Article({
          id: "item-month",
          title: burgerTitle,
          content: burgerDesc,
          img: localImg
        });

        console.log("Title: " + burgerTitle + " Content: " + burgerDesc + " Img: " + localImg);

        itemMonthArticle.save();
      }
    });
  }

  setItemMonthArticle(); // Update to new values
}

app.get("/", initArticles, function(req, res)
{
  res.render("index", {burgImg: burgerImg, burgTitle: burgerTitle, burgDesc: burgerDesc});
});

app.route("/login")

.get(function(req, res)
{
  res.render("login");
})

.post(passport.authenticate("local", { failureRedirect: "/login" }), function(req, res, next)
{
  res.redirect("/admin");
});

app.route("/logout")

.post(function(req, res)
{
  req.logout();
  res.redirect("/login");
});

app.route("/admin")

.get(initArticles, function(req, res)
{
  if(req.isAuthenticated())
    res.render("admin", {burgTitle: burgerTitle, burgDesc: burgerDesc, burgImg: burgerImg});
  else
    res.redirect("/login");
})

.post(function(req, res)
{
  console.log("Post start: " + burgerImg);

  upload(req, res, function(err)
  {
    console.log("Upload start: " + burgerImg);

    if(err)
    {
      res.send(err);
    }
    else
    {
      burgerTitle = req.body.burgerTitle;
      burgerDesc = req.body.burgerDesc;

      if(burgerImg === "")
      {
        Article.findOne({id: "item-month"}, function(err, article)
        {
          if(err)
            console.log(err);
          else
          {
            if(article)
            {
              burgerImg = article.img;
            }
          }
        });
      }

      if(req.fileValidError != undefined)
      {
        res.render("admin",
        {
          msg: req.fileValidError,
          burgTitle: burgerTitle,
          burgDesc: burgerDesc,
          burgImg: burgerImg
        });
      }
      else
      {
        if(req.file == undefined)
        {
          res.render("admin",
          {
            msg: "Success! Section updated!",
            burgTitle: burgerTitle,
            burgDesc: burgerDesc,
            burgImg: burgerImg
          });
        }
        else
        {
          console.log("Prev Image: " + burgerImg);

          if(burgerImg != "")
          {
            // Delete previous image file
            fs.readdir(imgStoragePath, function(err, files)
            {
              if(err)
                console.log(err);
              else
              {
                files.forEach(function(file)
                {
                  console.log("In foreach: " + file);

                  /*
                    Find image that has the correct name but not correct timestamp
                  */
                  if(file != burgerImg.substring(8) && file.includes("_item-month-image"))
                  {
                    // TODO: Make images have only the name, append path later (will remove substrings)
                    console.log(file);
                    console.log("String: " + burgerImg.substring(8));
                    console.log(path.join(imgStoragePath, file));

                    fs.unlink(path.join(imgStoragePath, file), function(err)
                    {
                      if(err)
                        console.log(err);
                      else
                        console.log("Success!");
                    });
                  }
                });
              }
            });
          }
          else
          {
            console.log("Burger image was empty!: " + burgerImg);
          }

          burgerImg = req.file.path.substring(6); // set burgerImg as the file path to image
          console.log("In post: " + burgerImg);

          resizeImg("./public" + burgerImg).then(() =>
          {
            res.render("admin",
            {
              msg: "Success! Section updated!",
              burgTitle: burgerTitle,
              burgDesc: burgerDesc,
              burgImg: burgerImg
            });
          });
        }
      }

      console.log("Img before Send: " + burgerImg);
      updateItemMonthArticle(req, res);
    }
  });
});

app.listen(process.env.PORT || 3000, function()
{
  console.log("Server started!");
});
