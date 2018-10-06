const express = require('express');
const router = express.Router();
const passport = require("passport");

module.exports = function(dbHandler){
  router.get('/', function(req, res, next) {
    if (req.isAuthenticated()) {
      return res.redirect("/dashboard");
    }
    res.render('login', { title: 'Login'});
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
                  title: 'Login',errors: errors.map(error => error.msg)});
          } else {
              return res.render("login", {
                  title: 'Login',errors: ["Incorrect username or password"]});
          }
      } else {
          // must log in user
          req.logIn(user, function (err) {
              if (err) {
                  return next(err);
              }
              res.redirect(`/dashboard`);
          });
      }
  })(req, res, next)
  });
  
  router.get('/logout', function(req, res, next) {
    req.logout();
    req.session.destroy();
    res.redirect("/");
  });
  
  router.get('/rubric', function(req, res, next) {
    const user = req.user;
    if(user.first_time===0){
        return dbHandler.setUserVisited(user.id)
            .then(()=>{
                res.render("rubric",{title: "Rubric"});
            });
    }
    res.render("rubric",{title: "Rubric"});
  });
  
  router.get('/stats', function(req, res, next) {
    res.render("stats",{title: "Statistics"});
  });

  router.get('/applicant', function(req, res, next) {
      dbHandler.getNextApplicant(req.user)
        .then(row=>{
            if(row){
                return res.redirect(`/applicant/${row.asc_id}`);
            }else{
                res.redirect("/dashboard?msg=2");
            }
        })
        .catch(err=>{
            console.log("Problem getting next applicant: " , err);
            res.redirect("/dashboard");
        })
  });

  router.get('/applicant/:id', function(req, res, next) {
      // applicant must be viewable by user
      const asc_id = req.params.id;
      // TESTING ROUTE - CHANGE METHOD
      dbHandler.getApplicantByASCID(asc_id)
        .then(applicant=>{
            res.locals.applicant = applicant;
            res.render("applicant",{title:`Applicant: ${applicant.asc_id}`});
        })
        .catch(err=>{
            res.redirect("/dashboard?msg=3");
        })
  });

  

  return router;
}