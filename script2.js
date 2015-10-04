var hostCode = "0000";

var countdown = -1;
var turnLength = 45*30;

var hexWidth = 28;
var hexHeight = 14;
var blip = 6;

var mapWidth = 30;
var mapHeight = 50;

$(document).ready(function() {
    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');

    /*
    ctx.fillStyle = "rgb(200,0,0)";
    ctx.fillRect (10, 10, 55, 50);

    ctx.fillStyle = "rgba(0, 0, 200, 0.5)";
    ctx.fillRect (30, 30, 55, 50);
    */


    for (var i=0; i<mapHeight; i+=2) {
        hexes[i] = new Array();
        for (var j=0; j<mapWidth; j+=2) {
            hexes[i][j] = placeHex(i,j);
        }
    }

    for (var i=1; i<mapHeight; i+=2) {
        hexes[i] = new Array();
        for (var j=1; j<mapWidth; j+=2) {
            hexes[i][j] = placeHex(i,j);
        }
    }


    document.addEventListener('keydown', function(event) {
        if (event.keyCode == 49) {
            var t = newTerr(terrs.length);
            activeTerr = t;
        } else if (event.keyCode == 48) {
            var out = "" + terrs.length + "|";
            for (var i=0; i<hexes.length; i++) {
                if (hexes[i]) {
                    for (var j=0; j<hexes[i].length; j++) {
                        if (hexes[i][j]) {
                            out += String(i) + ","+String(j)+","+String(hexes[i][j].tID)+"|";
                        }
                    }
                }
            }

            $("#output").text(out);
        } else if (event.keyCode == 57) {
            parseMap("file:///Users/PrestonT/JDice/map.txt", true);
        } else if (event.keyCode == 56) {
            httpGet("/map.txt", parseMap, false);
        }
    });        

    mouseDown = 0;
    document.body.onmousedown = function() { 
          ++mouseDown;
    }
    document.body.onmouseup = function() {
          --mouseDown;
    }

    canvas.addEventListener('mousemove', function(evt) {
        getMousePos(canvas, evt);
    }, false);

    setupMessages();
    startConnection();

    setInterval(function() {
        handleNetwork();
        gameLoop(ctx);
    }, 33);

});

var players = [];
var playing = [];
var turn = 0;

function newPlayer(pID, name) {
    var player = {};
    player.pID = pID;
    player.terrs = [];
    player.dice = 1;
    player.extra = 0;
    player.color = randomColor();
    player.sID = extend(pID, 2);

    players[pID] = player;
    playing.push(player);

    player.calcDice = function() {
        this.dice = 0;
        for (var i=0; i<this.terrs.length; i++) {
            this.dice += this.terrs[i].dice;
        }
    }

    player.setName = function(n) {
        this.name = n;
        this.htmlName = '<span style="color: '+this.color+'">'+this.name+'</span>';
    }

    player.setName(name);
}

function distributeTerrs() {
    var avail = terrs.slice(0);
    avail = shuffleArray(avail);
    while (avail.length > 0) {
        for (var i=0; i<playing.length; i++) {
            if (avail.length < 1) { 
                break;
            }
            var p = playing[i];
            var t = avail.pop();
            t.setOwner(p);
            t.dice = 1;
        }
    }
    var minTerrs = terrs.length;
    for (var i=0; i<playing.length; i++) {
        if (playing[i].terrs.length < minTerrs) {
            minTerrs = playing[i].terrs.length;
        }
    }

    for (var i=0; i<playing.length; i++) {
        var numDice = Math.ceil(minTerrs * 10/3) - playing[i].terrs.length;
        while (numDice > 0) {
            var num = Math.floor(Math.random() * playing[i].terrs.length);
            if (playing[i].terrs[num].dice < 8) {
                playing[i].terrs[num].dice += 1;
                numDice -= 1;
            }
        }
    }
}

var startTurn = 0;
var round = 0;

