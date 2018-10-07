const express = require('express');
const router = express.Router();

module.exports = function (dbHandler) {

  router.get('/', function (req, res, next) {
    dbHandler.getNextApplicant(req.user)
      .then(asc_id => {
        if (asc_id) {
          return res.redirect(`/applicant/${asc_id}`);
        } else {
          req.session.msg = {error: "There are no more applicants available for you to read"};
          res.redirect("/dashboard");
        }
      })
      .catch(err => {
        console.log("Problem getting next applicant: ", err);
        req.session.msg = {error: "There was a problem retrieving the next applicant. Please try again later."};
        res.redirect("/dashboard");
      })
  });

  router.get('/:id', function (req, res, next) {
    const asc_id = req.params.id;
    dbHandler.getApplicantByASCID(asc_id)
      .then(applicant => {
        res.locals.applicant = applicant;
        res.render("applicant", {
          title: `Applicant: ${applicant.asc_id}`
        });
      })
      .catch(err => {
        req.session.msg = {error: "Cannot access that applicant"};
        res.redirect("/dashboard");
      })
  });

  router.post('/:id', function (req, res, next) {
    const asc_id = req.params.id;
    const userId = req.user.id;

    dbHandler.getApplicantByASCID(asc_id)
      .then(applicant => {
        // validate score
        req.checkBody("essay_1_score", "Short Answer #1 score required").notEmpty();
        req.checkBody("essay_1_score", "Short Answer #1 score must be 0, 1, or 2").isInt({ min: 0, max: 2 });
        req.checkBody("essay_2_score", "Short Answer #2 score required").notEmpty();
        req.checkBody("essay_2_score", "Short Answer #2 score must be 0, 1, or 2").isInt({ min: 0, max: 2 });
        req.checkBody("essay_3_score", "Short Answer #3 score required").notEmpty();
        req.checkBody("essay_3_score", "Short Answer #3 score must be 0, 1, or 2").isInt({ min: 0, max: 2 });

        const errors = req.validationErrors();
        res.locals.applicant = applicant;
        if (errors) {
            return res.render("applicant", {
              title: `Applicant: ${applicant.asc_id}`,
              errors: errors.map(error => error.msg)
            })
        }

        const scores = {
          essay_score_1: Number(req.body.essay_1_score),
          essay_score_2: Number(req.body.essay_2_score),
          essay_score_3: Number(req.body.essay_3_score)
        }

        const comment = req.body.comment;

        dbHandler.incrementApplicantReads(userId, asc_id, scores, comment)
          .then(()=>{
            req.session.msg = {success: `Completed Applicant ${asc_id}!`};
            res.redirect("/dashboard");
          })
          .catch(err=>{
            console.log(`Problem incrementing applicant reads (user: ${userId}, asc_id: ${asc_id})`, err);
            req.session.msg = {error: `Could not complete applicant ${asc_id}`};
            res.redirect("/dashboard");
          })
      })
      .catch(err => {
        console.log(`Problem posting applicant read (user: ${userId}, asc_id: ${asc_id}): `, err);
        req.session.msg = {error: `Could not complete applicant ${asc_id}`};
        res.redirect("/dashboard");
      })
  })

  return router;
}