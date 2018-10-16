const questions = [
    "What do you hope to achieve by the end of the Summer Intensive?",
    "Can you tell us about a time you struggled with something? What was challenging about it? What did you do?",
    "Describe a moment from your life that helped shape your view of the world. Consider your ethnic or cultural background when answering this question."
];
/**
 * Handles user authentication.
 */
const authenticationHandler = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

/**
 * Handles admin authentication.
 */
const adminAuth = (req, res, next) => {
    if (req.user.admin === 1) {
        return next();
    }
    res.redirect('/logout');
}

/**
 * Returns the current Readathon batch's month as a string.
 */
const getMonthStr = function () {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toLocaleString("en-us", {
        month: "long"
    });
}

/**
 * Handles edge case when user is done with Readathon.
 * Simply saves processing time.
 * Prevents user from accessing applicants.
 */
const userDoneHandler = function (req, res, next) {
    const user = req.user;
    if (user.done) {
        res.redirect("/dashboard");
    } else {
        next();
    }
}

/**
 * Handles passing errors through session.
 */
const passingErrorHandler = function (req, res, next) {
    if (req.session.msg) {
        res.locals.msg = req.session.msg;
        req.session.msg = null;
    }
    next();
}
module.exports = function (app, dbHandler) {

    /**
     * Injects pertinant global variables.
     */
    const injectLocalVariables = function (req, res, next) {
        res.locals.monthStr = getMonthStr();
        res.locals.isAuthenticated = req.isAuthenticated();
        res.locals.user = req.user;
        res.locals.questions = questions;
        dbHandler.getProgressStats()
            .then(stats => {
                res.locals.progressStats = {
                    total: stats.total,
                    completed: stats.completed,
                    perc: stats.perc
                }
                next();
            })
            .catch(err => {
                console.log("Could not get progress stats");
                next();
            })
    }

    // adding local variables
    app.use(injectLocalVariables);

    // handling passing error messages
    app.use(passingErrorHandler);

    var indexRouter = require('./index')(dbHandler);
    app.use('/', indexRouter);

    // authenticated past this point
    app.use(authenticationHandler);

    var dashboardRouter = require('./dashboard')(dbHandler);
    app.use('/dashboard', dashboardRouter);

    var applicantRouter = require('./applicant')(dbHandler);
    app.use('/applicant', userDoneHandler, applicantRouter);

    // admin authenticated past this point
    app.use(adminAuth);
    
    var adminRouter = require('./admin')(dbHandler);
    app.use('/admin', adminRouter);
}