function startGame() {
    turn = Math.floor(Math.random() * playing.length) - 1;
    startTurn = turn + 1;
    if (turn < 0) {
        turn = 0;
    }
    for (var i=0; i<playing.length; i++) {
        var p = playing[i];
        var packet = newPacket(1);
        packet.send(p.sID);
    } 
    nextTurn();
}
stage = 0;
function nextTurn() {
    stage = 1;
    countdown = turnLength;
    turn += 1;
    showHideAllTerrs(false);
    if (turn >= playing.length) {
        turn = 0;
    }
    if (turn == startTurn) {
        round += 1;
        log("Round "+round);
    }
    if (playing[turn].terrs.length == 0) {
        nextTurn();
        return;
    }
    log(playing[turn].htmlName + "'s turn began");
    for (var i=0; i<playing.length; i++) {
        playing[i].calcDice(); 
        if (i == turn) { continue; }
        var packet = newPacket(1);
        packet.send(playing[i].sID);
    }
    var packet = newPacket(2);
    packet.send(playing[turn].sID);
}

function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

function setupMessages() {
    var i999 = createMsgStruct(999, false);
    i999.addChars(4);

    var i998 = createMsgStruct(998, false);
    i998.addChars(2);
    i998.addString();

    var i997 = createMsgStruct(997, false);
    i997.addChars(2);
    i997.addString();

    var i0 = createMsgStruct(0, false);
    i0.addChars(2);

    var i1 = createMsgStruct(1, false);

    var i3 = createMsgStruct(3, false);
    i3.addChars(2);

    var i4 = createMsgStruct(4, false);
    i4.addChars(2);
    i4.addChars(2);

    var i5 = createMsgStruct(5, false);
    i5.addChars(2);
    i5.addChars(2);

    var i6 = createMsgStruct(6, false);
    i6.addChars(2);

    var i10 = createMsgStruct(10, false);
    i10.addChars(2);

    var o999 = createMsgStruct(999, true);
    o999.addChars(4);
    o999.addString();

    var o0 = createMsgStruct(0, true);

    var o1 = createMsgStruct(1, true);
    
    var o2 = createMsgStruct(2, true);

    var o3 = createMsgStruct(3, true);
    o3.addChars(2);

    var o4 = createMsgStruct(4, true);
    o4.addChars(2);
}

function startConnection() {
    var onopen = function() {
        var packet = newPacket(999);
        packet.write("0000");
        packet.write("YES");
        packet.send();
    }

    var onclose = function() {
        alert("Lost connection...");
    }

    wsconnect("ws://localhost:8886", onopen, onclose);
}

function handleNetwork() {
    if (!canHandleMsg()) {
        return;
    }

    var packet = readPacket();
    var msgID = packet.msgID;

    if (msgID === 999) {
        hostCode = packet.read();
        httpGet("/map.txt", parseMap, false);
    } else if (msgID === 998) {
        var pID = packet.readInt();
        var n = packet.read();
        newPlayer(pID, n);
    } else if (msgID === 997) {
        var pID = packet.readInt();
        var n = packet.read();
        players[pID].setName(n);
    } else if (msgID === 0) {
        var sID = packet.read();
        var pID = parseInt(sID);
        if (stage === 0) {
            var packet = newPacket(0);
            packet.send(sID);
        } else if (playing[turn] === players[pID]) {
            var packet = newPacket(2);
            packet.send(sID);
        } else {
            var packet = newPacket(1);
            packet.send(sID);
        }
    } else if (msgID === 1) {
        var pID = packet.read();
        distributeTerrs();
        startGame();
    } else if (msgID === 3) {
        if (stage == 1) {
            countdown = turnLength;
        }
        var pID = packet.readInt();
        showHideAllTerrs(false);
        for (var i=0; i<players[pID].terrs.length; i++) {
            var terr = players[pID].terrs[i];
            terr.resetColor();
            if (terr.dice < 2) {
                continue;
            }
            terr.drawNum = true;
            var packet = newPacket(3);
            packet.write(terr.tID);
            packet.send(extend(pID, 2));
        }
    } else if (msgID === 4) {
        if (stage == 1) {
            countdown = turnLength;
        }
        var pID = packet.readInt();
        var tID = packet.readInt();
        showHideAllTerrs(false);
        players[pID].attackFrom = terrs[tID];
        terrs[tID].setColor("rgb(255,255,255)");
        for (var i=0; i<terrs[tID].adj.length; i++) {
            var a = terrs[tID].adj[i];
            if (a.owner != terrs[tID].owner) {
                a.drawNum = true;
                var packet = newPacket(4);
                packet.write(a.tID);
                packet.send(extend(pID, 2));
            }
        }
    } else if (msgID === 5) {
        if (stage == 1) {
            countdown = turnLength;
        }
        var pID = packet.readInt();
        var tID = packet.readInt();
        showHideAllTerrs(false);
        // Attacking happens here
        var terr1 = players[pID].attackFrom;
        players[pID].attackTo = terrs[tID];
        var terr2 = players[pID].attackTo;
        attack(terr1, terr2);
    } else if (msgID == 6) {
        if (stage == 1) {
            countdown = turnLength;
        }
        var pID = packet.readInt();
        showHideAllTerrs(false);
        for (var i=0; i<players[pID].terrs.length; i++) {
            players[pID].terrs[i].resetColor();
        }
    } else if (msgID === 10) {
        var pID = packet.readInt();
        endTurn(players[pID]);
    }
}

