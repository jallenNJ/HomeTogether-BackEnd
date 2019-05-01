/**
 * @file users.js
 * @brief Handles all routes directed to users which need authentication
 */

var express = require('express');
var router = express.Router();
const ObjectID = require('mongodb').ObjectID

/**
 * @brief Get user ids that match string, or convert and id to a name
 */
router.get('/', async (req, res, next) => {
	//TODO: Add log in check

	if (req.query.resolveIds) {
		resolveIds(req.query.resolveIds, req, res);
		return;
	}


	var query = (req.query.username) ?
		{ user: { $regex: req.query.username, $options: 'i' } } : {};
	try {
		var users = await req.collections.users.find(query).project({ _id: 0, pass: 0 }).toArray();

	} catch (ex) {
		console.error(ex);
		res.status(500).json({ status: false });
		return;
	}

	res.json({ status: true, users: users });

});

router.patch('/', async(req,res,next) =>{

	if(!req.body.dbKey || !req.body.dbVal){
		res.status(400).json({message:"missing field"});
		return;
	}
	//TODO: check if key is valid
	let key = req.body.dbKey;
	let val = req.body.dbVal;
	let data = {};
	data[key] = val;

	try{
		await req.collections.users.updateOne( {_id:ObjectID(req.session.userId)}, {$set:data} );	
		var updatedUser= await req.collections.users.findOne({_id:ObjectID(req.session.userId)});
	}catch(ex){
		res.status(500).json({status:false});
		return;
	}
	
	res.status(200).json({user:updatedUser});
	
})



/**
 * @brief Converts A commaseperated string of MongoIds to their usernames
 * @param idString {String} the MongoID to resolve, in the form a comma seperated string
 * @param  req {Object} Express req object
 * @param  res {Object} Express res object
 */
async function resolveIds(idString, req, res) {

	var idArray = idString.split(",")
		.map((str) => { return ObjectID(str.trim()) });
	try {
		var usernames = await req.collections.users.find({ _id: { $in: idArray } }).project({ pass: 0 }).toArray();
	} catch (ex) {
		console.error(ex);
		res.status(500).json({ status: false });
	}
	res.json({ status: true, names: usernames });
}

module.exports = router;
