//jshint esversion:6
require('dotenv').config();
const express= require("express");
const bodyParser = require("body-parser");
const ejs=require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

//var md5 = require("md5");
//const bcrypt =require("bcrypt");
//const saltRounds =10;
const app= express();
app.use(express.static("public"));
app.set("view engine",'ejs');
app.use(bodyParser.urlencoded({extended:true}));

// SESSION code will be put here ,its important to put it here only.

app.use(session({
    secret:"Our little secret.",
    resave:false,
    saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/UserDB",{useNewUrlParser:true});
//mongoose.set("useCreateIndex",true);


const userSchema = new mongoose.Schema({
    email:{type:String},
    password:{type:String},
    googleId:{type:String},
    secret:{type:String}
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User",userSchema);
//Here we add passport-local-mongoose code.
passport.use(User.createStrategy());

//passport.serializeUser(User.serializeUser());
//passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
   userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",function(req,res){
    res.render("home");
});

app.get("/auth/google",function(req,res){
    passport.authenticate("google",{scope:["profile"]});
});

app.get("/auth/google/secrets" ,
  passport.authenticate("google", { failureRedirect: "/login"}),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect("/secrets");
  });
app.get("/login",function(req,res){
    res.render("login");
});
app.get("/logout",function(req,res){
    req.logout(function(){
    res.redirect("/");});
});

app.get("/register",function(req,res){
    res.render("register");
});
app.get("/secrets",function(req,res){
User.find({"secret":{$ne:null}}).then(function(foundUser){
   
        if(foundUser){
            res.render("secrets",{userWithSecrets:foundUser});
        }
    
});
});

app.get("/submit",function(req,res){
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("/login");
    }
});
app.post("/submit",function(req,res){
    const submittedSecret = req.body.secret;
User.findById(req.user.id).then(function(foundUser){

    if(foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save().then(function(){
            res.redirect("/secrets");
        });
    }

});
});

app.post("/register",function(req,res){
  
   User.register({username:req.body.username},req.body.password,function(err,user){
    if(err){
        console.log(err);
        res.redirect("/register");
    }else{
        passport.authenticate("local")(req,res,function(){
            res.redirect("/secrets");
        });
    }
   });


   /* bcrypt.hash(req.body.password, 10, function(err, hash) {
        const newUser = new User({
            email:req.body.username,
            password:hash
        });
        newUser.save().then(function(){
            res.render("secrets")
        });


    });*/
   
});

app.post("/login",function(req,res){
    const user = new User({
     username:req.body.username,
     password:req.body.password
    });
    req.login(user,function(err){
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            });
        }
    });
});


app.listen(3000,()=>{console.log("Server is running on port 3000.")});

