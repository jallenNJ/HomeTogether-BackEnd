/**
 * @file HomeTogetherClient.js
 * @brief Source code to run the client side logic of the HomeTogetherApp
 * As this is code that goes to the client, it should be minified and without comments, however
 * that conflicts with the requirments of writing well formatted, documented code
 */

var houseData = {}; //Cache data from the server
var dynamicRoot; //All dynamix elements are part of this element

/// Constant defines for date expire logic
const neverExpireStr = "Never Expires";
const neverExpireEscapedStr = "Never%20Expires";
const neverExpireDate = "11 31, 2099";


$(document).ready(()=>{
    //Get the dynamic root element
    dynamicRoot = $("#dynroot");
    /**
     * @brief Handler for events which cause a sign-in or a log in
     * @param signUp If truthy, the user is signing up, otherwise logging in
     */
   
    const click = (signUp)=>{
        //Remove the keypress listners on the document, if they exist
        $(document).off("keypress", click);

        //Send an ajax put or post based on if the user is signing up or logging in
        $.ajax({
            type: signUp? "PUT":"POST",
            url:"/login",
            data:$("form").serialize(),
            success:()=>{ //If log in was successful
                //Clear the log in form
                dynamicRoot.empty();

                //Send a get to the household route to get all the houses a user is in
                $.get("/household",
                null, //No params are neded
                (data)=>{ //On success function

                    //For every household the user is in
                    for(house of data.households){
                        /*
                        * Creates a button with the text of the house name, and a data element id:house's id
                        * with an onclick to call the selectHousehold function, then add it the root
                        *
                        */
                        $("<button></button>").text(house.name).data("id", house._id).on("click", selectHousehold).appendTo(dynamicRoot);
                        dynamicRoot.append($("<br />"));
                    }
                    //If there were no houses, add a text output
                    if(data.households.length === 0){
                        $("<p></p>").text("No active households found").appendTo(dynamicRoot);
                    }
                    //Create the input field for creating a house
                    $("<input></input>").prop("name", "name").prop("placeholder", "Enter a household name").appendTo(dynamicRoot);
                    //And create a button to submit that household
                    $("<button></button>").text("Create").on("click", ()=>{
                        //If box is empty, return
                        let val = $("input").val();
                        if(!val){
                            return;
                        }

                        //Send the request to sign up the household
                        $.ajax({
                            type:"PUT",
                            url:"/household",
                            data:{name:val},
                            success: ()=>{alert("DID A SIGNUP");}
                        }).fail(()=>{alert("Failed to sign up");})

                    }).appendTo(dynamicRoot);
                });
            }}).fail(()=>{alert("Failed")});
        }     
        
    //Bind the on click lisntered to the given signUp and logIn buttons
    $("#signup").on("click", ()=>{click(true);});
    $("#logIn").on("click", ()=>{click(false);});
    //Bind an on keypress listener for enter(13)
    $(document).on("keypress", (key)=>{
        if(key.which == 13){ //13 is enter
            click(false) //False for log in
        }
    });    
});

/**
 * @brief This function is the onclick handler for a button to select the household
 * This requires the calling function to be a node that can be referenced with this and has
 * a datafield of id
 */
function selectHousehold(){
    //Send the query, with query parameters of id and activeData:true
    $.get("/household",
    {id:$(this).data("id"), activeData:true},
    (data)=>{
        //Cache the data, delete the pantry as that cache may be invalid later
        // and load the data
        houseData = data.house; 
        delete houseData.pantry;
        loadHouse();}
    );
}

/**
 * @brief Gets the most recent pantry data, and loads it
 */
function loadHouse(){
    dynamicRoot.empty();
//    dynamicRoot.append($("<button> Pantry </button>")).on("click", 
 //       ()=>{
            $.get("/household/pantry", {}, 
            (data)=>{  loadPantry(data.pantry)});
 //       }
//    );
}

/**
 * @brief Takes loaded pantry data, creates a table and allow user to interact with it
 * @param {*} pantryData The data to load in, should be an array of Pantry Objects
 */
