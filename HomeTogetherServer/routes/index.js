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

router.put('/login', async function(req, res, next) {

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
		var sameUser = await req.collections.users.findOne({user:username});
		
		if(sameUser){
			res.json({status:false, message: "User already exists"});
			return;
		} 

		let salt = await bcrypt.genSalt(10);
		let hash = await bcrypt.hash(rawpass, salt);



		await req.collections.users.insertOne({user:username, pass:hash});
	}catch (ex){
    console.log(ex);
    res.json({stats:false, message:"Creation failed, try again later"});
    return;
	}

  res.json({status:true, message:"User Created"});
  return;
});


router.post('/login', async function(req, res, next){

	let username = req.body.user;
	let enteredpass = req.body.pass;


	try{
		var user = await req.collections.users.findOne({user:username});
		if(!user){
			res.json({status:false, message: "No user found"});
			return;
		}

		let match = await bcrypt.compare(enteredpass, user.pass);

		if(match){
      req.session.username = username;
      req.session.userId = user._id;
			res.json({status:true, message: "Login Successful"});
			return;
		} else{
			res.json({status:false, message: "Incorrect password"});
			return;
		}


	} catch (ex){
		console.log(ex);
	}

})


router.get('/logout', (req, res, next)=>{
	delete req.session.username;
	res.redirect("/login.html");
})

module.exports = router;
