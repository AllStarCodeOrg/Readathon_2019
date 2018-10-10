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
      dbHandler.getUserScores(user.id)
        .then(data=>{
          res.locals.data = data;
          res.render('dashboard', { title: 'Dashboard' });
        })
        .catch(err=>{
          console.log("Problem getting user scores: ",err);
          res.render("dashboard", { title: 'Dashboard' });
        })
    }
  });
  
  return router;
}