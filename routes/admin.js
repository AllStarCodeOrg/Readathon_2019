const express = require('express');
const router = express.Router();

/**
 * Return name of month converted from number (0-11).
 */
function monthNumToName(monthnum) {
  const months = [
    'January', 'February', 'March', 'April', 'May',
    'June', 'July', 'August', 'September',
    'October', 'November', 'December'
  ];
  return months[Number(monthnum)];
}

/**
 * Returns array of standard deviations from each
 */
const calcStds = function (avg, std_dev, avgArr) {
  return avgArr.map(userAvg => (avg - userAvg) / std_dev);
}

/**
 * Returns the bell curve percentile based on z-score.
 */
function GetZPercent(z) {

  // z == number of standard deviations from the mean

  // if z is greater than 6.5 standard deviations from the mean the
  // number of significant digits will be outside of a reasonable range

  if (z < -6.5) {
    return 0.0;
  }

  if (z > 6.5) {
    return 1.0;
  }

  var factK = 1;
  var sum = 0;
  var term = 1;
  var k = 0;
  var loopStop = Math.exp(-23);

  while (Math.abs(term) > loopStop) {
    term = .3989422804 * Math.pow(-1, k) * Math.pow(z, k) / (2 * k + 1) / Math.pow(2, k) * Math.pow(z, k + 1) / factK;
    sum += term;
    k++;
    factK *= k;
  }

  sum += 0.5;

  return sum;
}

const adminError = function (res, err) {
  res.locals.msg = {
    error: err
  };
  res.render("admin", {
    title: "Admin"
  });
}
const clean = str => {
  return str.trim().toLowerCase();
}
module.exports = function (dbHandler) {

  router.get('/', function (req, res, next) {
    dbHandler.getUsers()
      .then(users => {
        // getting human readable month names
        Array.from(users).forEach(user => {
          if (user.month_access) {
            user.monthName = monthNumToName(user.month_access);
          } else {
            user.monthName = "💎";
          }
        });
        res.locals.users = users;
        res.render('admin', {
          title: 'Admin'
        });
      })
      .catch(err => {
        res.render("admin", {
          title: "Admin",
          error: err
        });
      })
  });

  router.get('/user', function (req, res, next) {
    const readathonUser = {
      name: "",
      email: "",
      password: "",
      admin: 0,
      alumni: 0,
      month_access: null
    }
    res.locals.readathonUser = readathonUser;
    res.render("editUser", {
      title: "Add New User"
    });
  })

  router.post('/user', function (req, res, next) {
    req.checkBody("password", "Password is required").notEmpty();
    req.checkBody("email", "Email is required").notEmpty();
    req.checkBody("email", "Valid email is required").isEmail();

    const errors = req.validationErrors();
    const name = req.body.name;
    if (errors) {
      return res.render("editUser", {
        title: "Add New User",
        readathonUser: {
          name: name
        },
        msg: {
          error: errors[0].msg
        }
      });
    } else {
      dbHandler.addNewUser({
          name: req.body.name,
          email: clean(req.body.email),
          password: req.body.password,
          admin: req.body.admin === "on" ? 1 : 0,
          alumni: req.body.alumni === "on" ? 1 : 0,
          month_access: req.body.month_access === "99" ? null : req.body.month_access
        })
        .then(userId => {
          req.session.msg = {
            success: `${name}'s account was successfully created!`
          };
          return res.redirect(`/admin/user`);
        })
        .catch(err => adminError(res, "Problem Creating New User"));
    }
  });

  router.get('/user/:id', function (req, res, next) {
    const id = req.params.id;

    dbHandler.findUser(id)
      .then(readathonUser => {
        if (!readathonUser) return adminError(res, `Could not find user with id=${id}`);
        res.locals.readathonUser = readathonUser;

        res.render("editUser", {
          title: "Edit User"
        });
      })
      .catch(err => {
        console.log(err);
        adminError(res, "Could not find user");
      })
  });

  router.post('/user/:id', function (req, res, next) {
    const id = Number(req.params.id);
    dbHandler.findUser(id)
      .then(readathonUser => {
        res.locals.readathonUser = readathonUser;
        req.checkBody("email", "Email is required").notEmpty();
        req.checkBody("email", "Valid email is required").isEmail();

        const errors = req.validationErrors();

        if (errors) {
          return res.render("editUser", {
            title: "Edit User",
            msg: {
              error: errors[0].msg
            }
          });
        }

        if (id === 1) {
          if (id === req.user.id) {
            return next();
          } else {
            res.locals.msg = {
              special: `${req.user.name}... I made this entire website... did you really think you could alter my account?`
            };
            return res.render("admin", {
              title: "Admin"
            });
          }
        } else if (readathonUser.admin === 1) {
          if (id === req.user.id || req.user.id === 1) {
            return next();
          } else {
            return adminError(res, "You cannot edit other admin accounts, only your own");
          }
        } else {
          return next();
        }
      })
      .catch(err => adminError(res, err));
  }, (req, res, next) => {
    const id = req.params.id;
    const values = {
      id: id,
      name: req.body.name,
      email: req.body.email,
      password: req.body.password.length === 0 ? undefined : req.body.password,
      admin: req.body.admin === "on" ? 1 : 0,
      alumni: req.body.alumni === "on" ? 1 : 0,
      month_access: req.body.month_access === "99" ? null : req.body.month_access
    }
    dbHandler.updateUser(values)
      .then(readathonUser => {
        res.locals.readathonUser = readathonUser;
        res.render("editUser", {
          title: "Edit User",
          msg: {
            success: "User Updated Successfully"
          }
        });
      })
      .catch(err => adminError(res, err));
  })

  router.get("/readScores", function (req, res) {
    dbHandler.getReadScoresWithUsers()
      .then(readScoresWithUsers => {
        res.locals.readScores = readScoresWithUsers;
        res.render("readScores", {
          title: "Read Scores"
        });
      })
  });

  router.get("/userStats", function (req, res) {
    dbHandler.getUserStats_admin()
      .then(output => {
        const {
          userStats,
          stats,
          avg
        } = output;
        const std_devs = calcStds(stats.avg, stats.sample_std, userStats.map(userStat => userStat.essay_score_avg));
        for (let i = 0; i < std_devs.length; i++) {
          userStats[i].perc = (50 - GetZPercent(std_devs[i]).toFixed(4) * 100).toFixed(2);
        }
        res.locals.userStats = userStats;
        res.locals.avg = avg;
        res.render("userStats", {
          title: "User Stats"
        });
      })
  });


  router.get("/applicants", function (req, res) {
    dbHandler.getApplicantsStats()
      .then(applicants => {
        for (const applicant of applicants) {
          applicant.month_applied_str = monthNumToName(applicant.month_applied);
        }
        res.locals.applicants = applicants;
        res.render("admin_applicants.ejs", {
          title: "Applicants"
        });
      })
      .catch(err => adminError(res, "Problem loading Applicants"));
  });

  router.get("/applicant/:id", function (req, res) {
    const asc_id = req.params.id;
    dbHandler.getApplicantByASCID(asc_id)
      .then(applicant => {
        dbHandler.getApplicantUsers(asc_id)
          .then(applicantUsers=>{
            res.locals.applicant      = applicant;
            res.locals.applicantUsers = applicantUsers;
            res.render("admin_applicant.ejs", {
              title: `Applicant ${asc_id}`
            });
          })
          .catch(err => adminError(res, "Problem loading Applicant Users"))
      })
      .catch(err => adminError(res, "Problem loading Applicant"))
  });
  return router;
}