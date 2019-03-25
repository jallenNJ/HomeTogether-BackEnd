/**
 * @file household.js
 * @brief Router for /household/*
 * 
 */


var express = require('express');
var router = express.Router();
const ObjectID = require('mongodb').ObjectID

const shoppingListStr = "shopping";
const shoppingListLoc = [shoppingListStr];

//This function is responsible for querying a single household from the data base and
//  may call the allHouseQuery function if a user attempts to access the route before that is called.

/**
 * @brief This function gets information for a specified household
*This function is responsible for querying a single household from the data base and
*  may call the allHouseQuery function if a user attempts to access the route before that is called.
*
* @param req {Object} Incoming request
* @param res {Object} The response to send
* @param next {Function}  The next middle ware function to call
* @return undefined Returns undefined on DB look-up error
*/
async function singleHouseQuery(req, res, next) {

	if (!req.session.households) {

		try {
			let allHouses = await allHouseQuery(req, res, next);
			if (!allHouses) {
				return;
			}
		} catch (ex) {
			console.error(ex);
			return;
		}
	}
	//Ensure the user is a member of the household
	let contains = false;
	for (house of req.session.households) {
		if (house._id == req.query.id) {
			contains = true;
			break;
		}
	}

	if (contains) { //If they are
		//Set the active household for the user
		req.session.activeHousehold = req.query.id;
		if (req.query.activeData) { //If the requests wants all data of the active household to cache

			try {
				//Get the data
				let household = await req.collections.households.find({ _id: ObjectID(req.query.id) }, { pantry: 0 }).toArray();

				//Error handling
				if (household == undefined) {
					console.log("Household is undefined");
					throw Exception;
				}
				//Return the data
				res.json({ status: true, house: household[0] });

			} catch (ex) {
				console.log("Error fetching full data: " + ex);
				res.status(500).json({ status: "false", message: "Internal server error" });
			}
			return;
		}

		res.status(204).send();
	} else {
		res.status(403).json({ message: "Not allowed to modify that household" });
	}

	return;
}

/**
 * @brief Queries all households that the user is apart of, and inits session
 * @param req {Object} Incoming request
 * @param res {Object} The response to send
 * @param next {Function}  The next middle ware function to call 
 * @return False if sends headers, {households:[result]} on success. Will return [] if no results
 */
async function allHouseQuery(req, res, next) {
	if (req.session.households === undefined) {
		req.session.households = [];
	}
	//If here, the user wants the list of all households they are apart of
	try {

		//Get the names and Ids of all households the user is in
		var result = await req.collections.households.find({ members: req.session.userId }, { name: 1 }).toArray();
		console.log(result);
	} catch (ex) {

		//If error, return the empty list for no houses
		console.error(ex);
		res.status(404).json({ households: [] });
		return false;
	}

	//Copy the result into the session
	req.session.households = [];
	for (let house of result) {
		req.session.households.push(house);
	}

	//return the result
	return { households: result };
}

//Get to the household



/**
 * @brief Handles the get for /household. Calls helper functions to do the work
 * Handles both all households an single household
 *	  Makes use of two helper function which seperate the functionality of all and single
 *	Single Household requires the query parameter id to be present
 *	  Also supports the ability to get the cache data
 *	All households takes no parameters and returns the list of all households the user is a member of
 * @param req {Object} Incoming request
 * @param res {Object} The response to send
 * @param next {Function}  The next middle ware function to call
 */
router.get('/', async function (req, res, next) {

	//==Start of single house query
	if (req.query.id) {
		singleHouseQuery(req, res, next);
		return;
	}
	//== END OF SINGLE HOUSE QUERY

	//If false, server sent header, otherwise send the object the server made

	try {
		var result = await allHouseQuery(req, res, next);
	} catch (ex) {
		console.error(ex);
	}


	if (result) {
		res.json(result);
	}
	return;
});


/**
 * @brief Handles new households being created
 * 
 * 
 * @param req {Object} Incoming request
 * @param res {Object} The response to send
 * @param next {Function}  The next middle ware function to call
 */
router.put('/', async (req, res, next) => {


	//If user is logged in but no username. This is an error state in the server
	if (!req.session.userId) {
		console.error(req.session.username + " did not have userId attached");
		res.status(401).json({ status: false, message: "Invalid session, please log in again" });
		return;
	}

	let data = req.body;
	try {
		//Insert the object into the database. Add the default members
		let name = data.name;
		await req.collections.households.insertOne(
			{
				name: name,
				members: [req.session.userId],
				pantryLocations: ["pantry", "fridge", "freezer"]
			});

	} catch (ex) {
		console.error("Failed to insert new household" + req.body);
		res.status(500).json({ message: "" });
	}

	res.status(204).send();
	return;


});



