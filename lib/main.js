var apiToken = "";
var apiURL = "https://tappecue.babyvelociraptor.com/";
var smokeData = {};
var timeZone = "";
var currentSession = 1;
var probeChecker;
var amLoggedIn = false;
var timerRunning = false;
var timerInterval = 15; //interval in seconds.
var warningThreshold = 5; // units is Tappecue units

$(document).ready(function () {
    "use strict";
    console.log("Booting up");
    $('#loginbtn').click(function () {
        connect($('#username').val(), $('#pw').val());
    });
    console.log("checking token");
    //console.log(getCookie("tappecueSession"));
    console.log("storage path: " + getStoragePath());
    getToken();
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
            amLoggedIn = true;
            timerRunning = false;
            apiToken = responseVals["X-Auth-Token"];
            $("#connect").collapse("hide");
            $("#sessionselect").collapse("show");
            $("#sessionMessage").html("Login successful! Probe temps below.");
            $("#loginmessage").html("Log out of Tappecue");
            $("#pw").removeClass("alert-danger");
            $("#username").removeClass("alert-danger");
            getTimeZone(apiToken);
            $("#extensionInfo").hide();
            var tappecueSession = {};
            tappecueSession.username = username;
            tappecueSession.pw = pw;
            tappecueSession.token = apiToken;
            //setCookie("tappecueSession", window.btoa(JSON.stringify(tappecueSession)));
            setToken(window.btoa(JSON.stringify(tappecueSession)));
            getSessionList(apiToken);
        }
        if (responseCode === 403) {
            amLoggedIn = false;
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
    var sessionMessage = "";
    req.open('GET', apiURL + 'sessions', true);
    req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    req.setRequestHeader("X-Auth-Token", apiToken);
    req.addEventListener('load', function () {
        var responseVals = JSON.parse(req.responseText);
        var responseCode = req.status;
        if (responseCode === 200) {
            if (responseVals.length > 0) {
                sessionMessage = "<h4>Session: <b>" + responseVals[0].name + "</b></h4>";
                sessionMessage += "<p>Start time: <b>" + responseVals[0].start + ' ' + timeZone + '</b></br>Last Update: <b><span id="lastUpdate"></span></b></p>';
                $("#sessionMessage").html(sessionMessage);
                getSessionData(apiToken, currentSession);
                if (!timerRunning) {
                    timerRunning = true;
                    probeChecker = setInterval(displayProbes, timerInterval * 1000);
                }
            } else {
                sessionMessage = "No available sessions. Please start a session in your Tappecue app.";
                $("#sessionMessage").html(sessionMessage);
            }
        }
        if (responseCode === 403) {
            timerRunning = false;
            clearInterval(probeChecker);
            $("#sessionMessage").html("Please login to Tappecue to see your sessions.");
            if (amLoggedIn) {
                connect($('#username').val(), $('#pw').val());
            }
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
        var responseCode = req.status;
        if (responseCode === 200) {
            smokeData = JSON.parse(req.responseText);
            console.log(smokeData);
            $("#lastUpdate").html(smokeData[1].last_update);
            for (var i = 1; i <= 4; i++) {
                $("#probe" + i + "Name").html(smokeData[i].name);
                $("#probe" + i + "Temp").html(smokeData[i].current_temp + smokeIcon(smokeData[i].chamber));
                $("#probe" + i + "Target").html("Target range: " + smokeData[i].min_temp + " – " + smokeData[i].max_temp);
                if (smokeData[i].active === "1") {
                    if ((smokeData[i].current_temp > smokeData[i].max_temp) && (smokeData[i].current_temp <= (smokeData[i].max_temp + warningThreshold))) {
                        $("#probe" + i).removeClass("btn-warning btn-info btn-success btn-danger btn-inactive");
                        $("#probe" + i).addClass("btn-warning");
                    }
                    if ((smokeData[i].current_temp < smokeData[i].min_temp) && (smokeData[i].current_temp >= (smokeData[i].min_temp - warningThreshold))) {
                        $("#probe" + i).removeClass("btn-warning btn-info btn-success btn-danger btn-inactive");
                        $("#probe" + i).addClass("btn-warning");
                    }
                    if (smokeData[i].current_temp > (smokeData[i].max_temp + warningThreshold)) {
                        $("#probe" + i).removeClass("btn-warning btn-info btn-success btn-danger btn-inactive");
                        $("#probe" + i).addClass("btn-danger");
                    }
                    if (smokeData[i].current_temp < (smokeData[i].min_temp - warningThreshold)) {
                        $("#probe" + i).removeClass("btn-warning btn-info btn-success btn-danger btn-inactive");
                        $("#probe" + i).addClass("btn-danger");
                    }
                    if ((smokeData[i].current_temp >= smokeData[i].min_temp) && (smokeData[i].current_temp <= smokeData[i].max_temp)) {
                        $("#probe" + i).removeClass("btn-warning btn-info btn-success btn-danger btn-inactive");
                        $("#probe" + i).addClass("btn-success");
                    }
                } else {
                    $("#probe" + i).removeClass("btn-warning btn-info btn-success btn-danger btn-inactive");
                    $("#probe" + i).addClass("btn-inactive");
                }
            }
        }

        if (responseCode === 403) {
            smokeData = {};
            $("#sessionMessage").html("Please login to Tappecue to see your sessions.");
            if (amLoggedIn) {
                connect($('#username').val(), $('#pw').val());
            }

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
            //$("#timezone").html(responseVals["timezone"]);
            timeZone = responseVals["timezone"];
        }
    });

    req.send(timeZoneString);

}

function displayProbes() {
    "use strict";
    getSessionList(apiToken);
}

function smokeIcon(chamber) {
    "use strict";
    if (chamber === "1") {
        return ' <img src="../img/cooker.png" width="100" height="100" alt=""/>';
    } else {
        return ' <img src="../img/meat.png" width="100" height="100" alt=""/>';
    }
}

function signout() {
    "use strict";
    apiToken = "";
    smokeData = {};
    $("#connect").collapse("show");
    $("#sessionselect").collapse("hide");
    $("#sessionMessage").html("Login to select your Tappecue session");
    $("#loginmessage").html("Log in to Tappecue");
    $("#extensionInfo").show();
    var tappecueSession = {};
    tappecueSession.username = "";
    tappecueSession.pw = "";
    tappecueSession.token = "";
    setToken(window.btoa(JSON.stringify(tappecueSession)));
    //setCookie("tappecueSession", "", -1);
    clearInterval(probeChecker);

}

function setCookie(cname, cvalue, exdays) {
    "use strict";
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    "use strict";
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) === 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function getStoragePath() {
    "use strict";
    var csInterface = new CSInterface();
    var fs = require('fs');
    var path = require("path");
    var userDataPath = csInterface.getSystemPath(SystemPath.USER_DATA);
    var storagePath = path.join(userDataPath, 'com.jameslockman.cep.tappecue.panel');
    if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath);
    }
    //console.log(`storagePath: ${customKeywordsPath}`);
    return storagePath;
}

function getToken() {
    "use strict";
    var fs = require('fs');
    var path = require("path");
    fs.readFile(path.join(getStoragePath(), "tappecuedata"), function (err, data) {
        if (err) {
            console.log("no token set: " + err);
            var tappecueSession = {};
            tappecueSession.username = "";
            tappecueSession.pw = "";
            tappecueSession.token = "";
            setToken(window.btoa(JSON.stringify(tappecueSession)));
            return JSON.stringify(tappecueSession);
        } else {

            console.log("setting login values from " + window.atob(data));
            var logindata = JSON.parse(window.atob(data));
            $('#username').val(logindata.username);
            $('#pw').val(logindata.pw);
            apiToken = logindata.token;
            if (apiToken !== "") {
                console.log("logging in to Tappecue.");
                connect($('#username').val(), $('#pw').val());
            }

        }
    });
}

function setToken(token) {
    "use strict";
    var fs = require('fs');
    var path = require("path");
    fs.writeFile(path.join(getStoragePath(), "tappecuedata"), token, function (err) {
        if (err) {
            console.log("unable to set token: " + err);
        }
        console.log('The token has been saved!');
    });
}
