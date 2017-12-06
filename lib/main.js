var apiToken = "";
var apiURL = "https://tappecue.babyvelociraptor.com/";
var smokeData = {};
var timeZone = "";
var currentSession = 1;
var probeChecker;
var amLoggedIn = false;
var timerRunning = false;
var tokenChecker;
var tokenTimer = true;
var timerInterval = 60; //interval in seconds.
var warningThreshold = 5; // units is Tappecue temperature units
var offlineThreshold = 10; //minutes Tappecue can be offline before triggering a warning
var fs = require('fs');
var path = require("path");
$(document).ready(function () {
    "use strict";
    console.log("Booting up");
    $('#loginbtn').click(function () {
        connect($('#username').val(), $('#pw').val());
    });
    $('#timeZone').change(function () {
        setTimeZone(apiToken, $("#timeZone").selectpicker('val'));
    });

    $("[name='rememberUsername']").bootstrapSwitch('state', true);
    $("[name='rememberUsername']").bootstrapSwitch('size', 'small');
    $("#wifi").addClass("text-success");
    $(window).resize(function () { // On resize
        balanceProbes();
    });
    Persistent(true); //persistent to prevent extension from unloading in Photoshop

    init();
    tokenTimer = true;
    tokenChecker = setInterval(tokenPing, timerInterval * 1000);
    console.log(path.join(getStoragePath(), "tappecuedata"));
    fs.watchFile(path.join(getStoragePath(), "tappecuedata"), (curr, prev) => {
        console.log(`File changed. Checking statuses.`);
        if (amLoggedIn) {
            displayProbes();
        } else {
            tokenPing();
        }
    });

    console.log("Ready!");
});

function init() {
    "use strict";
    var logindata = JSON.parse(window.atob(fs.readFileSync(path.join(getStoragePath(), "tappecuedata"))));
    apiToken = logindata.token;
    if (apiToken !== "") {
        console.log("init: We have a token: " + apiToken);
        timeZone = logindata.timeZone;
        $("#timeZone").selectpicker('val', timeZone);
        console.log("init: checking " + apiToken);
        checkToken(apiToken);
    } else {
        console.log("init: We don't have a token.");
        timeZone = "US/Eastern";
        $("#timeZone").selectpicker('val', timeZone);
        console.log("init: getting token");
        getToken();
    }

    $("#timeZone").selectpicker('val', timeZone);

}

function tokenPing() {
    "use strict";
    haveToken();
    if (apiToken !== "") {
        console.log("tokenPing: checking " + apiToken);
        checkToken(apiToken);
    } else {
        console.log("tokenPing: getting token");
        getToken();
    }
}

var Persistent = function (inOn) {
    "use strict";
    var event;
    var csInterface = new CSInterface();
    if (inOn) {
        event = new CSEvent("com.adobe.PhotoshopPersistent", "APPLICATION");
    } else {
        event = new CSEvent("com.adobe.PhotoshopUnPersistent", "APPLICATION");
    }
    event.extensionId = "com.jameslockman.cep.tappecue.panel";
    csInterface.dispatchEvent(event);
};

