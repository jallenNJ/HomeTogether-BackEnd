var express = require('express');
var router = express.Router();
var bcrypt = require("bcrypt");
const ex_session = require('express-session');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});



router.get('/authcheck', function (req, res, next){
	var returnVal = false;
	if(req.session.username){
		returnVal = true;
	}
	res.json({status:returnVal});
	
})

//Function to create a new user. The user needs to specify the username and password they want to use
router.put('/login', async function(req, res, next) {


	//Make sure they entered a username and password
  let username = req.body.user;
  if(!username){
    res.json({status:false, message:"Please enter a user name"});
    return;
  }

  let rawpass = req.body.pass;
  if(!rawpass){
    res.json({status:false, message:"Please enter a password"});
    return;
  }


	
	try{
		//Ensure the username is not taken already
		var sameUser = await req.collections.users.findOne({user:username});
		
		if(sameUser){
			res.json({status:false, message: "User already exists"});
			return;
		} 

		//If username is unique, generate a salt and use that to hash the password
		let salt = await bcrypt.genSalt(10);
		let hash = await bcrypt.hash(rawpass, salt);


		//Add them to the database
		await req.collections.users.insertOne({user:username, pass:hash});
	}catch (ex){
		//Catch any database errors and log
    console.log(ex);
    res.json({stats:false, message:"Creation failed, try again later"});
    return;
	}

	//Inform the user of the successful creation
  res.json({status:true, message:"User Created"});
  return;
});

//This is the route to handle an existing user trying to log into their account
//	and become authenticated.
router.post('/login', async function(req, res, next){

	//Get the fields from request
	let username = req.body.user;
	let enteredpass = req.body.pass;
	//TODO: check for empty or null? Better efficency however rest of logic works with those cases

	try{
		//Find the user in the database
		var user = await req.collections.users.findOne({user:username});
		if(!user){
			res.json({status:false, message: "No user found"});
			return;
		}

		//See if this password matches the hash wonce the salt is added
		let match = await bcrypt.compare(enteredpass, user.pass);

		if(match){ //If match, authenticate the user and update the sessions
      req.session.username = username;
      req.session.userId = user._id;
			res.json({status:true, message: "Login Successful"});
			return;
		} else{ //Reject the request
			res.json({status:false, message: "Incorrect password"});
			return;
		}

	} catch (ex){
		console.log(ex);
	}
});

//This route is for when a client wants to log out and end their session explictly 
router.get('/logout', (req, res, next)=>{
	delete req.session.username;
	res.json({status:true});
	//res.redirect("/login.html");
});

module.exports = router;
