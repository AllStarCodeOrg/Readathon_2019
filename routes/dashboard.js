const express = require('express');
const router = express.Router();

module.exports = function(dbHandler){
  router.get('/', function(req, res, next) {
    const user = req.user;
    if(user.first_time===0){
      res.redirect('/rubric');
    }else{
      const msg = req.query.msg;
      switch(msg){
        case "1":
          res.locals.msg = "User Successfully Created"
          break;
        case "2":
          res.locals.msg = "There are no more applicants available for you to read"
          break;
        case "3":
          res.locals.msg = "Cannot access that applicant"
          break;

      }
      res.render('dashboard', { title: 'Dashboard' });
    }
  });
  
  return router;
}