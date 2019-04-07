var houseData = {};
var dynamicRoot;

$(document).ready(()=>{
    dynamicRoot = $("#dynroot");
    const click = ()=>{
        $(document).off("keypress", click);

        $.post(
            "/login",
            $("form").serialize(),
            ()=>{  
                dynamicRoot.empty();

                $.get("/household",
                null,
                (data)=>{
                    for(house of data.households){
                        $("<button></button>").text(house.name).data("id", house._id).on("click", selectHousehold).appendTo(dynamicRoot);
                    }
                });
            });
        }        

    $("button").on("click", click);
    $(document).on("keypress", (key)=>{
        if(key.which == 13){
            click()
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
    dynamicRoot.append($("<p> Do member bar</p>"));
    dynamicRoot.append($("<button> Pantry </button>")).on("click", $.get("/household/pantry", {}, 
        (data)=>{  loadPantry(data.pantry)}));
}

function loadPantry(pantryData){
    dynamicRoot.empty();
    dynamicRoot.off("click");

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
            data: $("form").serialize(),
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
            data: $("form").serialize(),
            success:(data)=>{
                $("table").append(generateRow(formatObject.allKeys, data.entry))
                clearPantryForm();
            }
        });
    }));

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
        let cell = rowData ? $("<td></td>").text(rowData[key]):$("<th></th>").text(key); 
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
        form.append($("<input></input>").prop("id", id).prop("name", key));
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
    for(let child of selected.children("td")){
        fieldText.push($(child).text());
    }
    let index = 0;
    for(let field of $("#pantryForm input, #pantryForm select")){
        $(field).val(fieldText[index]);
        index++;
    }

    $("#pantryForm input").first().prop("readonly", true);
}