var newDice = 0;
var handle = [];

function endTurn(player) {
    log(player.htmlName + "'s turn ended");
    newDice = longestPath(player) + player.extra;
    handle = player.terrs.slice(0);
    stage = 5;
}

function distDice(player) {
    if (newDice > 0 && handle.length > 0) {
        var k = Math.floor(Math.random() * handle.length);
        if (handle[k].dice < 8) {
            handle[k].dice += 1;
            newDice -= 1;
        } else {
            handle.splice(k,1);
            distDice(player);
        }
    } else {
        player.extra = newDice;
        nextTurn();
    }
}

function attack(terr1, terr2) {
    rollOne = [];
    rollTwo = [];
    rollTot1 = 0;
    rollTot2 = 0;
    stage = 3;
    countdown = 5;
    terr1.setColor("rgb(255,255,255)");
    terr2.setColor("rgb(255,255,255)");
}

var mouseDown = 0;


var activeTerr = undefined;

var rollOne = [];
var rollTwo = [];
var rollTot1 = 0;
var rollTot2 = 0;
function handleDiceRolls() {
    var p = playing[turn];
    var terr1 = p.attackFrom;
    var terr2 = p.attackTo;
    var r = Math.ceil(Math.random() * 6);
    if (rollOne.length < terr1.dice) {
        rollOne.push(r);
        rollTot1 += r;
    } else if (rollTwo.length < terr2.dice) {
        rollTwo.push(r);
        rollTot2 += r;
    } else {
        countdown = 22;
        stage = 4;
    }
}

function handleDiceRolled() {
    var p = playing[turn];
    var terr1 = p.attackFrom;
    var terr2 = p.attackTo;

    var owners = [terr1.owner, terr2.owner];

    if (rollTot1 > rollTot2) {
        log(terr1.owner.htmlName + " beat " + terr2.owner.htmlName);
        terr2.setOwner(terr1.owner);
        terr2.dice = terr1.dice - 1;
    } else {
        log(terr2.owner.htmlName + " defended " + terr1.owner.htmlName);
    }
    terr1.resetColor();
    terr2.resetColor();
    terr1.dice = 1;
    owners[0].calcDice();
    owners[1].calcDice();
}

function log(string) {
    $("#log").prepend("<div>"+ string +"</div>");
}

var matchup_x = 180;
var matchup_y = 320;
var scoreBG = roundRect(matchup_x, matchup_y, 400, 96, 15);

var oldWidth = 0;
var oldHeight = 0;

