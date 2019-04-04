var houseData = {};
var body;

$(document).ready(()=>{
    body = $("body");
    $("button").on("click", ()=>{
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
    });
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
    let table = ($("<table></table>"));
    body.append(table);
   
    let headers = $("<tr></tr>");

    for(let header in pantryData[0]){
        if(!pantryData[0].hasOwnProperty(header)){
            continue;
        }
        let headerCell = $("<th></th>").text(header);
        headers.append(headerCell);

    }
    let tHead = $("<thead></thead>");
    tHead.append(headers);
    table.append(tHead);
    let tBody = $("<tbody></tbody>");
    table.append(tBody);
    for(let rowData of pantryData){
        let row = $("<tr></tr>");
        for(let cellData in rowData){
            if(!rowData.hasOwnProperty(cellData)){
                continue;
            }
            let cell = $("<td></td>");
            cell.text(rowData[cellData]);
            row.append(cell);
        }
        tBody.append(row);
    }
}