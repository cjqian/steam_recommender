function submitSteamID(){
    alert(steamID);
} 

var setPrice = function(string){
    return "$" + string.substring(0, string.length - 2) + "." + string.substring(string.length - 2, string.length);
}

var getSteamUrl = function(appID){
    url = "http://store.steampowered.com/app/" + appID;
    return url;
}

var imageError = function(title){
    console.log("Error on " + title);
    $('#brokenCover').text("<h2>" + title + "</h2>");
}


