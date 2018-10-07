const express = require('express');
const router = express.Router();

module.exports = function(dbHandler){
  router.get('/', function(req, res, next) {
    const user = req.user;
    if(user.first_time===0){
      res.redirect('/rubric');
    }else{
      if(req.session.msg){
        res.locals.msg = req.session.msg;
        req.session.msg = null;
      }
      res.render('dashboard', { title: 'Dashboard' });
    }
  });
  
  return router;
}