require('dotenv').load(); // required for using .env file
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var validator = require("express-validator"); // NEED TO IMPLEMENT NEW API
var session = require("express-session");
var passport = require("passport");
var LocalStrategy = require('passport-local').Strategy;
var SQLiteStore = require('connect-sqlite3')(session);
const dbHandler = require("./dbHandler");
const bcrypt = require("bcrypt");

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views/pages'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(validator()); // must come immediately after bodyParser (adds "checkBody" method to request object)
app.use(cookieParser());
app.use("/static",express.static(path.join(__dirname, 'public')));

// setting & storing session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,  // only want to store for logged in users
  store: new SQLiteStore,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 1 week
  // cookie: { secure: true }
}))
app.use(passport.initialize()); // adds .login, .serializeUser, and .deserializeUser, .user, .isAuthenticated()
app.use(passport.session());

// ROUTES
require("./routes/routesHandler")(app, dbHandler);

const clean = str => {
  return str.trim().toLowerCase();
}
async function verifyUser(email, password) {
  const user = await dbHandler.findUserByEmail(clean(email));
  if (!user) return false;
  return await new Promise((res, rej) => {
      bcrypt.compare(password, user.password, function (err, result) {
          if (err) return rej(err);
          if (result) {
              res(user)
          } else {
              res(false);
          }
      })
  })
}

// LOCAL STRATEGY
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',},
  function (email, password, done) {
      verifyUser(email, password).
        then(user => {
                if (user) return done(null, {
                    "user":user
                });
                done(null, false);
            })
            .catch(err => {
                done(err);
            })
  }
));

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (userID, done) {
  dbHandler.findUser(userID)
    .then(user=>{
      done(null, user);
    })
    .catch(err=>{
      done(err);
    })
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  console.log("Original URL: ",req.originalUrl);
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  // render the error page
  res.status(err.status || 500);
  res.render('error',{title:"ERROR"});
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port: ${port}`));