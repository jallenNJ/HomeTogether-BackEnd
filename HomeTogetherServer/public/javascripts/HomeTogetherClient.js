var houseData = {};
var body;

$(document).ready(()=>{
    body = $("body");
    const click = ()=>{
        $(document).off("keypress", click);

        $.post(
            "/login",
            $("form").serialize(),
            ()=>{
                
                body.empty();

                $.get("/household",
                null,
                (data)=>{

                   // console.log(JSON.stringify(data));
                    for(house of data.households){
                        $("<button></button>").text(house.name).data("id", house._id).on("click", selectHousehold).appendTo(body);
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
    body.empty();
    body.append($("<p> Do member bar</p>"));
    body.append($("<button> Pantry </button>")).on("click", $.get("/household/pantry", {}, (data)=>{ 
        loadPantry(data.pantry)}
        ));
}

function loadPantry(pantryData){
    body.empty();
    let keys = ["name", "quantity", "expires", "category", "tags", "location"];
    generateTable(pantryData, keys);
    generatePantryForm(keys);

    body.append($("<button></button>").text("Delete"));
    body.append($("<button></button>").text("Update"));
    body.append($("<button></button>").text("Create").on("click", ()=>{
        if(!validatePantryForm()){
            console.log("Implement handling on empty form")
            return;
        }
        $.ajax({
            type:"put",
            url:"/household/pantry",
            data: $("form").serialize(),
            success:(data)=>{$("table").append(generateRow(keys, data.entry));}

    });



    }));
}

function generateTable(tableData, keys){
    let table = ($("<table></table>"));
    body.append(table);
   
    let tHead = $("<thead></thead>");
    tHead.append(generateRow(keys, undefined));
    table.append(tHead);
    let tBody = $("<tbody></tbody>");
    tBody.on("click", "tr", function(){
        $(".selectedItem").removeClass();
        $(this).toggleClass("selectedItem"); 
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

function generatePantryForm(keys){
    let form = $("<form></form>");
    for(let key of keys){
        let id = "pf"+key;
        form.append($("<label></label>").prop("for", id).text(key));
        form.append($("<input></input>").prop("id", id).prop("name", key));

    }
    body.append(form);
}

function validatePantryForm(){

    for(let field of $("form input")){
        if($(field).val() === ""){
            console.log("False on " + $(field).prop("id"));
            return false;
        }
    }

    return true;
}
function clearPantryForm(){

}