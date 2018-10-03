const express = require('express');
const router = express.Router();
const bcrypt = require("bcrypt");
const saltRounds = 10;
const passport = require("passport");

module.exports = function(dbHanderl){
  /* GET home page. */
  router.get('/', function(req, res, next) {
    res.render('dashboard', { title: 'Dashboard' });
  });
  
  return router;
}