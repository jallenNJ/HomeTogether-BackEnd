var express = require('express');
var router = express.Router();
const ObjectID = require('mongodb').ObjectID


router.get('/', async function(req, res, next) {
  if(!checkIfLoggedIn(req)){
    return;
  }

    //==Start of single house query
    if(req.query.id){

        let contains = false;
        for(house of req.session.households){
            if(house._id == req.query.id){
                contains = true;
                break;
            }
        }

        if(contains){
            req.session.activeHousehold = req.query.id;
            if(req.query.activeData){

              try{
               let  household= await req.collections.households.find({_id:ObjectID(req.query.id)}, {pantry:0}).toArray();

               if(household == undefined){
                 console.log("Household is undefined");
                 throw Exception;
               }
                res.json({status:true, house:household[0]}); 

              } catch(ex){
                console.log("Error fetching full data: " + ex);
                res.json({status:"false", message:"Internal server error"});
              }
              return;
            }
           
            res.json({status:true});
        } else{
            res.json({status:false, message:"Not allowed to modify that household"});
        }

        return;
    }
    //== END OF SINGLE HOUSE QUERY
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
    await req.collections.households.insertOne(
            {   name:name,  
                members:[req.session.userId],
                pantryLocations:["pantry", "fridge", "freezer"]
            });

  } catch(ex){
    console.error("Failed to insert new household" + req.body);
    res.json({status:false, message:""});
  }

  res.json({status:true, message:""});
  return;


})

router.get('/pantry', async(req, res, next) =>{
  if(!checkIfLoggedIn(req)){
    return;
  }
  try{
    var pantryObj = await req.collections.households.find({_id:ObjectID(req.session.activeHousehold)}, {pantry:1, _id:0}).toArray();

  } catch(ex){
    console.log("Failed to get pantry" + ex);
    res.json({status:false, message:"Failed to retrieve data"});
    return;
  }
  if(!pantryObj[0].pantry){
    pantryObj[0].pantry = [];
  }
  res.json({status:true, pantry:pantryObj[0].pantry});



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

  if( newEntry.quantity < 0){
      res.json({status:false, message:"Need to have atleast one of item"});
      return;
  }

  //Possibly add placeholder invalid value?
 // if(!newEntry.category){
    
 // }


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
    console.log("Unauthorized user attempting to access a protected route");
    res.json({status:false, message:"Need to be logged in to do that"});
    return false;
  }
  return true;
}


module.exports = router;
