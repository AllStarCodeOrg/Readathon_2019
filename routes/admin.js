const express = require('express');
const router = express.Router();
const bcrypt = require("bcrypt");
const saltRounds = 10;
const passport = require("passport");

module.exports = function(dbHanderl, airtable_obj){
  
  router.get('/', function(req, res, next) {
    res.render('login', { title: 'Express' });
  });
  
  return router;
}