function gameLoop(ctx) {
    var canWidth = window.innerWidth-2;
    if (canWidth < 718) {
        canWidth = 718;
    }
    ctx.canvas.width = canWidth;
    ctx.canvas.height = window.innerHeight-2;
    var canvasWidth = ctx.canvas.width;
    var canvasHeight = ctx.canvas.height;

    if (oldWidth != canvasWidth || oldHeight != canvasHeight) {
        $("#log").show();
        var dwi = 200;
        if (canvasWidth < 900) {
            $("#log").hide();
            dwi = -128;
        }
        hexWidth = Math.ceil((canvasWidth - dwi) / mapWidth);
        hexHeight = Math.ceil(((canvasHeight * 2) - 720) / mapHeight);
        for (var i=0; i<hexes.length; i++) {
            for (var j=0; j<hexes[i].length; j++) {
                if (hexes[i][j]) {
                    hexes[i][j].move();
                    createBorder(hexes[i][j]);
                }
            }
        }
        for (var i=0; i<terrs.length; i++) {
            renderTerr(terrs[i]);
        }
        oldWidth = canvasWidth;
        oldHeight = canvasHeight;
    }

    //handleMouse();
    ctx.fillStyle = "rgb(150,170,210)";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);


    
    if (stage == 5) {
        distDice(playing[turn]);
    }
    
    if (countdown > 0) {
        countdown -= 1;
    } else if (countdown == 0) {
        if (stage == 1) {
            countdown = turnLength;
            endTurn(playing[turn]);
        } else if (stage == 3) {
            countdown = 1;
            handleDiceRolls();
        } else if (stage == 4) {
            handleDiceRolled();
            countdown = turnLength;
            stage = 1;
        }
    }

    for (var i=0; i<hexes.length; i++) {
        if (hexes[i]) {
            for (var j=0; j<hexes[i].length; j++) {
                if (hexes[i][j] && hexes[i][j].tID >= -1) {
                    hexes[i][j].draw(ctx);
                }
            }
        }
    }

    for (var t=0; t<drawTerrs.length; t++) {
        drawTerrs[t].draw(ctx);
    }

    for (var b=0; b<buttons.length; b++) {
        buttons[b].draw(ctx);
    }
    
    ctx.font = "26px sans-serif";
    ctx.fillStyle = "rgb(0,0,0)";

    if (activeTerr != undefined) {
        ctx.fillText("Territory " + String(activeTerr.tID), 10, 20);
    }

    ctx.fillText("Host code: "+hostCode+" | 128.61.29.30", 10, 30);

    if (stage == 3 || stage == 4) {
        ctx.font = "30px sans-serif";
        ctx.fillStyle = "rgb(220,220,220)";
        ctx.strokeStyle = "rgb(40,40,40)";
        ctx.fill(scoreBG);
        ctx.stroke(scoreBG);
        var str1 = rollTot1 + " : ";
        var str2 = rollTot2 + " : ";
        for (var i=0; i<rollOne.length; i++) {
            str1 += String(rollOne[i]) + " ";
        }
        for (var i=0; i<rollTwo.length; i++) {
            str2 += String(rollTwo[i]) + " ";
        }
        ctx.strokeStyle = "rgb(0,0,0)";

        ctx.fillStyle = playing[turn].color;
        var mx = matchup_x + 32;
        var my = matchup_y + 36;
        ctx.fillText(str1, mx , my);
        ctx.strokeText(str1, mx, my);
        ctx.fillStyle = playing[turn].attackTo.owner.color;
        ctx.fillText(str2, mx, my + 44);
        ctx.strokeText(str2, mx, my + 44);
    }

    for (var i=0; i<playing.length; i++) {
        var beside = Math.floor(canvasWidth/180);
        var sDrX = (i%beside) * 180;
        var sDrY = canvasHeight - 240 + (Math.floor(i/beside) * 96);

        var drX = sDrX;
        var drY = sDrY;

        ctx.font = "36px sans-serif";
        var p = playing[i];
        ctx.fillStyle = p.color;
        ctx.strokeStyle = "rgb(0,0,0)";

        //var str = p.name + " | Territories: " + p.terrs.length + " | Dice: " + p.dice;
        var str = p.name;
        while (ctx.measureText(str).width > 180 && str.length > 2) {
            str = str.slice(0, str.length-2);
        }
        ctx.fillText(str, drX, drY);
        ctx.strokeText(str, drX, drY);
        var pHexS = 10;
        var pHex = new Path2D;
        drX += pHexS;
        drY += Math.ceil(pHexS*(3/2));
        pHex.moveTo(drX-pHexS,drY);
        pHex.lineTo(drX,drY-pHexS);
        pHex.lineTo(drX+pHexS,drY);
        pHex.lineTo(drX,drY+pHexS);
        pHex.lineTo(drX-pHexS,drY);
        ctx.font = "32px sans-serif";
        ctx.fill(pHex);
        ctx.stroke(pHex);
        ctx.fillRect(drX+64,drY-pHexS,pHexS*2,pHexS*2);
        ctx.strokeRect(drX+64,drY-pHexS,pHexS*2,pHexS*2);
        drX += Math.ceil(pHexS * (3/2));
        drY += pHexS + 1;
        ctx.fillText(String(p.terrs.length), drX, drY);
        ctx.strokeText(String(p.terrs.length), drX, drY);
        drX += 76;
        str = String(p.dice);
        if (p.extra > 0) {
            //str += " + " + String(p.extra);
        }
        ctx.fillText(str, drX, drY);
        ctx.strokeText(str, drX, drY);
        if (playing[turn] === playing[i]) {
            if (stage == 1) {
                var barWidth = 180 * (countdown/turnLength);
                ctx.fillRect(sDrX,sDrY+30, barWidth, 8);
                ctx.strokeRect(sDrX,sDrY+30, barWidth, 8);
            }
        }
    }
}

