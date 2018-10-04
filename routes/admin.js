const express = require('express');
const router = express.Router();
const bcrypt = require("bcrypt");
const saltRounds = 10;
const passport = require("passport");

var months = [
  'January', 'February', 'March', 'April', 'May',
  'June', 'July', 'August', 'September',
  'October', 'November', 'December'
  ];

function monthNumToName(monthnum) {
  return months[monthnum];
}
function monthNameToNum(monthname) {
  var month = months.indexOf(monthname);
  return month;
}

module.exports = function(dbHandler){
  
  router.get('/', function(req, res, next) {
    dbHandler.getUsers()
      .then(users=>{
        console.log(users);
        // getting human readable month names
        Array.from(users).forEach(user => {
          if(user.month_access){
            user.monthName = monthNumToName(user.month_access);
          }else{
            user.monthName = "💎";
          }
        });
        res.locals.users = users;
        res.render('admin', { title: 'Admin' });
      })
      .catch(err=>{
        res.render("admin",{title: "Admin", error: err});
      })
  });
  
  return router;
}