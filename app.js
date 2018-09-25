const createError = require('http-errors');
const express = require('express');
const path = require('path');
const session = require('express-session');
const logger = require('morgan');
const mongoose = require('mongoose');
const okta = require("@okta/okta-sdk-nodejs");
const { ExpressOIDC } = require("@okta/oidc-middleware");
const dashboardRouter = require('./routes/dashboard');
const publicRouter = require('./routes/public');
const usersRouter = require("./routes/users");

const app = express();

// user authentication with Okta
const oktaClient = new okta.Client({
  orgUrl: 'https://dev-243898.oktapreview.com',
  token: '00rwcWvnXvMXiPO5iRqtcYF3skUMJdqtpMxad1z-WN'
});

const oidc = new ExpressOIDC({
  issuer: "https://dev-243898.oktapreview/oauth2/default",
  client_id: '0oagbjmic2bDzcX6V0h7',
  client_secret: 'HVESJVVu-bNSW5iIyn7Tu82lV-HnvqNig4_Bvo6K',
  redirect_uri: 'http://localhost:3000/users/callback',
  scope: "openid profile",
  routes: {
    login: {
      path: "/users/login"
    },
    callback: {
      path: "/users/callback",
      defaultRedirect: "/dashboard"
    }
  }
});

oidc.on('ready', () => {
  app.listen(3000, () => console.log('app started'));
});

oidc.on('error', err => {
  console.log('Womp womp. Here\'s your error: ', err)
});

// enable sessions
app.use(session({
  secret: '87ygjfeiefew3o358uhgbnjhghbgftydhbjkvslgt-oiubhuyegrh',
  resave: true,
  saveUninitialized: false
}));
// OIDC router for authentication
app.use(oidc.router);

// set up default mongoose connection
mongoose.connect('mongodb://localhost/testdb', { useNewUrlParser: true }).then(() => {
console.log("Connected to Database Motherfucker!!");
}).catch((err) => {
    console.log("Not Connected to Database ERROR! ", err);
});

// tell mongoose to use global promise library
mongoose.promise = global.promise;

// get default connection
const db = mongoose.connection;

// bind connection to error event
db.on('error', console.error.bind(console, 'MongoDB connection error:'));


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', publicRouter);
app.use('/dashboard', dashboardRouter);
app.use('/users', usersRouter);




// collect user data
app.use((req, res, next) => {
  if (!req.userinfo) {
    return next();
  }

  oktaClient.getUser(req.userinfo.sub)
    .then(user => {
      req.user = user;
      res.locals.user = user;
      next();
    }).catch(err => {
      next(err);
    });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// middleware to protect numerous routes
// app.get('/protected', oidc.ensureAuthenticated(), (req, res) => {
//   res.send(JSON.stringify(req.userinfo));
// })

// function loginRequired(req, res, next) {
//   if (!req.user) {
//     return res.status(401).render("unauthenticated");
//   }

//   next();
// };

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// oidc.on('ready', () => {
//   app.listen(3000, () => console.log(`Started!`));
// });

// oidc.on('error', err => {
//   console.log('Okta is not working because of this error:', err);
// });

module.exports = app;