var buttons = [];

function showOnlyTerrs(player) {
    showHideAllTerrs(false);
    for (var i=0; i<player.terrs.length; i++) {
        player.terrs[i].drawNum = true;
    }
}

function showHideAllTerrs(bool) {
    for (var i=0; i<terrs.length; i++) {
        terrs[i].drawNum = bool;
    }
}

function newTerr(num, dButton) {
    if (dButton == undefined) {
        dButton = true;
    }
    var t = {};
    t.tID = num;
    t.avg_x = 0;
    t.avg_y = 0;
    t.hexes = [];
    t.color = "rgb(160,160,160)";//randomColor();
    t.bright = brighten(t.color, 40);
    t.owner = undefined;
    t.dice = Math.ceil(Math.random() * 5);
    t.adj = [];
    t.drawNum = false;
    t.diceImgs = [];

    t.addHex = function(h) {
        this.hexes.push(h);
    };

    t.draw = function(ctx) {
        //Draw dice
        ctx.strokeStyle = "rgb(0,0,0)";
        ctx.fillStyle = this.color;

        for (var i=0; i<this.dice; i++) {
            ctx.fillStyle = this.bright;
            ctx.fill(this.diceImgs[i]);
            ctx.strokeStyle = "rgb(0,0,0)";
            ctx.stroke(this.diceImgs[i]);
        }

        if (this.drawNum) {
            // Draw Terr number
            var s = String(this.tID);
            ctx.font = "bold 36px sans-serif";
            ctx.fillStyle = "rgb(255,255,255)";
            var xoff = -20;
            var yoff = 2;
            ctx.fillText(s, this.avg_x + xoff, this.avg_y + yoff);
            ctx.strokeText(s, this.avg_x + xoff, this.avg_y + yoff);
        }
    }

    t.resetColor = function() {
        this.setColor(this.owner.color);
    }

    t.setColor = function(color) {
        this.color = color;
        for (var i=0; i<this.hexes.length; i++) {
            this.hexes[i].setColor(this.color);
        }

    }

    t.setOwner = function(owner) {
        if (this.owner) {
            var ind = this.owner.terrs.indexOf(this);
            this.owner.terrs.splice(ind, 1);
        }
        this.owner = owner;
        this.owner.terrs.push(this);
        this.setColor(this.owner.color);
        this.bright = brighten(this.color, 50);
        this.owner.terrs.sort(function(t1, t2) {
            return t1.tID - t2.tID;
        });
    }

    t.roll = function() {
        var sum = 0;
        for (var i=0; i<this.dice; i++) {
            sum += Math.floor(Math.random() * 6) + 1;
        }
        return sum;
    }

    terrs[num] = t;

    if (dButton) {
        makeTerrButton(num);
    }

    return t;
}

function brighten(color, amnt) {
    var s = color.indexOf("(");
    var e = color.indexOf(")");
    var c = color.slice(s+1, e);
    var cc = c.split(",");
    var r = parseInt(cc[0]) + amnt;
    var g = parseInt(cc[1]) + amnt;
    var b = parseInt(cc[2]) + amnt;
    if (r > 255) { r = 255; }
    if (g > 255) { g = 255; }
    if (b > 255) { b = 255; }
    if (r < 0) { r = 0; }
    if (g < 0) { g = 0; }
    if (b < 0) { b = 0; }
    var out = "rgb("+r+","+g+","+b+")";
    return out;
}

