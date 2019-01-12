var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  console.log("Get to household with session username: ");
  console.log(req.session.username);
  res.end();
  return;
});


router.put('/', async (req, res, next) =>{

  if(!req.session.username){
    console.log("Unauthorized user attempting to create");
    res.json({status:false, message:"Need to be logged in to do that"});
    return;
  }
  if(!req.session.userId){
    console.error(req.session.username + " did not have userId attached");
    res.json({status:false, message:"Invalid session, please log in again"});
    return;
  }

  let data = req.body;
  try{
    let name = data.name;
    await req.collections.households.insertOne({name:name, members:[req.session.userId]});

  } catch(ex){
    console.error("Failed to insert new household" + req.body);
    res.json({status:false, message:""});
  }

  res.json({status:true, message:""});
  return;


})

module.exports = router;
