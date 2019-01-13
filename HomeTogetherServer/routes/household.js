var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', async function(req, res, next) {
 console.log("DEBUG");

 console.log(req.query);


 if(req.query.id){
   console.log("IMPLEMENT THE single house parsing");
 }

  try{

     var result = await req.collections.households.find({members:req.session.userId}, { name: 1}).toArray();
    console.log(result);
  } catch(ex){

    console.error(ex);
    res.json({households:[]});
    return;
  }

  res.json({households:result});
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
