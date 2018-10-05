const express = require('express');
const router = express.Router();

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

const adminError = function(res,err){
  res.locals.error = err;
  res.render("admin",{title: "Admin"});
}

module.exports = function(dbHandler){
  
  router.get('/', function(req, res, next) {
    dbHandler.getUsers()
      .then(users=>{
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

  router.get('/user', function(req, res, next) {
    const readathonUser = {      
      name:"",
      email:"",
      password:"",
      admin:0,
      alumni:0,
      month_access:null
    }
    res.locals.readathonUser = readathonUser;
    console.log(readathonUser);
    res.render("editUser",{title:"Add New User"});
  })

  router.post('/user', function(req, res, next) {
    req.checkBody("password", "Password is required").notEmpty();
    req.checkBody("email", "Email is required").notEmpty();
    req.checkBody("email", "Valid email is required").isEmail();

    const errors = req.validationErrors();
    const name = req.body.name;
    if (errors) {
      return res.render("editUser",{
        title:"Add New User",
        readathonUser: {name:name},
        error:errors[0].msg
      });
    }else{
      dbHandler.addNewUser({
        name:         req.body.name, 
        email:        req.body.email, 
        password:     req.body.password,
        admin:        req.body.admin === "on" ? 1 : 0,
        alumni:       req.body.alumni === "on" ? 1 : 0,
        month_access: req.body.month_access === "99" ? null : req.body.month_access
      })
      .then(userID=>{
        return res.redirect(`/admin/user/${userID}`);
      })
      .catch(err=>adminError(res, err));
    }
  });

  router.get('/user/:id', function(req, res, next) {
    const id = req.params.id;

    dbHandler.findUser(id)
      .then(readathonUser=>{
        if(!readathonUser) return adminError(res,`Could not find user with id=${id}`);
        res.locals.readathonUser = readathonUser;
        res.render("editUser",{title: "Edit User"});
      })
      .catch(err=>{
        adminError(res,err);
      })
  });

  router.post('/user/:id', function(req, res, next) {
    const id = Number(req.params.id);
    dbHandler.findUser(id)
      .then(readathonUser=>{
        res.locals.readathonUser = readathonUser;
        req.checkBody("email", "Email is required").notEmpty();
        req.checkBody("email", "Valid email is required").isEmail();
    
        const errors = req.validationErrors();
        
        if (errors) {
          return res.render("editUser",{
            title:"Edit User",
            error:errors[0].msg
          });
        }

        if(id===1){
          if(id===req.user.id){
            return next();
          }else{
            return adminError(res, `{tisk tisk tisk} ${req.user.name}. I made this entire website ... did you really think you could alter my account?`);
          }
        }else if(readathonUser.admin===1){
          if(id===req.user.id || req.user.id===1){
            return next();
          }else{
            return adminError(res, "You cannot edit other admin accounts, only your own");
          }
        }else{
          return next();
        }
      })
      .catch(err=>adminError(res,err));
  },(req, res, next)=>{
    const id = req.params.id;
    const values = {
      id:           id,
      name:         req.body.name,
      email:        req.body.email,
      password:     req.body.password.length === 0 ? undefined : req.body.password,
      admin:        req.body.admin === "on" ? 1 : 0,
      alumni:       req.body.alumni === "on" ? 1 : 0,
      month_access: req.body.month_access === "99" ? null : req.body.month_access
    }
    dbHandler.updateUser(values)
      .then(readathonUser=>{
        res.locals.readathonUser = readathonUser;
        res.render("editUser",{
          title:"Edit User",
          success:"User Updated Successfully"
        });
      })
      .catch(err=>adminError(res,err));
  })

  return router;
}