const express = require('express');
const router = express.Router();

module.exports = function(dbHandler){
      /**
       * Handles edge case when user is done with Readathon.
       * Simply saves processing time.
       * Prevents user from accessing applicants.
       */
      const userDoneHandler = function (req, res, next) {
        const user = req.user;
        dbHandler.checkUserDoneness(user)
        .then(result=>{
            user.done = result? 1:0;
            next();
        })
        .catch(err=>{
            console.log("Could not get user doneness:", err);
            next();
        })
    }
  router.use(userDoneHandler);

  router.get('/', function(req, res, next) {
    const user = req.user;
    dbHandler.getUserScores(user.id)
      .then(data=>{
        res.locals.data = data;
        res.render('dashboard', { title: 'Dashboard' });
      })
      .catch(err=>{
        console.log("Problem getting user scores: ",err);
        res.render("dashboard", { title: 'Dashboard' });
      })
  });
  
  return router;
}