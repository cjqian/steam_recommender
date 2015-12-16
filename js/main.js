var gameTitles;

/* URLS */
var gameURL = "https://store.steampowered.com/app/";

$(document).ready(function () {
    /* Load titles */
    $.getJSON("./../data/titles.json", function(json) {
        gameTitles = json.applist.apps.app;
        loadTable();
    });
});

function loadTable() {
    $('#recommendationTable').dynatable({
        dataset: {
            records : gameTitles
        }
    });
}
function getRecommendation() {
    var titlesLength = gameTitles.length;
    var index = Math.floor(Math.random() * (titlesLength));

    var fullGameURL = gameURL + gameTitles[index].appid;
    document.getElementById("recommendationDiv").innerHTML = "<a href = " + fullGameURL + ">" + gameTitles[index].name + "</a>";

}