function loadPantry(pantryData){
    //Clear all elements, and remove remaining listeners
    dynamicRoot.empty();
    dynamicRoot.off("click");
    //Create the member bar and attach
    generateMemberBar();

    //The format object containing all constants to be consitent with the app
    const formatObject = {
        allKeys : ["name", "quantity", "expires", "category", "location"],
        normalInputKeys : ["name", "quantity", "expires"],
        selectInputKeys : ["category", "location"],
        categories : ["Alcohol", "Beverage", "Grain", "Canned", "Frozen", "Fruit", "Vegetable", "Meat", "Ingredient", "Spice", "Seafood", "Other"],
        locations : ["pantry", "fridge", "freezer"]
    };
    //Create the table and the form
    generateTable(pantryData, formatObject.allKeys);
    generatePantryForm(formatObject);


    //TODO: Make buttons toggle correctly, and maybe store in array

    //Binding of the buttons
    //Delete button, which deletes the currently selected entry
    dynamicRoot.append($("<button></button>").text("Delete").on("click", ()=>{
        //Get the na,e
        let name = $("form input").first().val();
        //Ensure it is a valid object
        if(name === "" || name == undefined){
            console.log("Attempting to deleted with nothing selected");
            return;
        }
        //Cache the selected object in case the user clicks elsewhere
        let selected = $(".selectedItem");

        //Sned the delete request
        $.ajax({
            type:"delete",
            url:"/household/pantry",
            data: $("form").serialize(),
            success:(data)=>{ 
                //On success, remove the item and clear the form
                selected.remove();
                clearPantryForm();
            }
        });

    }));

    //Clear button to clear what is selected
    dynamicRoot.append($("<button></button>").text("Clear").on("click", ()=>{
        //Empty the form and make all selectedItems unselected
        clearPantryForm();
        $(".selectedItem").removeClass("selectedItem");
    }));

    //Button to update the selected item with the item in the form
    dynamicRoot.append($("<button></button>").text("Update").on("click", ()=>{
        //Ensure form is filled in with potentially valid data
        if(!validatePantryForm()){
            console.log("Implement handling on empty form on updated");
            return;
        }
        //Cache the selected item in case the user clicks elsewhere
        let selected = $(".selectedItem");
        $.ajax({
            type:"patch",
            url:"/household/pantry",
            //Get the form data, and replace neverExpires with the date for database entry
            //If this is skipped db will reject otherwise valid data
            data: $("form").serialize().replace(neverExpireEscapedStr, neverExpireDate),
            success:(data)=>{ 
                //Update the row with a new one, and clear the form
                selected.replaceWith(generateRow(formatObject.allKeys, data.updated));
                clearPantryForm();
            }
        });
    }));

    //Button to create a new entry from the form
    dynamicRoot.append($("<button></button>").text("Create").on("click", ()=>{
        //Ensure all fields have atleast potentially valid data
        if(!validatePantryForm()){
            console.log("Implement handling on empty form")
            return;
        }    

        //Send the request to add
        $.ajax({
            type:"put",
            url:"/household/pantry",
            //Get the form data, and replace neverExpires with the date for database entry
            //If this is skipped db will reject otherwise valid data
            data: $("form").serialize().replace(neverExpireEscapedStr, neverExpireDate),
            success:(data)=>{
                //Add the created row to the table and clear the form
                $("tbody").append(generateRow(formatObject.allKeys, data.entry))
                clearPantryForm();
            }
        });
    }));

    //Set current item to never expire
    dynamicRoot.append($("<button></button>").text(neverExpireStr).on("click", ()=>{
        $("#pfexpires").val(neverExpireStr).data("form", neverExpireDate);

    }))

    //Create the search option
   let search = $("<div></div>").prop("id", "pantrySearchBar");
   //Create the input box, and on key up search
    search.append($("<input></input>").attr("placeholder", "Type here to search").on("keyup", ()=>{
        //Get the input and force to lowercase
        let searchTerm = $("#pantrySearchBar input").val().toLowerCase();
        //For every row in the body
        for(let row of $("tbody tr")){
            //Get the name of the cell
            let cell = $(row).children().first();
           //Get the text as lowcase, and if the searchTerm is a substring, show it; else hide
            if(cell.text().toLowerCase().includes(searchTerm)){
                cell.parent().show();
            } else{
                cell.parent().hide();
            }
        }
    }));
    
    //Generate the selection boxes
    for(let field of [formatObject.categories, formatObject.locations]){
        search.append(createAndAddElementsToSelect(field).on("change", () =>{alert("Search now");}).hide());
    }

    //Logic to show which search terms
    search.append(createAndAddElementsToSelect(["Name", "Category", "Location"]).on("change",() => {
        //Show all
        $("#pantrySearchBar input, #pantrySearchBar select").show();
        switch($("#pantrySearchBar select").last().val()){
            case "Category": //Hide name and location
            $("#pantrySearchBar input, #pantrySearchBar select:eq(1)").hide();
            break;
            case "Location": //Hide name and category
            $("#pantrySearchBar input, #pantrySearchBar select:eq(0)").hide();
            break;
            case "Name": //Hide the select boxes
            $("#pantrySearchBar select:eq(0), #pantrySearchBar select:eq(1)").hide();
            default:
        }
    } ));
    dynamicRoot.append(search);
}

