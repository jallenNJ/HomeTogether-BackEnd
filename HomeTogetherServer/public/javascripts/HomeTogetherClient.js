var houseData = {};
var body;

$(document).ready(()=>{
    body = $("body");
    const click = ()=>{
        $(document).off("keypress");
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
    $(document).on("keypress", (key)=>{if(key.which == 13){click()}}); 

   
});

function  selectHousehold(){
    $.get("/household",
    {id:$(this).data("id"), activeData:true},
    (data)=>{houseData = data.house; delete houseData.pantry; loadHouse();}
    );
}

function loadHouse(){
    body.empty();
    body.append($("<p> Do member bar</p>"));
    body.append($("<button> Pantry </button>")).on("click", $.get("/household/pantry", {}, (data)=>{loadPantry(data.pantry)}));
}

function loadPantry(pantryData){
    body.empty();
    let keys = ["name", "quanitity", "expires", "category", "tags"];
    generateTable(pantryData, keys);
   
}

function generateTable(tableData, keys){
    let table = ($("<table></table>"));
    body.append(table);
   

    const generateRow = (rowData) =>{
        let row = $("<tr></tr>");
        for(let key of keys){
            let cell = rowData? $("<td></td>").text(rowData[key]):$("<th></th>").text(key); 
            row.append(cell);
        }
        if(rowData){
            row.on("click", (clicked)=>{$(clicked).toggleClass("selected");});
        }
        return row;

    }
    let tHead = $("<thead></thead>");
    tHead.append(generateRow(undefined));
    table.append(tHead);
    let tBody = $("<tbody></tbody>");
    table.append(tBody);
    for(let rowData of tableData){
        tBody.append(generateRow(rowData));
    }
}
