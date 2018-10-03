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

module.exports = function (app, dbHandler) {
    var indexRouter = require('./index')(dbHandler);
    app.use('/', indexRouter);
    
    // authenticated
    app.use(authenticationHandler);

    var usersRouter = require('./users')(dbHandler);
    app.use('/users', usersRouter);
    
    var applicantRouter = require('./applicant')(dbHandler);
    app.use('/applicant', applicantRouter);
    
    // admin authenticated
    app.use(adminAuth);
    var adminRouter = require('./admin')(dbHandler);
    app.use('/admin', adminRouter);
}