/**
 * @brief This function generates a table for the pantry scene
 * @param {*} tableData The JSONObject containing the data
 * @param {*} keys  The keys to be used from the object
 */
function generateTable(tableData, keys){
    //Create the table
    let table = ($("<table></table>"));
    dynamicRoot.append(table);
   
    //Format the head of the table
    let tHead = $("<thead></thead>");
    tHead.append(generateRow(keys, undefined));
    table.append(tHead);

    //Format the body
    let tBody = $("<tbody></tbody>");
    tBody.on("click", "tr", function(){
        //Ensure that only one is selected, and prefill the form
        $(".selectedItem").removeClass();
        $(this).toggleClass("selectedItem");
        prefillForm(); 
        return false;
    });
    table.append(tBody);
    //Create all the rows in the table
    for(let rowData of tableData){
        tBody.append(generateRow(keys, rowData));
    }
}

/**
 * @brief This function is responsible for formatting a row in the table
 * @param {*} keys The keys to use to make the row
 * @param {*} rowData If truthy, The data to read data from. Otherwise makes a header row
 */
function generateRow (keys, rowData){
    let row = $("<tr></tr>");
    for(let key of keys){

        let cell = rowData ?
        //Make a td, with a capitalized version as display data, and actualy data in the form data element
         $("<td></td>").text(capitilizeWord(rowData[key])).data("form", rowData[key])
         //Otherwise, make a header
         :$("<th></th>").text(capitilizeWord(key));

         //If the key is expires on a body row
        if(key == "expires" && rowData){
            //Format the date correctly
            cell.text(rowData[key] != neverExpireDate
                ?formatPantryDate(rowData[key])
                : neverExpireStr);
        }
        row.append(cell);
    }
    return row;
}

/**
 * @brief Creates the form to do crud on the pantry screen
 * @param {*} formatObject The format object contaning all the key defines
 */
function generatePantryForm(formatObject){
    //Create the form and assign it the form id
    let form = $("<form></form>");
    form.prop("id", "pantryForm");

    //For all the normal input 
    for(let key of formatObject.normalInputKeys){
        //Create the id by prefacing it with with pf for a unique identifie
        // and giving a form group for allignment reasions
        let id = "pf"+key;
        let group = $("<div></div>").addClass("formGroup");
        //Add the label for usability
        group.append($("<label></label>").prop("for", id).text(capitilizeWord(key) + ": "));
        //Any formatting relating to the date
        if(key == "expires"){
            let expiresInput = $("<input></input>").prop("id", id).prop("name", key).datepicker({
                dateFormat: "mm dd, yy"
              });;
            
            expiresInput.on("change", () =>{
                
                let date =  $(expiresInput).val();
                let dateSplit = date.split(" ");
                let rawFormat = dateSplit[0]-1 + " "+ dateSplit[1] +" " + dateSplit[2];

                expiresInput.val(formatPantryDate(rawFormat));   
                expiresInput.data("form", rawFormat);
            })
            //Ensure the user cannot edit the field to prevent unneeded rejection
            expiresInput.prop("readonly", true);
            group.append(expiresInput);
        } else{
            //If not date, just add it to the group
            group.append($("<input></input>").prop("id", id).prop("name", key));
        }
        form.append(group);
        
    }
    //Add a line break for formatting reasons
    form.append($("<br />"));
    //Create the select boxes
    let selectFields = [formatObject.categories, formatObject.locations]
    for(let option in selectFields){
        let selectBuffer = createAndAddElementsToSelect(selectFields[option], formatObject.selectInputKeys[option]);
        form.append(selectBuffer);    
    }

    dynamicRoot.append(form);
}

/**
 * @brief Creates a select elements and fills it full of options
 * @param elements The list of elements (Strings) to be used
 * @param selectName The name of created selected if provided
 */
function createAndAddElementsToSelect(elements, selectName){
    let selectBuffer = $("<select></select")
    if(selectName){ //Set the name if provided
        selectBuffer.prop("name", selectName);
    }

    //Added all the items as options under the select
    for(let item of elements){
        selectBuffer.append($("<option></option>").prop("value", item).text(item))
    }
    return selectBuffer;

}

