var express = require('express');
var router = express.Router();
const ObjectID = require('mongodb').ObjectID

/* GET users listing. */
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
