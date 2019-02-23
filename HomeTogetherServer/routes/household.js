var express = require('express');
var router = express.Router();
const ObjectID = require('mongodb').ObjectID

//Get to the household
//Handles both all households an single household
//Single Household requires the query parameter id to be present
//  Also supports the ability to get the cache data

//All households takes no parameters and returns the list of all households the user is a member of
//Status parameter of result guarenteed to exist. May contain message on failure or house on caching
//  or the list of households
router.get('/', async function (req, res, next) {
    if (!checkIfLoggedIn(req, res)) {
        return;
    }

    //==Start of single house query
    if (req.query.id) {

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
                    res.json({ status: "false", message: "Internal server error" });
                }
                return;
            }

            res.json({ status: true });
        } else {
            res.json({ status: false, message: "Not allowed to modify that household" });
        }

        return;
    }
    //== END OF SINGLE HOUSE QUERY

    //If here, the user wants the list of all households they are apart of
    try {

        //Get the names and Ids of all households the user is in
        var result = await req.collections.households.find({ members: req.session.userId }, { name: 1 }).toArray();
        console.log(result);
    } catch (ex) {

        //If error, return the empty list for no houses
        console.error(ex);
        res.json({ households: [] });
        return;
    }

    //Copy the result into the session
    req.session.households = [];
    for (let house of result) {
        req.session.households.push(house);
    }

    //return the result
    res.json({ households: result });
    return;
});

//Route for creating a new household
//Status and Message fields will always exist in repsonse, however message may be the empty string;
router.put('/', async (req, res, next) => {

    //Ensure user is logged in
    if (!checkIfLoggedIn(req, res)) {
        return;
    }
    //If user is logged in but no username. This is an error state in the server
    if (!req.session.userId) {
        console.error(req.session.username + " did not have userId attached");
        res.json({ status: false, message: "Invalid session, please log in again" });
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
        res.json({ status: false, message: "" });
    }

    res.json({ status: true, message: "" });
    return;


});



//Gets the data of what items are inside the pantry 
//Status will always exist. On errors, message will exist, otherwise the pantry field will exist
router.get('/pantry', async (req, res, next) => {
    //Ensure user is logged in
    if (!checkIfLoggedIn(req, res)) {
        return;
    }
    if(!checkIfInHousehold(req)){
        res.json({status:false, message:"User not in household"});
        return;
    }
    try {
        //Get the object
        var pantryObj = await req.collections.households.find({ _id: ObjectID(req.session.activeHousehold) }, { pantry: 1, _id: 0 }).toArray();

    } catch (ex) {
        //Log any errors that occur and give a generic error to client
        console.log("Failed to get pantry" + ex);
        res.json({ status: false, message: "Failed to retrieve data" });
        return;
    }
    //If no array exists, create an empty one
    if (!pantryObj[0].pantry) {
        pantryObj[0].pantry = [];
    }
    res.json({ status: true, pantry: pantryObj[0].pantry });



});


//Add an item to the pantry 
router.put('/pantry', async (req, res, next) => {
    //Ensure user is logged in
    if (!checkIfLoggedIn(req, res)) {
        return;
    }
    if(!checkIfInHousehold(req)){
        res.json({status:false, message:"User not in household"});
        return;
    }



    if(!validatePantryFieldsExist(req.body, res)){
        return;
    }
    var newEntry = formatPantryObject(req.body);
    if(newEntry === undefined){
        res.json({status:false, message:"Invalid object format"});
        return;
    }
    //False means function sent headers
    if(newEntry === false){
        return;
    }


    try {
        //Update the household to contain the new pantry information
        await req.collections.households.updateOne({ _id: ObjectID(req.session.activeHousehold) }, { $push: { pantry: newEntry } });
        res.json({ status: true, entry: newEntry });
    } catch (ex) {
        console.error(ex);
        res.json({ status: false, message: "Failed to insert" });
    }
});

router.patch("/pantry", async(req, res, next)=>{

    //Ensure user is logged in
    if (!checkIfLoggedIn(req, res)) {
        return;
    }

    if(!checkIfInHousehold(req)){
        res.json({status:false, message:"User not in household"});
        return;
    }

    if(!validatePantryFieldsExist(req.body, res)){
        return;
    }
    var newEntry = formatPantryObject(req.body);
    if(newEntry == undefined){
        res.json({status:false, message:"Invalid object format"});
        return;
    }


    try{
        await req.collections.households.updateOne({_id:ObjectID(req.session.activeHousehold), "pantry.name":newEntry.name}, {$set: {"pantry.$": newEntry}});
        res.json({status:true, updated:newEntry});

    } catch (ex){
        console.error("Failed to update pantry" + ex);
        res.json({status:false, message:"Unable to update element"});
    }

    //res.json({status:false, message:"Not implemeneted"});


})

router.delete("/pantry", async(req,res,next) =>{
    //Ensure user is logged in
    if (!checkIfLoggedIn(req, res)) {
        return;
    }

    if(!checkIfInHousehold(req)){
        res.json({status:false, message:"User not in household"});
        return;
    }

    if(!req.query.name){
        console.log("No name specifed in delete" +  JSON.stringify(req.query));
        res.json({status:false, message:"No item specifed"});
        return;
    }

    try{
        await req.collections.households.updateOne({_id:ObjectID(req.session.activeHousehold)}, {$pull: {"pantry":{"name":req.query.name}}});
        res.json({status:true, message:"item deleted"});
    } catch (ex){
        console.error("Faled to delete in pantry" + ex);
        res.json({status:false, message:"Unabled to delete element"});
    }

})


function validatePantryFieldsExist(pantryItem, res){
    //The keys which must exist
    let keys = ["name", "quantity", "expires", "category", "tag"]
    //If any of them are missing, notify client of invalid request
    for (key of keys) {
        if (!pantryItem[key]) {
            res.json({ status: false, message: "Required field invalid" });
            return false;
        }
    }
    return true;


}

function formatPantryObject(pantryItem){

    
    if(pantryItem == undefined){
        console.error("formatPantryObject called with no object, returning undefined");
        return undefined;
    }

    //Create the object
    //TODO: Convert to loop? Issue is on the ones that need special handling
    var newEntry = {
        name: pantryItem.name,
        quantity: pantryItem.quantity,
        category: pantryItem.category,
        expires: pantryItem.expires
    };

    //If the quanity is less than 0, obviously incorrect
    if (newEntry.quantity < 0) {
        res.json({ status: false, message: "Need to have atleast one of item" });
        return false;
    }

    //Possibly add placeholder invalid value?
    // if(!newEntry.category){

    // }


    let rawTags = pantryItem.tag;
    //Split the tags on the commas, trim the extra whitespace, and remove duplicates to store only required data
    newEntry.tags = rawTags.split(",")
        .map((str) => { return str.trim() })
        .filter((val, index, self) => {
            return self.indexOf(val) == index && val.length;
        });

    return newEntry;    

}

//Function to check if a user is logged in. If they are not, terminates the route
// Also TODO: Check if res should be passed in
function checkIfLoggedIn(req, res) {
    if (!req.session.username) {
        console.log("Unauthorized user attempting to access a protected route");
        res.json({ status: false, message: "Need to be logged in to do that" });
        return false;
    }
    return true;
}

function checkIfInHousehold(req){
    for (house of req.session.households) {
        if (house._id == req.session.activeHousehold) {
            return true;
        }
    }
    return false;
}

module.exports = router;
