const express = require('express');
const router = express.Router();

module.exports = function (dbHandler) {
  router.get('/', function (req, res, next) {
    dbHandler.getNextApplicant(req.user)
      .then(asc_id => {
        if (asc_id) {
          return res.redirect(`/applicant/${asc_id}`);
        } else {
          req.session.msg = {
            error: "There are no more applicants available for you to read"
          };
          res.redirect("/dashboard");
        }
      })
      .catch(err => {
        console.log("Problem getting next applicant: ", err);
        req.session.msg = {
          error: "There was a problem retrieving the next applicant. Please try again later."
        };
        res.redirect("/dashboard");
      })
  });

  router.get('/:id', function (req, res, next) {
    const asc_id = req.params.id;
    dbHandler.findIncompleteApplicant(req.user.id)
      .then(proper_asc_id => {
        if (proper_asc_id !== asc_id) {
          req.session.msg = {
            error: `Unauthorized attempt to access applicant ${asc_id}`
          };
          return res.redirect("/dashboard");
        }
        dbHandler.getApplicantByASCID(asc_id)
          .then(applicant => {
            res.locals.applicant = applicant;
            res.render("applicant", {
              title: `Applicant: ${applicant.asc_id}`
            });
          })
          .catch(err => {
            console.log("Problem getting applicant by ASCID: ", err);
            req.session.msg = {
              error: "Cannot access that applicant"
            };
            res.redirect("/dashboard");
          })
      })
  });

  router.post('/:id', function (req, res, next) {
    const asc_id = req.params.id;
    const user = req.user;
    const userId = user.id;

    dbHandler.getApplicantByASCID(asc_id)
      .then(applicant => {
        // validate score
        req.checkBody("essay_1_score", "Short Answer #1 score required").notEmpty();
        req.checkBody("essay_1_score", "Short Answer #1 score must be 0, 1, or 2").isInt({
          min: 0,
          max: 2
        });
        req.checkBody("essay_2_score", "Short Answer #2 score required").notEmpty();
        req.checkBody("essay_2_score", "Short Answer #2 score must be 0, 1, or 2").isInt({
          min: 0,
          max: 2
        });
        req.checkBody("essay_3_score", "Short Answer #3 score required").notEmpty();
        req.checkBody("essay_3_score", "Short Answer #3 score must be 0, 1, or 2").isInt({
          min: 0,
          max: 2
        });

        const errors = req.validationErrors();
        res.locals.applicant = applicant;
        if (errors) {
          req.session.msg = {
            error: errors[0].msg
          };
          return res.redirect(`/applicant/${asc_id}`);
        }

        const scores = {
          essay_score_1: Number(req.body.essay_1_score),
          essay_score_2: Number(req.body.essay_2_score),
          essay_score_3: Number(req.body.essay_3_score)
        }

        const comment = req.body.comment;

        dbHandler.incrementApplicantReads(userId, asc_id, scores, comment)
          .then(() => {
            dbHandler.checkUserDoneness(user)
              .then(result => {
                if (result) {
                  req.session.msg = {
                    success: `Completed Applicant ${asc_id} as your last applicant! Please give feedback on how we can improve the Readathon reader experience`
                  };
                } else {
                  req.session.msg = {
                    success: `Completed Applicant ${asc_id}!`
                  };
                }
                res.redirect("/dashboard");
              })
              .catch(err => {
                console.log("Problem checking user applicant availibility: ", err);
                req.session.msg.error = `Problem checking on user applicant availibility`;
                res.redirect("/dashboard");
              })
          })
          .catch(err => {
            console.log(`Problem incrementing applicant reads (user: ${userId}, asc_id: ${asc_id})`, err);
            req.session.msg = {
              error: `Applicant ${asc_id} not properly updated`
            };
            res.redirect("/dashboard");
          })
      })
      .catch(err => {
        console.log(`Problem posting applicant read (user: ${userId}, asc_id: ${asc_id}): `, err);
        req.session.msg = {
          error: `Could not complete applicant ${asc_id}`
        };
        res.redirect("/dashboard");
      })
  })

  return router;
}