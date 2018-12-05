const questions = [
    "According to Professor Gideon Rosen of Princeton University, 'Culture is what presents us with the kinds of valuable things that can fill a life.' Describe one valuable thing that your cultural, ethnic, or family background has given you, and how it informs your perspective.",
    "What do you hope to achieve by the end of the Summer Intensive?",
    "Can you tell us about a time you struggled with something? What was challenging about it? What did you do?"
];

const DENY_ACCESS = false;

/**
 * Returns true if user is permitted to access the Readathon for the month.
 */
const permittedForMonth = user => {
    if(user.admin===1) return true;
    let result;
    const userMonth = user.month_access;
    if(userMonth === null){
        result = true;
    }else{
        const currentMonth = new Date().getMonth();
        result = userMonth === currentMonth;
    }

    return !DENY_ACCESS && result;
}
/**
 * Handles user authentication.
 */
const authenticationHandler = (req, res, next) => {
    if (req.isAuthenticated()) {
        // if user is not allowed for the month, go to information page
        if(permittedForMonth(req.user)){
            return next();
        }else{
            req.session.msg = {
                error: "You do not have permission to access the Readathon at this time"
            }
            return res.redirect("/issue");
        }
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
    res.redirect('/dashboard');
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
 * Return name of month converted from number (0-11).
 */
function monthNumToName(monthnum) {
    const months = [
      'January', 'February', 'March', 'April', 'May',
      'June', 'July', 'August', 'September',
      'October', 'November', 'December'
    ];
    return months[Number(monthnum)];
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
        if(req.user){
            res.locals.user = req.user;
            res.locals.user.monthName = monthNumToName(req.user.month_access);
        }
        res.locals.questions = questions;
        dbHandler.getProgressStats()
            .then(stats => {
                res.locals.progressStats = {
                    completed: stats.completed,
                    total: stats.total * 3,
                    perc: (stats.completed/(stats.total*3)*100).toFixed(2)
                };
                next();
            })
            .catch(err => {
                console.log("Could not get progress stats:", err);
                next();
            })
    }

    // adding local variables
    app.use(injectLocalVariables);

    // handling passing error messages
    app.use(passingErrorHandler);

    var indexRouter = require('./index')(dbHandler,authenticationHandler);
    app.use('/', indexRouter);

    // authenticated past this point
    app.use(authenticationHandler);

    var dashboardRouter = require('./dashboard')(dbHandler);
    app.use('/dashboard', dashboardRouter);

    var applicantRouter = require('./applicant')(dbHandler);
    app.use('/applicant', applicantRouter);

    // admin authenticated past this point
    app.use(adminAuth);
    
    var adminRouter = require('./admin')(dbHandler);
    app.use('/admin', adminRouter);
}