/**
 * @brief Perfrom courtesy validation for the user to prevent unneed rejection
 * The server will reject any invalid request, however this function as imporant as the
 * call logic to report errors to the user is pretty ugly (mostly alerts) so its best to be avoided
 */
function validatePantryForm(){

    let index = 0;
    //For every field
    for(let field of $("#pantryForm input")){
        //index 1 is the quantity field, which needs to be a postive integer
        if(index == 1 && (isNaN($(field).val()|| $(field).val() <1))){
            return false;
        }
        //Ensure there is data in the field
        if($(field).val() === ""){
            console.log("False on " + $(field).prop("id"));
            return false;
        }
        index++;
    }

    return true;
}

/**
 * @brief Sets all fields in the pantry form to the defualt values
 */
function clearPantryForm(){
    for(let field of $("#pantryForm input")){
        $(field).val("");
    }

    //Ensure name is editable incase user wants to create
    $("form input").first().prop("readonly", false);
}
/**
 * @brief Prefill the form based on the selected element
 */
function prefillForm(){

    let selected = $(".selectedItem").first();
    let fieldText = [];
    let childCount = 0;
    //Get all the data from the field elemtns
    for(let child of selected.children("td")){
        childCount++;
        if(childCount == 3){ //If the expire field

            //If never expires, set the text never expires, otherwise the date
            //TODO: FORMAT DATE HERE IF ON CHANGE DOESN'T COVER IT
            fieldText.push($(child).data("form") == neverExpireDate
            ? neverExpireStr
            :formatPantryDate($(child).data("form")));
            continue;
        }
        fieldText.push($(child).data("form"));
    }
    //Set all the fields of the form
    let index = 0;
    for(let field of $("#pantryForm input, #pantryForm select")){

        $(field).val(fieldText[index]);
        index++;
    }

    //Set name to be not editable as it is immutable on the server
    $("#pantryForm input").first().prop("readonly", true);
}

/**
 * @breif Generate member bar and populate it with data
 */
function generateMemberBar(){
    //Create the dive
   let memberDiv =  $("<div></div>").prop("id","memberBar");
   //Add a placeholder text and add to root
    memberDiv.append($("<p></p>").text("Loading member data"));
    dynamicRoot.append(memberDiv);
    //Server want name comma seperated, so create that string
    let csvNames= "";
    for(let user of houseData.members){
        csvNames += user+",";
    }
    //Remove the last comma
    csvNames = csvNames.substr(0, csvNames.length-1);
    //Send the request to the server to get all the names
    $.ajax({
        type:"GET",
        url:"/users",
        data:{resolveIds:csvNames},
        success: (data) => {
            //Clear the place holder text and add the member label
            memberDiv.empty();
            memberDiv.append($("<p></p>").text("Members: "));
            houseData.members = [];
            //Name is the user object
            for(let name of data.names){
                //Create the button withe the name capitlized on it
                $("<button></button>").text(capitilizeWord(name.user)).on("click", ()=>{alert("Implement member button on click");}).appendTo(memberDiv);
                houseData.members.push(name);
            }
        } 
    }).fail(()=>{alert("Failed to query users")});
}

/**
 * @brief Takes the input word, and return it with the 0th character capitlized
 */
function capitilizeWord(word){
    return word.charAt(0).toUpperCase() + word.slice(1);
}


/**
 * @brief Formats the date to be displayed in pantry form
 * The formatDate function name is taken by the datePicker class
 * @param date A date string in the format "MM DD, YYYY"
 */
function formatPantryDate(date){
    //Split the date string into seperate terms
    let monthDayTokens = date.split(" ");
    let month = monthDayTokens[0];
    let day = monthDayTokens[1];
    let year = date.split(", ")[1];
    let monthFormatted;
    //Locailize the month
    switch (month){
        case "0": case "00": monthFormatted = "January "; break;
        case "1": case "01":monthFormatted = "Febuary "; break;
        case "2": case "02":monthFormatted = "March ";break;
        case "3": case "03":monthFormatted = "April ";break;
        case "4": case "04":monthFormatted = "May ";break;
        case "5": case "05":monthFormatted = "June ";break;
        case "6": case "06":monthFormatted = "July ";break;
        case "7": case "07":monthFormatted = "August ";break;
        case "8": case "08":monthFormatted = "September ";break;
        case "9": case "09":monthFormatted = "October ";break;
        case "10": monthFormatted = "November ";break;
        case "11": monthFormatted = "December ";break;
        default: monthFormatted ="Invalid ";
    }
    //Concat it together, day still contains the comma from the split
    return monthFormatted + day + " " + year;
}