function renderTerr(terr) {
    terr.avg_x = 0;
    terr.avg_y = 0;
    for (var h=0; h<terr.hexes.length; h++) {
        var hh = terr.hexes[h];
        terr.avg_x += hh.x;
        terr.avg_y += hh.y;
    }
    terr.avg_x /= terr.hexes.length;
    terr.avg_y /= terr.hexes.length;
    terr.avg_x = Math.floor(terr.avg_x);
    terr.avg_y = Math.floor(terr.avg_y);


    terr.diceImgs = [];
    var dx = terr.avg_x;
    var dy = terr.avg_y;
    var diceWidth = hexWidth * (4/9);
    var diceHeight = hexHeight;
    var spread = 6;
    var w2 = diceWidth/2;
    var h2 = diceHeight/2;
    var s2 = spread/2;
    for (var i=0; i<8; i++) {
        var x = dx;
        var y = dy - (i%4)*(diceHeight-spread) - 1;
        if (i >= 4) {
            x -= diceWidth * (2/3);
            y += h2 - s2;
        }
        var path = new Path2D();
        path.moveTo(x-w2, y-h2+s2);
        path.lineTo(x-w2, y+h2-s2);
        path.lineTo(x, y+h2);
        path.lineTo(x+w2, y+h2-s2);
        path.lineTo(x+w2, y-h2+s2);
        path.lineTo(x, y-h2);
        path.lineTo(x-w2, y-h2+s2);
        path.lineTo(x, y-h2+spread);
        path.lineTo(x+w2, y-h2+s2);
        path.moveTo(x, y-h2+spread);
        path.lineTo(x, y+h2);
        terr.diceImgs[i] = path;
    }
}


var gold = 0.618033988749895;
var hsvH = Math.random();
function randomColor() {
    hsvH += gold;
    var h = hsvH
    h = h % 1;
    var s = 0.5;
    var v = 0.75;

    var r, g, b;

    var h_i = Math.floor(h*6);
    var f = h*6 - h_i;
    var p = v * (1-s);
    var q = v * (1-f*s);
    var t = v * (1- (1-f) * s);
    if (h_i == 0) {
        r = v;
        g = t;
        b = p;
    } else if (h_i == 1) {
        r = q;
        g = v;
        b = p;
    } else if (h_i == 2) {
        r = p;
        g = v;
        b = t;
    } else if (h_i == 3) {
        r = p;
        g = q;
        b = v;
    } else if (h_i == 4) {
        r = t;
        g = p;
        b = v;
    } else if (h_i == 5) {
        r = v;
        g = p;
        b = q;
    }

    r = String(Math.floor(r*255));
    g = String(Math.floor(g*255));
    b = String(Math.floor(b*255));   
    return "rgb("+r+","+g+","+b+")";
}

var terrs = [];
var drawTerrs = [];
var hexes = [];


var surrounding = [
    Array(-2, 0),
    Array(-1, 1),
    Array(1, 1),    
    Array(2, 0),
    Array(1, -1),
    Array(-1, -1),
];

function getSurrounding(hex) {
    var out = [];
    for (var i=0; i<surrounding.length; i++) {
        var p = surrounding[i];
        var rr = hex.r+p[0];
        var cc = hex.c+p[1];
        var n = hexes[rr];
        if (!n) { continue; }
        n = n[cc];
        if (n != undefined && n.tID >= 0) {
            out.push(n);
        }
    }
    return out;

}

function isSurrounded(hex) {
    for (var i=0; i<surrounding.length; i++) {
        var p = surrounding[i];
        var rr = hex.r+p[0];
        var cc = hex.c+p[1];
        var n = hexes[rr];
        if (!n) { return false; }
        n = n[cc];
        if (n) {
            if (n.tID != hex.tID) {
                return false;
            }
        } else {
            return false;
        }
    }
    return true;
}

function longestPath(player) {
    var visited = [];
    var longest = 0;
    for (var i=0; i<player.terrs.length; i++) {
        var t = player.terrs[i];
        if (visited.indexOf(t) < 0) {
            var num = findLongestPath(t, visited);
            if (num > longest) {
                longest = num;
            }
        }
    }
    return longest;
}

