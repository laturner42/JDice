var MSG_LOGIN = 999;

function main() {
    setupMessages();
   
    $(".login").hide(); 
    $("#game").hide();
    $("#beginGame").hide();

    $("#login").click(function() {
        startConnection();
    });

    $("#beginGame").click(function() {
        var packet = newPacket(1);
        packet.send();
    });

    $("#attack").click(function() {
        var packet = newPacket(3);
        packet.write(pID);
        packet.send();
    });
    $("#surrender").click(function() {
        var packet = newPacket(7);
        packet.write(pID);
        packet.send();
    });
    $("#goBack").click(function() {
        $("#notify").text("It is your turn!");
        $(".turnButton").show();
        $(".terrButton").remove();
        var packet = newPacket(6);
        packet.write(pID);
        packet.send();
    });
    $("#endTurn").click(function() {
        $("#myTurn").hide();
        var packet = newPacket(10);
        packet.write(pID);
        packet.send();
    });

    setInterval(handleNetwork, 16);
    var packet = newPacket(0);
    packet.write(pID);
    packet.send();
}

function setupMessages() {
    var i999 = createMsgStruct(MSG_LOGIN, false);
    i999.addChars(2);

    var i0 = createMsgStruct(0, false);

    var i1 = createMsgStruct(1, false);

    // My turn
    var i2 = createMsgStruct(2, false);

    var i3 = createMsgStruct(3, false);
    i3.addChars(2);

    var i4 = createMsgStruct(4, false);
    i4.addChars(2);

    var i7 = createMsgStruct(7, false);
    i7.addString();
    i7.addChars(2);

    var o999 = createMsgStruct(MSG_LOGIN, true);
    o999.addChars(4);
    o999.addString(4);

    var o997 = createMsgStruct(997, true);
    o997.addChars(2);
    o997.addString();

    var o0 = createMsgStruct(0, true);
    o0.addChars(2);

    var o1 = createMsgStruct(1, true);

    var o3 = createMsgStruct(3, true);
    o3.addChars(2);

    var o4 = createMsgStruct(4, true);
    o4.addChars(2);
    o4.addChars(2);

    var o5 = createMsgStruct(5, true);
    o5.addChars(2);
    o5.addChars(2);

    var o6 = createMsgStruct(6, true);
    o6.addChars(2);

    var o7 = createMsgStruct(7, true);
    o7.addChars(2);

    var o8 = createMsgStruct(8, true);
    o8.addChars(2);
    o8.addChars(2);

    var o10 = createMsgStruct(10, true);
    o10.addChars(2);
}

function startConnection() {
    var onopen = function() {
        if ($("#host").val() === "0000" || $("#host").val().length != 4) {
            alert("Invalid Hostcode.");
            return;
        }
        $("#notify").text("Logging in...");
        var packet = newPacket(MSG_LOGIN);
        packet.write($("#host").val().toUpperCase());
        packet.write($("#name").val());
        packet.send();

    }

    var onclose = function() {
        window.location.href = '/';
    }

    $("#notify").text("Connecting...");  
    wsconnect("ws://128.61.29.30:8886", onopen, onclose);
}

function handleNetwork() {
    if (!canHandleMsg()) {
        return;
    }

    var packet = readPacket();

    msgID = packet.msgID;

    if (msgID === MSG_LOGIN) {
        pID = packet.read();
        $("#notify").text("You are player number "+pID+".");
        $(".login").remove();
        var packet = newPacket(0);
        packet.write(pID);
        packet.send();
    } else if (msgID === 0) {
        $("#beginGame").show();
    } else if (msgID === 1) {
        // Game started.
        $("#notify").text("Game is underway.");
        $("#beginGame").hide();
        $("#game").show();
        $("#myTurn").hide();
        $(".terrButton").remove();
    } else if (msgID === 2) {
        $("#notify").text("It is your turn!");
        $("#game").show();
        startTurn();
    } else if (msgID === 3) {
        $("#notify").text("Choose your territory.");
        $(".turnButton").hide();
        var tID = packet.read();
        var terr = $('<div class="spanButton terrButton"><span class="spanButtonTitle">Territory '+tID+'</span></div>');
        terr.click(function() {
            $(".terrButton").remove();
            $("#notify").text("You can attack these territories.");
            var packet = newPacket(4);
            packet.write(pID);
            packet.write(tID);
            packet.send();
        });
        $("#myTurn").append(terr);
    } else if (msgID === 4) {
        var tID = packet.read();
        var terr = $('<div class="spanButton terrButton"><span class="spanButtonTitle">Territory '+tID+'<span></div>');
        terr.click(function() {
            var packet = newPacket(5);
            packet.write(pID);
            packet.write(tID);
            packet.send();
            $(".terrButton").remove();
            $(".turnButton").show();
            $("#notify").text("It is your turn!");
        });
        $("#myTurn").append(terr);
    } else if (msgID === 7) {
        $("#notify").text("Surrender to:");
        $(".turnButton").hide();
        var pName = packet.read();
        var ppID = packet.readInt();
        var terr = $('<div class="spanButton terrButton"><span class="spanButtonTitle">'+pName+'<span></div>');
        terr.click(function() {
            var packet = newPacket(8);
            packet.write(pID);
            packet.write(ppID);
            packet.send();
            $(".terrButton").remove();
            $(".turnButton").show();
            $("#notify").text("It is your turn!");
        });
        $("#myTurn").append(terr);
    }

}

function startTurn() {
    $("#myTurn").show();
}
