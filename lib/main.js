var apiToken = "";
var apiURL = "https://tappecue.babyvelociraptor.com/";
var smokeData = {};

$(document).ready(function() {
    "use strict";
    $('#loginBtn').click(function() {
      connect($('#username').val(),$('#pw').val());
    });
});

function connect(username,pw) {
    "use strict";
    var req = new XMLHttpRequest();
    req.open('POST', apiURL + 'login/',true);
    req.setRequestHeader("username",username);
    req.setRequestHeader("password",pw);
    req.addEventListener('load', function () {
        var responseVals = JSON.parse(req.responseText);
        apiToken = responseVals["X-Auth-Header"];
        $("#X-Auth-Header").html(req.responseText);
    });
    req.send();
}
