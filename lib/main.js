var apiToken = "";
var apiURL = "https://tappecue.babyvelociraptor.com/";
var smokeData = {};
var timeZone = "";
var currentSession = 1;
var probeChecker;

$(document).ready(function () {
    "use strict";
    $('#loginbtn').click(function () {
        connect($('#username').val(), $('#pw').val());
    });
});

function connect(username, pw) {
    "use strict";
    var loginString = "username=" + username + "&password=" + pw;
    var req = new XMLHttpRequest();
    req.open('POST', apiURL + 'login', true);
    req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    req.addEventListener('load', function () {
        var responseVals = JSON.parse(req.responseText);
        var responseCode = req.status;
        console.log(responseVals);
        if (responseCode === 200) {
            apiToken = responseVals["X-Auth-Token"];
            $("#connect").collapse("hide");
            $("#sessionselect").collapse("show");
            $("#sessionMessage").html("Login successful! Probe temps below.");
            $("#loginmessage").html("Log out of Tappecue");
            $("#pw").removeClass("alert-danger");
            $("#username").removeClass("alert-danger");
            getTimeZone(apiToken);
            getSessionList(apiToken);
        }
        if (responseCode === 403) {
            $("#pw").addClass("alert-danger");
            $("#username").addClass("alert-danger");
            $("#sessionMessage").html("Please check your username and password and try again.");
        }
    });

    req.send(loginString);
}

function getSessionList(apiToken) {
    "use strict";
    var req = new XMLHttpRequest();
    req.open('GET', apiURL + 'sessions', true);
    req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    req.setRequestHeader("X-Auth-Token", apiToken);
    req.addEventListener('load', function () {
        var responseVals = JSON.parse(req.responseText);
        var responseCode = req.status;
        if (responseCode === 200) {
            var sesssionMessage = "Session name: " + responseVals[0].name + "</br>";
            sesssionMessage += "Start time: " + responseVals[0].start;
            $("#sessionMessage").html(sesssionMessage);
            getSessionData(apiToken, currentSession);
            probeChecker = setInterval(displayProbes, 60000);
        }
        if (responseCode === 403) {
            $("#sessions").html("No session data available");
        }
    });

    req.send();

}

function getSessionData(apiToken, sessionID) {
    "use strict";
    var req = new XMLHttpRequest();
    req.open('GET', apiURL + 'session/' + sessionID, true);
    req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    req.setRequestHeader("X-Auth-Token", apiToken);
    req.addEventListener('load', function () {
        var responseVals = JSON.parse(req.responseText);
        var responseCode = req.status;
        if (responseCode === 200) {
            smokeData = JSON.parse(req.responseText);
            console.log(smokeData);
            $("#probe1").html("Probe 1 Name: "+smokeData["1"]["name"]+"</br>Temp: " + smokeData["1"]["current_temp"]);
            $("#probe2").html("Probe 2 Name: "+smokeData["2"]["name"]+"</br>Temp: " + smokeData["2"]["current_temp"]);
            $("#probe3").html("Probe 3 Name: "+smokeData["3"]["name"]+"</br>Temp: " + smokeData["3"]["current_temp"]);
            $("#probe4").html("Probe 4 Name: "+smokeData["4"]["name"]+"</br>Temp: " + smokeData["4"]["current_temp"]);
        }

        if (responseCode === 403) {
            smokeData = {};
            $("#sessions").html("No session data available");
        }
    });

    req.send();

}


function getTimeZone(apiToken) {
    "use strict";
    var req = new XMLHttpRequest();
    req.open('GET', apiURL + 'timezone', true);
    req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    req.setRequestHeader("X-Auth-Token", apiToken);
    req.addEventListener('load', function () {
        var responseVals = JSON.parse(req.responseText);
        var responseCode = req.status;
        if (responseCode === 200) {
            $("#timezone").html(responseVals["timezone"]);
            timeZone = responseVals["timezone"];
        }
    });

    req.send();

}

function setTimeZone(apiToken, tz) {
    "use strict";
    var timeZoneString = "timezone=" + tz;
    var req = new XMLHttpRequest();
    req.open('POST', apiURL + 'timezone', true);
    req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    req.setRequestHeader("X-Auth-Token", apiToken);
    req.addEventListener('load', function () {
        var responseVals = JSON.parse(req.responseText);
        var responseCode = req.status;
        if (responseCode === 200) {
            $("#timezone").html(responseVals["timezone"]);
            timeZone = responseVals["timezone"];
        }
    });

    req.send(timeZoneString);

}

function displayProbes() {
    "use strict";
    getSessionData(apiToken, currentSession);
}


function signout() {
    "use strict";
    apiToken = "";
    smokeData = {};
    $("#connect").collapse("show");
    $("#sessionselect").collapse("hide");
    $("#sessionMessage").html("Login to select your Tappecue session");
    $("#loginmessage").html("Log in to Tappecue");
    $("#sessions").html("Your sessions will be here once you login.");
    clearInterval(probeChecker);

}
