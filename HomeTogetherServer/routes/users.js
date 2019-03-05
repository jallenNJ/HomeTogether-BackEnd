var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', async (req, res, next)=> {
  //TODO: Add log in check

  var query = (req.query.username)?
    {user:{$regex:req.query.username}}:{};
  try{
    var users = await req.collections.users.find(query).project({_id:0, pass:0}).toArray();

  } catch(ex){
    console.error(ex);
    res.json({status:false});
    return;
  }
  
  res.json({status:true, users:users});

});

module.exports = router;
