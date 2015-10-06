// This is where we define our messages (similar to an enum)
var MSG_LOGIN = 999;
var pID;

var initialWait;

$(document).ready(function() {

   // Setup our message objects (packets)
    setupMessages();

    $("#login").click(function() {
        startConnection();
        $("#login").hide();
        $("#name").hide();
        $("#notify").text("Connecting...");
    });

    // This interval can be used for anything, but it currently only handles incoming messaged.
    initialWait = setInterval(gameLoop, 15);

    $("#name").val(getCookie("name"));
    $("#host").val(getCookie("host"));
});

function setCookie(cname, cvalue, exdays) {
    if (exdays === undefined) {
        exdays = 1;
    }
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + "; " + expires;
}

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i=0; i<ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1);
        if (c.indexOf(name) == 0) return c.substring(name.length,c.length);
    }
    return "";
}

function setupMessages() {
    // Incoming MSG_LOGIN
    var m1 = createMsgStruct(MSG_LOGIN, false);
    // This packet will be carrying two chars
    m1.addChars(2);
    m1.addString();
    m1.addString();

    // Outgoing MSG_LOGIN
    var i1 = createMsgStruct(MSG_LOGIN, true);
    // This packet sends a string (our name) to the server
    i1.addChars(4);
    i1.addString();
}

function startConnection() {
    // This will be called when the connection is successful
    var onopen = function() {
        // We ask for a new packet for type MSG_LOGIN
        var packet = newPacket(MSG_LOGIN);
        // Writing our name. 'Write' is currently expecting a String,
        // as that is what we defined earlier.
        var name = $("#name").val();
        var host = $("#host").val().toUpperCase();
        packet.write(host);
        packet.write(name);
        setCookie("name", name);
        setCookie("host", host);
        // and then we send the packet!
        packet.send();
        $("#notify").text("Connected!");
    }

    // This will be called when the connection is closed
    var onclose = function() {
        window.location.href = '/';
    }

    // Start the connection!
    wsconnect("ws://128.61.29.30:8886", onopen, onclose);
}

// This function handles incoming packets
function handleNetwork() {
    // First we check if we have enough data
    // to handle a full packet
    if (!canHandleMsg()) {
        return;
    }

    // Read the packet in
    var packet = readPacket();

    // Find out what type of packet it is
    msgID = packet.msgID;

    // And handle it!
    if (msgID === MSG_LOGIN) {
        pID = packet.read();
        var html = packet.read();
        var script = packet.read();
        $("#newHtml").load(html, function() {
            $("#newHtml").hide();
            $.getScript(script, function(data, textStatus, req) {
                $("#newHtml").show();
                clearInterval(initialWait);
                main();
            });
        });
    }
}

// This is called every 15 millis, and is currently used to
// handle incoming messaged. This can do more.
function gameLoop() {
    handleNetwork();
}

// Does a simple httpGet request. Not used in this example.
function httpGet(url, callback, carryout) {
	var xmlHttp = new XMLHttpRequest();
	xmlHttp.open("GET", url, true);
	xmlHttp.onreadystatechange = function() {
		if (xmlHttp.readyState == 4) {
			if (xmlHttp.status == 200) {
				alert(xmlHttp.responseText);
			}
		}
	}
	xmlHttp.send();
}
