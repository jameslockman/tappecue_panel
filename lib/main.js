var apiToken = "";
var apiURL = "https://tappecue-staging.babyvelociraptor.com/";
var smokeData = {};

$(document).ready(function() {
    "use strict";
    $('#loginBtn').click(function() {
      connect($('#username').val(),$('#pw').val());
    });
});

function connect(username,pw) {
    "use strict";
    console.log("U:"+username+" P:"+pw);
    //var loginString  = '{"username":"'+encodeURIComponent(username)+'","password":"'+encodeURIComponent(pw)+'"}';
    var loginString  = "username="+username+"&password="+pw;
    var req = new XMLHttpRequest();
    req.open('POST', apiURL + 'login',true);
    req.setRequestHeader("username",username);
    req.setRequestHeader("password",pw);
    req.addEventListener('load', function () {
        var responseVals = JSON.parse(req.responseText);
        apiToken = responseVals["X-Auth-Header"];
        $("#X-Auth-Header").html(req.responseText);
    });
    
    req.send(loginString);
}