/**
 * @brief Get to the pantry of an already selected households from the user's session
 * @param req {Object} Incoming request
 * @param res {Object} The response to send
 * @param next {Function}  The next middle ware function to call
 */
router.get('/pantry', async (req, res, next) => {
	if (!checkIfInHousehold(req)) {
		res.status(401).json({ status: false, message: "User not in household" });
		return;
	}
	try {
		//Get the object
		var pantryObj = await req.collections.households.find({ _id: ObjectID(req.session.activeHousehold)}, { pantry: 1, _id: 0 }).toArray();

	} catch (ex) {
		//Log any errors that occur and give a generic error to client
		console.log("Failed to get pantry" + ex);
		res.status(500).json({ status: false, message: "Failed to retrieve data" });
		return;
	}
	//If no array exists, create an empty one
	if (!pantryObj[0].pantry) {
		pantryObj[0].pantry = [];
	}
	let forShopping = req.query.shopping? true:false;

	for(let i = pantryObj[0].pantry.length -1; i >=0; i--){
		let entry = pantryObj[0].pantry[i];
		let isShopping = entry.location == shoppingListStr
		
		if(forShopping != isShopping){
			console.log("Tossing" + JSON.stringify(entry));
			pantryObj[0].pantry.splice(i, 1);
		}
	}


	res.json({ status: true, pantry: pantryObj[0].pantry });



});


//Add an item to the pantry 
//TODO: FIX DUPE NAMES
/**
 * @brief Add an item to the pantry of the session's current household
 * @param req {Object} Incoming request
 * @param res {Object} The response to send
 * @param next {Function}  The next middle ware function to call
 */
router.put('/pantry', async (req, res, next) => {

	if (!checkIfInHousehold(req)) {
		res.status(401).json({ message: "User not in household" });
		return;
	}



	if (!validatePantryFieldsExist(req.body, res)) {
		console.log("Invalid pantry fields");
		return;
	}
	var newEntry = formatPantryObject(req.body);
	if (newEntry === undefined) {
		res.status(400).json({ message: "Invalid object format" + JSON.stringify(req.body)});
		return;
	}
	//False means function sent headers
	if (newEntry === false) {
		return;
	}


	try {
		//Update the household to contain the new pantry information
		await req.collections.households.updateOne({ _id: ObjectID(req.session.activeHousehold) }, { $push: { pantry: newEntry } });
		res.json({ entry: newEntry });
	} catch (ex) {
		console.error(ex);
		res.status(500).json({ message: "Failed to insert" });
	}
});


//Route to modify an existing item in the households pantry 
//  Uses the name of the item as a primary key, so if a front end submits a change to the name,
//      The route will deny the change due to being unable to find the item in the pantry.
//
// Status field will exist on all responses to this route

/**
 * @brief To update an object within the pantry of the active session
 *	Uses the name of the item as a primary key, so if a front end submits a change to the name,
 *		The route will deny the change due to being unable to find the item in the pantry.
 * 
 * @param req {Object} Incoming request
 * @param res {Object} The response to send
 * @param next {Function}  The next middle ware function to call
 */
router.patch("/pantry", async (req, res, next) => {

	//Make sure the user is in the household, should always be true but good to check
	if (!checkIfInHousehold(req)) {
		res.status(401).json({ message: "User not in household" });
		return;
	}

	//Ensure the submitted request has all fields, if any of missing function will send response
	if (!validatePantryFieldsExist(req.body, res)) {
		return;
	}

	//Now that all fields exist, apply all formatting needed before sending to the db
	var newEntry = formatPantryObject(req.body);
	if (newEntry == undefined) { //Either internal error or invalid input data
		res.status(400).json({ message: "Invalid object format" });
		return;
	}

	try {
		//Apply the update to the selected element in the array, and then send the update response
		await req.collections.households.updateOne({ _id: ObjectID(req.session.activeHousehold), "pantry.name": newEntry.name }, { $set: { "pantry.$": newEntry } });
		res.json({ status: true, updated: newEntry });

	} catch (ex) { //Failed to update, report a generic error to the front end and full details locally
		console.error("Failed to update pantry" + ex);
		res.status(500).json({ status: false, message: "Unable to update element" });
	}
})


//Route to delete data from the user's pantry
// The name is the only required field as it is used to find the item in the pantry.
// TODO: Make use of the quanity field to only remove select amounts? Or just leave for update?

/**
 * @Brief Route to delete an item in the active session's pantry
 * 
 * 
* @param req {Object} Incoming request
 * @param res {Object} The response to send
 * @param next {Function}  The next middle ware function to call
 */
