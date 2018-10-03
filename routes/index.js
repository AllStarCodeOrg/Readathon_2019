const express = require('express');
const router = express.Router();
const bcrypt = require("bcrypt");
const saltRounds = 10;
const passport = require("passport");

const getMonthStr = function(){
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return date.toLocaleString("en-us", { month: "long" });
}

module.exports = function(dbHandler){
  router.get('/', function(req, res, next) {
    if (req.isAuthenticated()) {
      return res.redirect("/users");
    }
    res.render('login', { title: 'Login', monthStr:  getMonthStr()});
  });

  router.post('/', function(req, res, next) {
    passport.authenticate("local", (err, userObj, info) => {
      if (err) return next(err);
      
      const user = userObj.user;
      if (!user) {
          req.checkBody("email", "Email is required").notEmpty();
          req.checkBody("email", "Valid email is required").isEmail();
          req.checkBody("password", "Password is required").notEmpty();

          const errors = req.validationErrors();
          if (errors) {
              return res.render("login", {
                  title: 'Login',
                  errors: errors.map(error => error.msg),
                  monthStr:  getMonthStr()
              });
          } else {
              return res.render("login", {
                  title: 'Login',
                  errors: ["Incorrect username or password"],
                  monthStr:  getMonthStr()
              });
          }
      } else {
          // must log in user
          req.logIn(user, function (err) {
              if (err) {
                  return next(err);
              }
              res.redirect(`/user/${clean(user.username)}`);
          });
      }
  })(req, res, next)
    // return res.redirect("/users");
  });
  
  router.get('/logout', function(req, res, next) {
    req.logout();
    req.session.destroy();
    res.redirect("/");
  });

  
  return router;
}