function findLongestPath(terr, visited) {
    var count = 1;
    visited.push(terr);
    for (var i=0; i<terr.adj.length; i++) {
        var a = terr.adj[i];
        if (a.owner == terr.owner) {
            if (visited.indexOf(a) < 0) {
                count += findLongestPath(a, visited);
            }
        }
    }
    return count;
}

function createBorder(hex) {
    var path = new Path2D();

    var w2 = hexWidth/2;
    var h2 = hexHeight/2;
    var diff = w2 - blip;
    var x = hex.x;
    var y = hex.y;

    for (var i=0; i<surrounding.length; i++) {
        var draw = true;
        var p = surrounding[i];
        var rr = hex.r+p[0];
        var cc = hex.c+p[1];
        var n = hexes[rr];
        if (n) {
            n = n[cc];
            if (n) {
                if (n.tID == hex.tID) {
                   draw = false; 
                }
            }
        }
        if (draw) {
            if (i == 0) {
                path.moveTo(x-diff, y-h2);
                path.lineTo(x+diff, y-h2);
            } else if (i == 1) {
                path.moveTo(x+diff, y-h2);
                path.lineTo(x+w2, y);
            } else if (i == 2) {
                path.moveTo(x+w2, y);
                path.lineTo(x+diff, y+h2);
            } else if (i == 3) {
                path.moveTo(x+diff, y+h2);
                path.lineTo(x-diff, y+h2);
            } else if (i == 4) {
                path.moveTo(x-diff, y+h2);
                path.lineTo(x-w2, y);
            } else if (i == 5) {
                path.moveTo(x-w2, y);
                path.lineTo(x-diff, y-h2);
            }
        }
    }
    hex.border = path;
    return path;
}

function placeHex(r, c) {
    return newHex(r,c);
    /*
    if (r%2 == 0) {
        x = 80 + ((c/2) * (2*hexWidth - blip*2));
    } else {
        x = 80 + (((c-1)/2) * (2*hexWidth - blip*2) + (hexWidth - blip));
    }
    y = 80 + r * (hexHeight/2);
    return newHex(r, c, x, y);
    */
}

function newHex(r, c) {
    var hex = {};
    hex.x = 0;
    hex.y = 0;
    hex.r = r;
    hex.c = c;
    hex.tID = -1;
    hex.color = "rgb(200, 0, 0)";
    hex.dark = "rgb(160, 0, 0)";

    /*
    var height = hexHeight;
    var width = hexWidth;

    var w2 = width/2;
    var h2 = height/2;
    var diff = w2 - blip;
    
    var path = new Path2D();
    path.moveTo(x-diff, y-h2);
    path.lineTo(x+diff, y-h2);
    path.lineTo(x+w2, y);
    path.lineTo(x+diff, y+h2);
    path.lineTo(x-diff, y+h2);
    path.lineTo(x-w2, y);
    path.closePath();

    hex.shape = path;

    hex.border = path;
    */

    hex.move = function() {
        if (this.r%2 == 0) {
            this.x = hexWidth + ((this.c/2) * (2*hexWidth - blip*2));
        } else {
            this.x = hexWidth + (((this.c-1)/2) * (2*hexWidth - blip*2) + (hexWidth - blip));
        }
        this.y = 60 + this.r * (hexHeight/2);
        this.redraw();
    }

    hex.redraw = function() {
        this.shape = renderHex(this.x, this.y);
        this.border = this.shape;
        createBorder(this);
    }

    hex.draw = function(ctx) {
        ctx.fillStyle = hex.color;
        ctx.fill(this.shape);
        if (this.border) {
            ctx.strokeStyle = this.dark;
            ctx.stroke(this.border);
        }
        /*
        var s = "("+String(this.r)+", "+String(this.c)+")";
        s = "T: "+String(this.tID);
        ctx.font = "9px serif";
        ctx.fillStyle = "rgb(0,0,0)";
        ctx.fillText(s, this.x-10, this.y+2);
        */
    }

    hex.setColor = function(color) {
        this.color = color;
        this.dark = brighten(color, -100);
    }

    hex.resetColor = function() {
        this.color = terrs[this.tID].color;
    }

    hex.move();

    return hex;
}

