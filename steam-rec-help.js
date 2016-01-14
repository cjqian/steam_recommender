$(".dropdown dt a").on('click', function() {
    $(".dropdown dd ul").slideToggle('fast');
});

$(".dropdown dd ul li a").on('click', function() {
    $(".dropdown dd ul").hide();
});

$(document).bind('click', function(e) {
    var $clicked = $(e.target);
    if (!$clicked.parents().hasClass("dropdown")) $(".dropdown dd ul").hide();
});

$('.mutliSelect input[type="checkbox"]').on('click', function() {

    var title = $(this).closest('.mutliSelect').find('input[type="checkbox"]').val(),
    title = $(this).val() + ",";

if ($(this).is(':checked')) {
    var html = '<span title="' + title + '">' + title + '</span>';
    $('.multiSel').append(html);
    $(".hida").hide();
} else {
    $('span[title="' + title + '"]').remove();
    var ret = $(".hida");
    $('.dropdown dt a').append(ret);

}
});

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


