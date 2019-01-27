var express = require('express');
var router = express.Router();
const ObjectID = require('mongodb').ObjectID




/* GET users listing. */
router.get('/', async function(req, res, next) {
  if(!checkIfLoggedIn(req)){
    return;
  }


    if(req.query.id){

        let contains = false;
        for(house of req.session.households){
            console.log("House is" + JSON.stringify(house));
            console.log(house._id == req.query.id);
            if(house._id == req.query.id){
                contains = true;
                break;
            }
        }

        console.log(contains);
        if(contains){
            req.session.activeHousehold = req.query.id;
            res.json({status:true});

        } else{
            res.json({status:false, message:"Not allowed to modify that household"});
        }

        return;
    }

  try{

     var result = await req.collections.households.find({members:req.session.userId}, { name: 1}).toArray();
    console.log(result);
  } catch(ex){

    console.error(ex);
    res.json({households:[]});
    return;
  }

  req.session.households = [];
  for (let house of result){
    req.session.households.push(house);
  }

  res.json({households:result});
  return;
});


router.put('/', async (req, res, next) =>{

  if(!checkIfLoggedIn(req)){
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

router.get('/pantry', async(req, res, next) =>{
  console.log("In pantry");
  res.json({a:"a"});
});

router.put('/pantry', async(req,res,next)=>{
  if(!checkIfLoggedIn(req)){
    return;
  }

  let keys = ["name", "quantity", "expires", "category", "tag"]
  for(key of keys){
    if(!req.body[key]){
      req.json({status:false, message:"Required field invalid"});
      return;
    }
  }

  var newEntry = {
    name: req.body.name,
    quantity: req.body.quantity,
    category: req.body.category,
    expires: req.body.expires
  };

  //TODO, error checking

  let rawTags = req.body.tag;
  //Split the tags on the commas, trim the extra whitespace, and remove duplicates to store only required data
  newEntry.tags = rawTags.split(",")
    .map((str) => {return str.trim()})
    .filter( (val, index, self) => {
      return self.indexOf(val) == index && val.length;
  });



  try{

      await req.collections.households.updateOne({_id:ObjectID(req.session.activeHousehold)},{$push: {pantry: newEntry}});
      res.json({status:true, entry:newEntry});
  } catch(ex){
    console.error(ex);
    res.json({status:false, message:"Failed to insert"});
  }
});


function checkIfLoggedIn(req){
  if(!req.session.username){
    console.log("Unauthorized user attempting to get household information");
    res.json({status:false, message:"Need to be logged in to do that"});
    return false;
  }
  return true;
}


module.exports = router;