function renderHex(x, y) {
    var height = hexHeight;
    var width = hexWidth;

    var w2 = width/2;
    var h2 = height/2;
    var diff = w2 - blip;
   
    var path = new Path2D();
    path.moveTo(x-diff, y-h2);
    path.lineTo(x+diff, y-h2);
    path.lineTo(x+w2, y);
    path.lineTo(x+diff, y+h2);
    path.lineTo(x-diff, y+h2);
    path.lineTo(x-w2, y);
    path.closePath();

    return path;
}

// Map making

function parseMap(allText, edit) {
    var data = allText.split("|");
    var numTerrs = parseInt(data[0]);
    for (var t=0; t<numTerrs; t++) {
        newTerr(t, edit);                   
    }
    for (var i=1; i<data.length-1; i++) {
        var pieces = data[i].split(",");
        var r = parseInt(pieces[0]);
        var c = parseInt(pieces[1]);
        var n = parseInt(pieces[2]);
        if (n <= -1) {
            n = -2;
        } else {
            hexes[r][c].setColor(terrs[n].color);
        }
        hexes[r][c].tID = n;
        if (n >= 0) {
            terrs[n].addHex(hexes[r][c]);
        }
    }
    for (var t=0; t<terrs.length; t++) {
        for (var h=0; h<terrs[t].hexes.length; h++) {
            var hh = terrs[t].hexes[h];
            var surrounding = getSurrounding(hh);
            for (var i=0; i<surrounding.length; i++) {
                var sur = surrounding[i];
                if (sur.tID != hh.tID) {
                    if (terrs[t].adj.indexOf(terrs[sur.tID]) < 0) {
                        terrs[t].adj.push(terrs[sur.tID]);
                    }
                }
            }
            
            hh.move();
        }
        terrs[t].adj.sort(function(t1, t2) {
            return t1.tID - t2.tID;
        });
        renderTerr(terrs[t]);
    }
    drawTerrs = terrs.slice(0);
    drawTerrs.sort(function(terr1, terr2) {
        return terr1.avg_y - terr2.avg_y;
    });
}


function handleMouse() {
    if (mouseDown) {
        for (var bd=0; bd<buttons.length; bd++) {
            var b = buttons[bd];
            if (mouse_x > b.x && mouse_y > b.y && mouse_x < b.x + b.width && mouse_y < b.y + b.height) {
                b.click();
            }
        }


        for (var i=0; i<hexes.length; i++) {
            if (hexes[i]) {
                for (var j=0; j<hexes[i].length; j++) {
                    if (hexes[i][j]) {
                        var h = hexes[i][j];
                        if (mouse_x > h.x-hexWidth/2 && mouse_x < h.x+hexWidth/2) {
                            if (mouse_y > h.y-hexHeight/2 && mouse_y < h.y+hexHeight/2) {
                                if (activeTerr) {
                                    h.color = activeTerr.color;
                                    h.tID = activeTerr.tID;
                                    activeTerr.addHex(h);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

function makeTerrButton(num) {
    butt = {};
    butt.tID = num;
    butt.x = 32  + (128 * Math.floor((terrs.length-1) / 5));
    butt.y = 450 + 50 * ((terrs.length-1) % 5);
    butt.width = 96;
    butt.height = 48;
    butt.color = t.color;
    butt.draw = function(ctx) {
        ctx.fillStyle = this.color;
        if (terrs[this.tID] == activeTerr) {
            ctx.strokeStyle = "rgb(255,255,255)";
        } else {
            ctx.strokeStyle = "rgb(0,0,140)";
        }
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        var s = "Terr "+String(this.tID);
        ctx.fillStyle = "rgb(0,0,0)";
        ctx.font = "18px sans-serif";
        ctx.fillText(s, this.x+20, this.y+30);
    }

    butt.click = function() {
        activeTerr = terrs[this.tID];   
    }

    buttons.push(butt);
}

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    mouse_x = evt.clientX - rect.left;
    mouse_y = evt.clientY - rect.top;
}

function roundRect(x, y, width, height, radius) {
    if (!radius) {
        radius = 5;
    }
    var ctx = new Path2D;
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    
    return ctx;
}
