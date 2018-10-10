const express = require('express');
const router = express.Router();
const passport = require("passport");

var months = [
    'January', 'February', 'March', 'April', 'May',
    'June', 'July', 'August', 'September',
    'October', 'November', 'December'
    ];
  
  function monthNumToName(monthnum) {
    return months[Number(monthnum)];
  }
  function monthNameToNum(monthname) {
    return months.indexOf(monthname);
  }

  const applicantScoreParser = data => {  
    const scoreCounts = {"0":0,"1":0,"2":0}
    const arr = Array.from(data.userApplicants);
    arr.forEach(item=>{
        scoreCounts[item.essay_score_1] ++;
        scoreCounts[item.essay_score_2] ++;
        scoreCounts[item.essay_score_3] ++;
    })

    arr.sort((a,b)=>{
        return a.essay_score - b.essay_score;
    })
    const labels = [];
    const values = [];
    arr.forEach(item=>{
        labels.push(item.asc_id);
        values.push(item.essay_score);
    })

    const scoresByEssay = {
        "Question #1": {
            "0":0,
            "1":0,
            "2":0
        },
        "Question #2": {
            "0":0,
            "1":0,
            "2":0
        },
        "Question #3": {
            "0":0,
            "1":0,
            "2":0
        }
    }

    arr.forEach(item=>{
        scoresByEssay["Question #1"][item.essay_score_1] ++;
        scoresByEssay["Question #2"][item.essay_score_2] ++;
        scoresByEssay["Question #3"][item.essay_score_3] ++;
    })

    return {
      scoreCounts: scoreCounts,
      scoreTotals: {
        labels: labels,
        values: values
      },
      scoresByEssay: scoresByEssay
    }
  }
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
  
  const emptyDataHandler = function(res){
    res.locals.data = null;
    return res.render("stats",{title: "Statistics"});
  }

  router.get('/stats', function(req, res, next) {
    res.locals.user = req.user;
    dbHandler.getUserStats(req.user.id)
        .then(data=>{
            console.log(data);
            if(data.userApplicants.length===0){
                emptyDataHandler();
            }
            if(!data.userApplicants.essay_score){
                emptyDataHandler();
            }
            res.locals.data = data;
            const parsedUserScores = applicantScoreParser(data);
            res.locals.dataForGraph_scoreTotals = JSON.stringify({
                labels: parsedUserScores.scoreTotals.labels,
                datasets: [{
                  label:"Score given",
                  backgroundColor: "#51C1E9",
                  borderColor: "blue",
                  borderWidth: 1,
                  data:parsedUserScores.scoreTotals.values
                }]
              })
            const scoresByEssay = parsedUserScores.scoresByEssay;
            res.locals.dataForGraph_scoresByEssay = JSON.stringify({
                labels: Object.keys(scoresByEssay),
                datasets: [{
                  label:"Score of 0",
                  backgroundColor: "#A285dc",
                  borderColor: "purple",
                  borderWidth: 1,
                  stack:"stack0",
                  data:Object.keys(scoresByEssay).map(key=>scoresByEssay[key]["0"])
                },
                {
                  label:"Score of 1",
                  backgroundColor: "#9dd052",
                  borderColor: "green",
                  borderWidth: 1,
                  stack:"stack1",
                  data:Object.keys(scoresByEssay).map(key=>scoresByEssay[key]["1"])
                },
                {
                  label:"Score of 2",
                  backgroundColor: "#Ebab24",
                  borderColor: "#FF8800",
                  borderWidth: 1,
                  stack:"stack2",
                  data:Object.keys(scoresByEssay).map(key=>scoresByEssay[key]["2"])
                }
            ]
              })
            res.render("stats",{title: "Statistics"});
        })
        .catch(err=>{
            console.log("Problem getting user scores: ",err);
            req.session.msg = {error:"Problem getting user stats"};
            res.redirect("/dashboard");
          })
  });

  router.get('/profile', function(req, res, next) {
    req.user.month = req.user.month_access ? monthNumToName(req.user.month_access): "💎";
    if(req.session.msg){
        res.locals.msg = req.session.msg;
        req.session.msg = null;
      }
    res.render("profile", {title: `${req.user.name}'s Profile`});
  });

  router.post('/profile', function(req, res, next) {
    req.checkBody("oldPassword", "Old Password is required").notEmpty();
    req.checkBody("newPassword", "New Password is required").notEmpty();
    req.checkBody("newPassword", "New Password should be more than 3 characters").isLength({min:4});
    req.checkBody("newPassword2", "New Password confirmation is required").notEmpty();
    req.checkBody("newPassword2", "Password Confirmation did not match").equals(req.body.newPassword);

    const errors = req.validationErrors();
    if (errors) {
      req.session.msg = {error:errors[0].msg};
      return res.redirect("/profile");
    }else{
        dbHandler.changeUserPassword(req.user, req.body.oldPassword, req.body.newPassword)
            .then(result=>{
                if(result.error){
                    req.session.msg = {error:result.error};
                }else{
                    req.session.msg = {success:"Password Updated! 😄"};
                }
                res.redirect("/profile");
            })
            .catch(err=>{
                console.log("Problem updating user password: ", err);
                req.session.msg = {error:"Could not update password"};
                res.redirect("/profile");                
            });
    }  
  });

  return router;
}