function connect(username, pw) {
    "use strict";
    var loginString = "username=" + username + "&password=" + pw;
    var req = new XMLHttpRequest();
    req.open('POST', apiURL + 'login', true);
    req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    req.addEventListener('load', function () {
        var responseVals = JSON.parse(req.responseText);
        var responseCode = req.status;
        console.log("connect:");
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
            $(".btn").removeClass("btn-success btn-disabled");
            $("#loginbtn").addClass("btn-disabled");
            $("#logoutbtn").addClass("btn-success");
            var tappecueSession = {};
            if ($("[name='rememberUsername']").bootstrapSwitch('state')) {
                console.log("connect: OK to store username!");
                tappecueSession.username = username;
                tappecueSession.pw = "";
            } else {
                console.log("connect: removing stored username!");
                tappecueSession.username = "";
                tappecueSession.pw = "";
            }
            tappecueSession.timeZone = timeZone;
            tappecueSession.token = apiToken;
            setToken(window.btoa(JSON.stringify(tappecueSession)));
            getSessionList(apiToken);
        }
        if (responseCode === 403) {
            amLoggedIn = false;
            $("#pw").addClass("alert-danger");
            $("#username").addClass("alert-danger");
            $("#sessionMessage").html("Please check your username and password and try again.");
            timerRunning = false;
            clearInterval(probeChecker);
            $("#connect").collapse("show");
            $("#sessionselect").collapse("hide");
            $("#extensionInfo").show();
        }
    });

    if (amLoggedIn) {
        console.log("connect: already logged in. using " + apiToken);
        timerRunning = false;
        $("#connect").collapse("hide");
        $("#sessionselect").collapse("show");
        $("#sessionMessage").html("Login successful! Probe temps below.");
        $("#loginmessage").html("Log out of Tappecue");
        $("#pw").removeClass("alert-danger");
        $("#username").removeClass("alert-danger");
        getTimeZone(apiToken);
        $("#extensionInfo").hide();
        $(".btn").removeClass("btn-success btn-disabled");
        $("#loginbtn").addClass("btn-disabled");
        $("#logoutbtn").addClass("btn-success");
        getSessionList(apiToken);
    } else {
        console.log("connect: Not logged in. Trying now.");
        req.send(loginString);
    }
}

function checkToken(token) {
    "use strict";
    var req = new XMLHttpRequest();
    var sessionMessage = "";
    req.open('GET', apiURL + 'sessions', true);
    req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    req.setRequestHeader("X-Auth-Token", token);
    req.addEventListener('load', function () {
        var responseCode = req.status;
        if (responseCode === 200) {
            console.log("checkToken: we are logged in.");
            amLoggedIn = true;
            getToken();
        }
        if (responseCode === 403) {
            console.log("checkToken: we are not logged in.");
            amLoggedIn = false;
        }
    });

    req.send();

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
                    clearInterval(tokenChecker);
                    tokenTimer = false;
                }
            } else {
                sessionMessage = "No available sessions. Please start a session in your Tappecue app.";
                $("#sessionMessage").html(sessionMessage);
            }
        }
        if (responseCode === 403) {
            timerRunning = false;
            clearInterval(probeChecker);
            if (!tokenTimer) {
                tokenTimer = true;
                tokenChecker = setInterval(tokenPing, timerInterval * 1000);
            }
            $("#sessionMessage").html("Please login to Tappecue to see your sessions.");
            if (amLoggedIn) {
                connect($('#username').val(), $('#pw').val());
            }
        }
    });

    req.send();

}

