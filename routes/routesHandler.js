const authenticationHandler = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

const adminAuth = (req, res, next) => {
    if (req.user.admin === 1) {
        return next();
    }
    res.redirect('/logout');
}

const getMonthStr = function(){
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toLocaleString("en-us", { month: "long" });
  }

module.exports = function (app, dbHandler) {

    // adding local variables
    app.use((req,res,next)=>{
        res.locals.monthStr = getMonthStr();
        res.locals.isAuthenticated = req.isAuthenticated();
        res.locals.user = req.user;
        next();
    })
    
    var indexRouter = require('./index')(dbHandler);
    app.use('/', indexRouter);
    
    // authenticated
    app.use(authenticationHandler);

    var dashboardRouter = require('./dashboard')(dbHandler);
    app.use('/dashboard', dashboardRouter);
    
    var applicantRouter = require('./applicant')(dbHandler);
    app.use('/applicant', applicantRouter);
    
    // admin authenticated
    app.use(adminAuth);
    var adminRouter = require('./admin')(dbHandler);
    app.use('/admin', adminRouter);
}