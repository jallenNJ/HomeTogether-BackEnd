var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
const ex_session = require('express-session');
const ip = require("ip");
var logger = require('morgan');


const MongoClient = require('mongodb').MongoClient;

require('dotenv').config();

const url = process.env.noSqlDatabase;
const allCollections = {};




var indexRouter = require('./routes/index');
var houseRouter = require('./routes/household');
var userRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("homeTogether"));
app.use(ex_session({ secret: 'homeTogether', resave: false, saveUninitialized:false })); //If touch/rolling is enabled, set resave to true
app.use(express.static(path.join(__dirname, 'public')));


app.use((req, res, next) =>{
  req.collections = allCollections;
  next();
});

app.use('/', indexRouter);
app.use((req,res,next) =>{ //Ensures user is logged in

  if (!req.session.username) {
    console.log("Unauthorized user attempting to access a protected route");
    res.status(401).json({ message: "Need to be logged in to do that" });
    return;
}
next();

});
app.use('/household', houseRouter);
app.use('/users', userRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


async function connectToDb(){

  if(url == undefined){
     console.log("Nosql connection string missing")
     return;
  }

  console.log ("Server is running on: " + ip.address());
  try{
    connection = await MongoClient.connect(url,{ useNewUrlParser: true });
    const db = connection.db('home-together-nosql');
    allCollections.households = await db.createCollection("households");
    allCollections.users = await db.createCollection("users");

    
		//Get the collection
     // collection = await db.createCollection("contacts");
  } catch(ex){
    console.log(ex);
    console.log("Connected to only some collections");
    bindConsoleInput();
    return;
  }

  console.log("Connected to all collections")
  bindConsoleInput();
}

connectToDb();

function bindConsoleInput(){

  console.log();
  console.log("Console CLI is now running");
  const stdin = process.openStdin();

  stdin.addListener("data", function(d) {
      // note:  d is an object, and when converted to a string it will
      // end with a linefeed.  so we (rather crudely) account for that  
      // with toString() and then trim() 
      //console.log("you entered: [" + 
      //    d.toString().trim() + "]");
      let input = d.toString().trim();
      switch(input){
        case "exit":
          console.log("Server will close");
          process.exit(0);
          break;
        case "ip":
          console.log ("Server is running on: " + ip.address());   
          break;   
        default:
          console.log("No action for string: " + input);
          break;  
      }
    });
  
}


module.exports = app;