function getSessionData(token, sessionID) {
    "use strict";
    var req = new XMLHttpRequest();
    req.open('GET', apiURL + 'session/' + sessionID, true);
    req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    req.setRequestHeader("X-Auth-Token", token);
    req.addEventListener('load', function () {
        var responseCode = req.status;
        if (responseCode === 200) {
            smokeData = JSON.parse(req.responseText);
            console.log("getSessionData:");
            console.log(smokeData);
            $("#lastUpdate").html(smokeData[1].last_update);
            if (!wifiStatus(smokeData[1].last_update)) {
                $("#wifi, #lastUpdate").removeClass("text-success");
                $("#wifi, #lastUpdate").addClass("text-danger");
            } else {
                $("#wifi, #lastUpdate").removeClass("text-danger");
                $("#wifi, #lastUpdate").addClass("text-success");
            }
            for (var i = 1; i <= 4; i++) {
                $("#probe" + i + "Name").html(smokeData[i].name);
                $("#probe" + i + "Temp").html(smokeData[i].current_temp + smokeIcon(smokeData[i].chamber));
                $("#probe" + i + "Target").html('Target range: <br class="targetCR">' + smokeData[i].min_temp + " – " + smokeData[i].max_temp);
                if (smokeData[i].active === "1") {
                    if (Number(smokeData[i].current_temp) > (Number(smokeData[i].max_temp) + warningThreshold)) {
                        $("#probe" + i).removeClass("probe-warning probe-inactive probe-ok probe-danger");
                        $("#probe" + i).addClass("probe-danger");
                        console.log("probe " + i + " too hot");
                    }
                    if (Number(smokeData[i].current_temp) < (Number(smokeData[i].min_temp) - warningThreshold)) {
                        $("#probe" + i).removeClass("probe-warning probe-inactive probe-ok probe-danger");
                        $("#probe" + i).addClass("probe-danger");
                        console.log("probe " + i + " too cold");
                    }
                    if ((Number(smokeData[i].current_temp) > Number(smokeData[i].max_temp)) && (Number(smokeData[i].current_temp) <= (Number(smokeData[i].max_temp) + warningThreshold))) {
                        $("#probe" + i).removeClass("probe-warning probe-inactive probe-ok probe-danger");
                        $("#probe" + i).addClass("probe-warning");
                        console.log("probe " + i + " too hot but within danger zone");
                    }
                    if ((Number(smokeData[i].current_temp) < Number(smokeData[i].min_temp)) && (Number(smokeData[i].current_temp) >= (Number(smokeData[i].min_temp) - warningThreshold))) {
                        $("#probe" + i).removeClass("probe-warning probe-inactive probe-ok probe-danger");
                        $("#probe" + i).addClass("probe-warning");
                        console.log("probe " + i + " too cold but within danger zone");
                    }
                    if ((Number(smokeData[i].current_temp) >= Number(smokeData[i].min_temp)) && (Number(smokeData[i].current_temp) <= Number(smokeData[i].max_temp))) {
                        $("#probe" + i).removeClass("probe-warning probe-inactive probe-ok probe-danger");
                        $("#probe" + i).addClass("probe-ok");
                        console.log("probe " + i + " just right");
                    }
                } else {
                    $("#probe" + i).removeClass("probe-warning probe-inactive probe-ok probe-danger");
                    $("#probe" + i).addClass("probe-inactive");
                }
            }
            balanceProbes();

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

function balanceProbes() {
    "use strict";
    if ($("#connectHeader").attr("aria-expanded")) {
        $(".probe").css("height", "auto");
        var maxHeight = $("#probe1").height();
        if ($("#probe2").height() > maxHeight) {
            maxHeight = $("#probe2").height();
        }
        if ($("#probe3").height() > maxHeight) {
            maxHeight = $("#probe3").height();
        }
        if ($("#probe4").height() > maxHeight) {
            maxHeight = $("#probe4").height();
        }

        $(".probe").css("height", maxHeight);
    }
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
            //$("#timezone").html(responseVals["timezone"]);
            timeZone = responseVals["timezone"];
            $("#timeZone").selectpicker('val', timeZone);
            console.log("getTimeZone:  TimeZone:" + timeZone);
        } else {
            console.log("getTimeZone: Unable to get Time Zone: " + responseCode);
        }
    });
    console.log("getTimeZone:  Fetching TimeZone");
    req.send();

}

function setTimeZone(apiToken, tz) {
    "use strict";
    var tappecueSession = {};
    var timeZoneString = "timezone=" + tz;
    var req = new XMLHttpRequest();
    req.open('POST', apiURL + 'timezone', true);
    req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    req.setRequestHeader("X-Auth-Token", apiToken);
    req.addEventListener('load', function () {
        var responseVals = JSON.parse(req.responseText);
        var responseCode = req.status;
        if (responseCode === 200) {
            timeZone = responseVals["timezone"];
            $("#timeZone").selectpicker('val', timeZone);

            if ($("[name='rememberUsername']").bootstrapSwitch('state')) {
                console.log("setTimeZone: OK to store username!");
                tappecueSession.username = $('#username').val();
                tappecueSession.pw = "";
            } else {
                tappecueSession.username = "";
                tappecueSession.pw = "";
            }
            tappecueSession.timeZone = timeZone;
            tappecueSession.token = apiToken;
            setToken(window.btoa(JSON.stringify(tappecueSession)));
            displayProbes();
        }
    });

    req.send(timeZoneString);

}

function displayProbes() {
    "use strict";
    var tokenCheck = haveToken();
    if (tokenCheck === true) {
        console.log("display probes:" + tokenCheck);
        getSessionList(apiToken);
    } else {
        console.log("display probes:" + tokenCheck);
        if (timerRunning === true) {
            clearInterval(probeChecker);
            timerRunning = false;
        }
        if (amLoggedIn) {
            signout();
        }
    }
}

function smokeIcon(chamber) {
    "use strict";
    if (chamber === "1") {
        return ' <img src="../img/cooker.png" class="smokeIcon" alt="Chamber Probe"/>';
    } else {
        return ' <img src="../img/meat.png" class="smokeIcon" alt="Meat Probe"/>';
    }
}

function signout() {
    "use strict";
    apiToken = "";
    amLoggedIn = false;
    smokeData = {};

    var tappecueSession = {};
    $("#connect").collapse("show");
    $("#sessionselect").collapse("hide");
    $("#sessionMessage").html("Login to select your Tappecue session");
    $("#loginmessage").html("Log in to Tappecue");
    $("#extensionInfo").show();
    $(".btn").removeClass("btn-success btn-disabled");
    $("#loginbtn").addClass("btn-success");
    $("#logoutbtn").addClass("btn-disabled");

    if ($("[name='rememberUsername']").bootstrapSwitch('state')) {
        console.log("signout: OK to store username!");
        tappecueSession.username = $('#username').val();
        tappecueSession.pw = "";
    } else {
        tappecueSession.username = "";
        tappecueSession.pw = "";
    }
    tappecueSession.timeZone = timeZone;
    tappecueSession.token = apiToken;
    setToken(window.btoa(JSON.stringify(tappecueSession)));
    timerRunning = false;
    clearInterval(probeChecker);
    if (!tokenTimer) {
        tokenTimer = true;
        tokenChecker = setInterval(tokenPing, timerInterval * 1000);
    }

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
    var userDataPath = csInterface.getSystemPath(SystemPath.USER_DATA);
    var storagePath = path.join(userDataPath, 'com.jameslockman.cep.tappecue.panel');
    if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath);
    }
    //console.log(`storagePath: ${customKeywordsPath}`);
    return storagePath;
}