router.delete("/pantry", async (req, res, next) => {

	//Make sure user is in house, should always pass but good to check
	if (!checkIfInHousehold(req)) {
		res.status(401).json({ message: "User not in household" });
		return;
	}

	//Ensure the name was given in the request
	if (!req.query.name) {
		console.log("No name specifed in delete" + JSON.stringify(req.query));
		res.status(400).json({ message: "No item specifed" });
		return;
	}

	try {
		//Delete that entry from the array and respond to user
		await req.collections.households.updateOne({ _id: ObjectID(req.session.activeHousehold) }, { $pull: { "pantry": { "name": req.query.name } } });
		res.json({ message: "item deleted" });
	} catch (ex) {
		//If failed, give generic error to the user and full error to console.
		console.error("Faled to delete in pantry" + ex);
		res.status(500).json({ message: "Unabled to delete element" });
	}

})

/**
 * 
 * @brief Route to add a member to the active household
 * 
 * @param req {Object} Incoming request
 * @param res {Object} The response to send
 * @param next {Function}  The next middle ware function to call
 */
router.put("/member", async (req, res, next) => {

	if (!req.body.username) {
		res.status(401).json({ status: false });
		console.log("No username in household/member/put");
		return;
	}

	if (!req.session.activeHousehold) {
		res.status(403).json({ status: false });
		console.log("User did not select a household before trying to add a user");
		return;
	}

	try {
		var user = await req.collections.users.findOne({ user: req.body.username }, { pass: 0 });
		//TODO: check if same member is already in household
		if (!user) {
			res.status(400).json({ status: false });
			console.log(req.body.username)
		}


		var result = await req.collections.households.updateOne({ _id: ObjectID(req.session.activeHousehold) }, { $push: { members: ObjectID(user._id).toString() } })
		if (!result) {
			console.log("Insert fail");
		}
	} catch (ex) {
		console.error(ex);
		res.status(500).json({ status: false });
	}

	res.json({ status: true });


})

//router.put("/user", (req, res, next)=>{

//});


/**
 * @brief Ensure an object contains all the required fields to be added to the pantry
 * 
 * @param {Object} pantryItem The object being checked to ensure it has required fields
 * @param res {Object} The express response object
 * @return {boolean} True if valid, false if not valid **AND** sends rejection JSON
 */
function validatePantryFieldsExist(pantryItem, res) {
	//The keys which must exist
	let keys = ["name", "quantity", "expires", "category", "tags", "location"]
	//If any of them are missing, notify client of invalid request
	for (key of keys) {
		if (!pantryItem[key]) {
			console.log("Invalid input of" + JSON.stringify(pantryItem) + " to validation on key" +key);
			res.status(400).json({ status: false, message: "Required field invalid" });
			return false;
		}
	}
	return true;


}

/**
 * @brief Convert a valid potential pantryItem into a pantry item
 * 
 * @param {Object} pantryItem A validated object to be formatted into the database form 
 * @return undefined if undefined parameter. false if field contains invalid data, Formatted object otherwise
 */
function formatPantryObject(pantryItem) {


	if (pantryItem == undefined) {
		console.error("formatPantryObject called with no object, returning undefined");
		return undefined;
	}

	//Create the object
	//TODO: Convert to loop? Issue is on the ones that need special handling
	var newEntry = {
		name: pantryItem.name,
		quantity: pantryItem.quantity,
		category: pantryItem.category,
		expires: pantryItem.expires,
		location: pantryItem.location
	};

	//If the quanity is less than 0, obviously incorrect
	if (newEntry.quantity < 0) {
		res.status(400).json({ message: "Need to have atleast one of item" });
		return false;
	}

	//Possibly add placeholder invalid value?
	// if(!newEntry.category){

	// }


	let rawTags = pantryItem.tags;
	//Split the tags on the commas, trim the extra whitespace, and remove duplicates to store only required data
	newEntry.tags = rawTags.split(",")
		.map((str) => { return str.trim() })
		.filter((val, index, self) => {
			return self.indexOf(val) == index && val.length;
		});

	return newEntry;

}

//This function returns true or false for if the user is a member of the activehousehold
// Right now it will always be true, however once a user is allowed to be removed from a household, it will be a good
//  safety net.

/**
 * @brief See if the user is in the household trying to modify
 * 
 * Right now it will always be true, however once a user is allowed to be removed from a household, it will be a good
 *  safety net.
 * @param req {Object} The express request object 
 * @return {boolean} True if in the household, False otherwise
 */
function checkIfInHousehold(req) {
	for (house of req.session.households) {
		if (house._id == req.session.activeHousehold) {
			return true;
		}
	}
	return false;
}

module.exports = router;
