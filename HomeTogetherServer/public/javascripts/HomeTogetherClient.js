var houseData = {};
var dynamicRoot;

const neverExpireStr = "Never Expires";
const neverExpireEscapedStr = "Never%20Expires";
const neverExpireDate = "11 31, 2099";

$(document).ready(()=>{
    dynamicRoot = $("#dynroot");
    const click = (signUp)=>{
        $(document).off("keypress", click);
        $.ajax({
            type: signUp? "PUT":"POST",
            url:"/login",
            data:$("form").serialize(),
            success:()=>{  
                dynamicRoot.empty();

                $.get("/household",
                null,
                (data)=>{
                    for(house of data.households){
                        $("<button></button>").text(house.name).data("id", house._id).on("click", selectHousehold).appendTo(dynamicRoot);
                    }
                    if(data.households.length === 0){
                        $("<p></p>").text("No active households found").appendTo(dynamicRoot);
                    }
                    $("<input></input>").prop("name", "name").prop("placeholder", "Enter a household name").appendTo(dynamicRoot);
                    $("<button></button>").text("Create").on("click", ()=>{
                        let val = $("input").val();
                        if(!val){
                            return;
                        }
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
    $("#signup").on("click", ()=>{click(true);});
    $("#logIn").on("click", ()=>{click(false);});
    $(document).on("keypress", (key)=>{
        if(key.which == 13){
            click(false)
        }
    });    
});

function selectHousehold(){
    $.get("/household",
    {id:$(this).data("id"), activeData:true},
    (data)=>{
        houseData = data.house; 
        delete houseData.pantry;
        loadHouse();}
    );
}

function loadHouse(){
    dynamicRoot.empty();
//    dynamicRoot.append($("<button> Pantry </button>")).on("click", 
 //       ()=>{
            $.get("/household/pantry", {}, 
            (data)=>{  loadPantry(data.pantry)});
 //       }
//    );
}

function loadPantry(pantryData){
    dynamicRoot.empty();
    dynamicRoot.off("click");
    generateMemberBar();

    const formatObject = {
        allKeys : ["name", "quantity", "expires", "category", "location"],
        normalInputKeys : ["name", "quantity", "expires"],
        selectInputKeys : ["category", "location"],
        categories : ["Alcohol", "Beverage", "Grain", "Canned", "Frozen", "Fruit", "Vegetable", "Meat", "Ingredient", "Spice", "Seafood", "Other"],
        locations : ["pantry", "fridge", "freezer"]
    };
    generateTable(pantryData, formatObject.allKeys);
    generatePantryForm(formatObject);

    dynamicRoot.append($("<button></button>").text("Delete").on("click", ()=>{
        let name = $("form input").first().val();
        if(name === "" || name == undefined){
            console.log("Attempting to deleted with nothing selected");
            return;
        }
        let selected = $(".selectedItem");

        $.ajax({
            type:"delete",
            url:"/household/pantry",
            data: $("form").serialize(),
            success:(data)=>{ 
                selected.remove();
                clearPantryForm();
            }
        });

    }));

    dynamicRoot.append($("<button></button>").text("Clear").on("click", ()=>{
        clearPantryForm();
        $(".selectedItem").removeClass("selectedItem");
    }));

    dynamicRoot.append($("<button></button>").text("Update").on("click", ()=>{
        if(!validatePantryForm()){
            console.log("Implement handling on empty form on updated");
            return;
        }
        let selected = $(".selectedItem");
        $.ajax({
            type:"patch",
            url:"/household/pantry",
            data: $("form").serialize().replace(neverExpireEscapedStr, neverExpireDate),
            success:(data)=>{ 
                selected.replaceWith(generateRow(formatObject.allKeys, data.updated));
                clearPantryForm();
            }
        });
    }));

    dynamicRoot.append($("<button></button>").text("Create").on("click", ()=>{
        if(!validatePantryForm()){
            console.log("Implement handling on empty form")
            return;
        }    

        $.ajax({
            type:"put",
            url:"/household/pantry",
            data: $("form").serialize().replace(neverExpireEscapedStr, neverExpireDate),
            success:(data)=>{
                $("table").append(generateRow(formatObject.allKeys, data.entry))
                clearPantryForm();
            }
        });
    }));

    dynamicRoot.append($("<button></button>").text(neverExpireStr).on("click", ()=>{
        $("#pfexpires").val(neverExpireStr).data("form", neverExpireDate);

    }))

   let search = $("<div></div>").prop("id", "pantrySearchBar");
    search.append($("<input></input>").attr("placeholder", "Type here to search").on("keyup", ()=>{
        let searchTerm = $("#pantrySearchBar input").val().toLowerCase();
        for(let row of $("tbody tr")){
            let cell = $(row).children().first();
           
            if(cell.text().toLowerCase().includes(searchTerm)){
                cell.parent().show();
            } else{
                cell.parent().hide();
            }
        }
    }));
    
    for(let field of [formatObject.categories, formatObject.locations]){
        search.append(createAndAddElementsToSelect(field).on("change", () =>{alert("Search now");}).hide());
    }

    search.append(createAndAddElementsToSelect(["Name", "Category", "Location"]).on("change",() => {
        $("#pantrySearchBar input, #pantrySearchBar select").show();
        switch($("#pantrySearchBar select").last().val()){
            case "Category":
            $("#pantrySearchBar input, #pantrySearchBar select:eq(1)").hide();
            break;
            case "Location":
            $("#pantrySearchBar input, #pantrySearchBar select:eq(0)").hide();
            break;
            case "Name":
            $("#pantrySearchBar select:eq(0), #pantrySearchBar select:eq(1)").hide();
            default:
        }
    } ));
    dynamicRoot.append(search);

    //dynamicRoot.append($("<input></input>"))
}

function generateTable(tableData, keys){
    let table = ($("<table></table>"));
    dynamicRoot.append(table);
   
    let tHead = $("<thead></thead>");
    tHead.append(generateRow(keys, undefined));
    table.append(tHead);
    let tBody = $("<tbody></tbody>");
    tBody.on("click", "tr", function(){
        $(".selectedItem").removeClass();
        $(this).toggleClass("selectedItem");
        prefillForm(); 
        return false;
    });
    table.append(tBody);
    for(let rowData of tableData){
        tBody.append(generateRow(keys, rowData));
    }
}
function generateRow (keys, rowData){
    let row = $("<tr></tr>");
    for(let key of keys){

        let cell = rowData ? $("<td></td>").text(capitilizeWord(rowData[key])).data("form", rowData[key]):$("<th></th>").text(capitilizeWord(key));
        if(key == "expires" && rowData){
        
            cell.text(rowData[key] != neverExpireDate?formatPantryDate(rowData[key]): neverExpireStr);
        }
        row.append(cell);
    }
    return row;
}

function generatePantryForm(formatObject){
    let form = $("<form></form>");
    form.prop("id", "pantryForm");
    for(let key of formatObject.normalInputKeys){
        let id = "pf"+key;
        form.append($("<label></label>").prop("for", id).text(key));
        if(key == "expires"){
            let expiresInput = $("<input></input>").prop("id", id).prop("name", key).datepicker({
                dateFormat: "mm dd, yy"
              });;
            
            expiresInput.on("change", () =>{
            
                let date =  $(expiresInput).datepicker("getDate");
                expiresInput.val(date.getMonth() + " " + date.getDay() + ", " + date.getFullYear());   
                expiresInput.data("form", expiresInput.val());
            })
            expiresInput.prop("readonly", true);
            form.append(expiresInput);
        } else{
            form.append($("<input></input>").prop("id", id).prop("name", key));
        }
        
    }

    let selectFields = [formatObject.categories, formatObject.locations]
    for(let option in selectFields){
        let selectBuffer = createAndAddElementsToSelect(selectFields[option], formatObject.selectInputKeys[option]);
        form.append(selectBuffer);    
    }

    dynamicRoot.append(form);
}


function createAndAddElementsToSelect(elements, selectName){
    let selectBuffer = $("<select></select")
    if(selectName){
        selectBuffer.prop("name", selectName);
    }

    for(let item of elements){
        selectBuffer.append($("<option></option>").prop("value", item).text(item))
    }
    return selectBuffer;

}

function validatePantryForm(){

    for(let field of $("#pantryForm input")){
        if($(field).val() === ""){
            console.log("False on " + $(field).prop("id"));
            return false;
        }
    }

    return true;
}
function clearPantryForm(){
    for(let field of $("#pantryForm input")){
        $(field).val("");
    }

    $("form input").first().prop("readonly", false);
}
function prefillForm(){
    let selected = $(".selectedItem").first();
    let fieldText = [];
    let childCount = 0;
    for(let child of selected.children("td")){
        childCount++;
        if(childCount == 3){
            fieldText.push($(child).data("form") == neverExpireDate? neverExpireStr:$(child).data("form"));
            continue;
        }
        fieldText.push($(child).data("form"));
    }
    let index = 0;
    for(let field of $("#pantryForm input, #pantryForm select")){

        $(field).val(fieldText[index]);
        index++;
    }

    $("#pantryForm input").first().prop("readonly", true);
}

function generateMemberBar(){
   let memberDiv =  $("<div></div>").prop("id","memberBar");
    memberDiv.append($("<p></p>").text("Loading member data"));
    dynamicRoot.append(memberDiv);
    let csvNames= "";
    for(let user of houseData.members){
        csvNames += user+",";
    }
    csvNames = csvNames.substr(0, csvNames.length-1);
    $.ajax({
        type:"GET",
        url:"/users",
        data:{resolveIds:csvNames},
        success: (data) => {
            memberDiv.empty();
            memberDiv.append($("<p></p>").text("Members: "));
            houseData.members = [];
            //Name is the user object
            for(let name of data.names){
                $("<button></button>").text(capitilizeWord(name.user)).on("click", ()=>{alert("Implement member button on click");}).appendTo(memberDiv);
                houseData.members.push(name);
            }
        } 
    }).fail(()=>{alert("Failed to query users")});
}

function capitilizeWord(word){
    return word.charAt(0).toUpperCase() + word.slice(1);
}


//formatDate is taken
function formatPantryDate(date){
    let monthDayTokens = date.split(" ");
    let month = monthDayTokens[0];
    let day = monthDayTokens[1];
    let year = date.split(", ")[1];
    let monthFormatted;
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
        case "10": monthFormatted = "November";break;
        case "11": monthFormatted = "December ";break;
        default: monthFormatted ="Invalid ";
    }
    return monthFormatted + day + " " + year;
}