function haveToken() {
    "use strict";
    var logindata = JSON.parse(window.atob(fs.readFileSync(path.join(getStoragePath(), "tappecuedata"))));
    apiToken = logindata.token;
    if (apiToken !== "") {
        //console.log("haveToken: We have a token: " + apiToken);
        console.log("haveToken: We have a token:");
        console.log(logindata);
        if ($("#timeZone").selectpicker('val') !== logindata.timeZone) {
            $("#timeZone").selectpicker('val', logindata.timeZone);
            timeZone = logindata.timeZone;

        }
        return true;
    } else {
        console.log("haveToken: We don't have a token.");
        return false;
    }
}

function getToken() {
    "use strict";
    fs.readFile(path.join(getStoragePath(), "tappecuedata"), function (err, data) {
        if (err) {
            console.log("getToken: No stored values: " + err);
            var tappecueSession = {};
            tappecueSession.username = "";
            tappecueSession.pw = "";
            tappecueSession.token = "";
            tappecueSession.timeZone = "";
            setToken(window.btoa(JSON.stringify(tappecueSession)));
            return JSON.stringify(tappecueSession);
        } else {
            console.log("getToken: Setting login values from " + window.atob(data));
            var logindata = JSON.parse(window.atob(data));
            $('#username').val(logindata.username);
            $('#pw').val(logindata.pw);
            apiToken = logindata.token;
            timeZone = logindata.timeZone;
            if (apiToken !== "") {
                console.log("getToken: attempting to get data Tappecue.");
                connect($('#username').val(), $('#pw').val());
            }

        }
    });
}

function setToken(token) {
    "use strict";
    fs.writeFileSync(path.join(getStoragePath(), "tappecuedata"), token, function (err) {
        if (err) {
            console.log("setToken: unable to set token: " + err);
        }
        console.log('setToken: The token has been saved!');
    });
}

function wifiStatus(lastUpdated) {
    "use strict";
    var active = moment(lastUpdated, "MM-DD-YYYY hh:mm:ss AA").isAfter(moment().subtract(offlineThreshold, 'minutes'));
    console.log("Probe online: " + active);
    return active;
}
