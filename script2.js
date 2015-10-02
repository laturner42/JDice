var hostCode = "0000";

var countdown = -1;

$(document).ready(function() {
    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');

    /*
    ctx.fillStyle = "rgb(200,0,0)";
    ctx.fillRect (10, 10, 55, 50);

    ctx.fillStyle = "rgba(0, 0, 200, 0.5)";
    ctx.fillRect (30, 30, 55, 50);
    */

    var mapWidth = 30;
    var mapHeight = 50;

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
    player.name = name;
    player.terrs = [];
    player.dice = 1;
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
        }
    }
    for (var i=0; i<playing.length; i++) {
        var numDice = 11;
        while (numDice > 0) {
            var num = Math.floor(Math.random() * playing[i].terrs.length);
            playing[i].terrs[num].dice += 1;
            numDice -= 1;
        }
    }
}

var startTurn = 0;
var round = 0;

function startGame() {
    turn = Math.floor(Math.random() * playing.length) - 1;
    if (turn < 0) {
        turn = 0;
    }
    startTurn = turn + 1;
    for (var i=0; i<playing.length; i++) {
        var p = playing[i];
        var packet = newPacket(1);
        packet.send(p.sID);
    } 
    nextTurn();
}

function nextTurn() {
    countdown = 40*30;
    turn += 1;
    showHideAllTerrs(true);
    if (turn >= playing.length) {
        turn = 0;
    }
    if (turn == startTurn) {
        round += 1;
    }
    if (playing[turn].terrs.length == 0) {
        nextTurn()
        return
    }
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
        players[pID].name = n;
    } else if (msgID === 1) {
        var pID = packet.read();
        distributeTerrs();
        startGame();
    } else if (msgID === 3) {
        countdown = 40*30;
        var pID = packet.readInt();
        showHideAllTerrs(false);
        for (var i=0; i<players[pID].terrs.length; i++) {
            var terr = players[pID].terrs[i];
            if (terr.dice < 2) {
                continue;
            }
            terr.drawNum = true;
            for (var k=0; k<terr.adj.length; k++) {
                terr.adj[k].drawNum = true;
            }
            var packet = newPacket(3);
            packet.write(terr.tID);
            packet.send(extend(pID, 2));
        }
    } else if (msgID === 4) {
        countdown = 40*30;
        var pID = packet.readInt();
        var tID = packet.readInt();
        showHideAllTerrs(false);
        players[pID].attacking = terrs[tID];
        players[pID].attacking.drawNum = true;
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
        countdown = 40*30;
        var pID = packet.readInt();
        var tID = packet.readInt();
        showHideAllTerrs(true);
        // Attacking happens here
        var terr1 = players[pID].attacking;
        var terr2 = terrs[tID];
        attack(terr1, terr2);
    } else if (msgID == 6) {
        countdown = 40*30;
        var pID = packet.readInt();
        showHideAllTerrs(true);
        for (var i=0; i<players[pID].terrs.length; i++) {
            players[pID].terrs[i].resetColor();
        }
    } else if (msgID === 10) {
        var pID = packet.readInt();
        endTurn(players[pID]);
    }
}

function endTurn(player) {
    var newDice = longestPath(player);
    for (var i=0; i<newDice; i++) {
        var k = Math.floor(Math.random() * player.terrs.length);
        player.terrs[k].dice += 1;
    }
    nextTurn();
}

function attack(terr1, terr2) {
    if (terr1.roll() > terr2.roll()) {
        terr2.setOwner(terr1.owner);
        terr2.dice = terr1.dice - 1;
    }
    terr1.resetColor();
    terr2.resetColor();
    terr1.dice = 1;
    terr1.owner.calcDice();
    terr2.owner.calcDice();
}

var mouseDown = 0;


var activeTerr = undefined;

function gameLoop(ctx) {
    //handleMouse();
    
    if (countdown > 0) {
        countdown -= 1;
    } else if (countdown == 0) {
        countdown = 30*30;
        endTurn(playing[turn]);
    }

    ctx.fillStyle = "rgb(140,140,150)";
    ctx.fillRect(0, 0, 1280, 720);

    for (var i=0; i<hexes.length; i++) {
        if (hexes[i]) {
            for (var j=0; j<hexes[i].length; j++) {
                if (hexes[i][j] && hexes[i][j].tID >= -1) {
                    hexes[i][j].draw(ctx);
                }
            }
        }
    }

    for (var t=0; t<terrs.length; t++) {
        terrs[t].draw(ctx);
    }

    for (var b=0; b<buttons.length; b++) {
        buttons[b].draw(ctx);
    }
    
    ctx.font = "26px sans-serif";
    ctx.fillStyle = "rgb(0,0,0)";

    if (activeTerr != undefined) {
        ctx.fillText("Territory " + String(activeTerr.tID), 10, 20);
    }

    ctx.fillText("Host code: "+hostCode+" | 128.61.29.30", 10, 25);

    for (var i=0; i<playing.length; i++) {
        ctx.font = "32px sans-serif";
        var p = playing[i];
        ctx.fillStyle = p.color;
        ctx.strokeStyle = "rgb(0,0,0)";
        var str = p.name + " | Territories: " + p.terrs.length + " | Dice: " + p.dice;
        if (turn == i) {
            str = String(Math.floor(countdown/30)) + " > "+str;
        }
        ctx.fillText(str, 40, 480 + (i * 38));
        ctx.strokeText(str, 40, 480 + (i * 38));
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
    t.color = "rgb(80,80,80)";//randomColor();
    t.owner = undefined;
    t.dice = 1;
    t.adj = [];
    t.drawNum = true;

    t.addHex = function(h) {
        this.hexes.push(h);
    };

    t.draw = function(ctx) {
        var s = String(this.tID) + ":" + String(this.dice);
        ctx.strokeStyle = "rgb(0,0,0)";
        ctx.fillStyle = this.color;
        if (this.drawNum) {
            ctx.font = "22px sans-serif";
            ctx.fillText(s, this.avg_x - 9, this.avg_y + 2);
            ctx.strokeText(s, this.avg_x - 9, this.avg_y + 2);
        }
    }

    t.resetColor = function() {
        this.setColor(this.owner.color);
    }

    t.setColor = function(color) {
        this.color = color;
        for (var i=0; i<this.hexes.length; i++) {
            this.hexes[i].color = this.color;
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


var gold = 0.618033988749895;
var hsvH = Math.random();
function randomColor() {
    hsvH += gold;
    var h = hsvH
    h = h % 1;
    var s = 0.5;
    var v = 0.95;

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
var hexes = [];
var hexWidth = 28;
var hexHeight = 14;
var blip = 6;

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
    if (r%2 == 0) {
        x = 80 + ((c/2) * (2*hexWidth - blip*2));
    } else {
        x = 80 + (((c-1)/2) * (2*hexWidth - blip*2) + (hexWidth - blip));
    }
    y = 80 + r * (hexHeight/2);
    return newHex(r, c, x, y);
}

function newHex(r, c, x, y) {
    var hex = {};
    hex.x = x;
    hex.y = y;
    hex.r = r;
    hex.c = c;

    hex.color = "rgb(200, 0, 0)";

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

    hex.tID = -1;

    hex.border = path;

    hex.draw = function(ctx) {
        ctx.fillStyle = hex.color;
        ctx.fill(this.shape);
        if (this.border) {
            ctx.strokeStyle = "rgb(0, 0, 0)";
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

    hex.resetColor = function() {
        this.color = terrs[this.tID].color;
    }

    return hex;
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
            hexes[r][c].color = terrs[n].color;
        }
        hexes[r][c].tID = n;
        if (n >= 0) {
            terrs[n].addHex(hexes[r][c]);
        }
    }
    for (var t=0; t<terrs.length; t++) {
        terrs[t].avg_x = 0;
        terrs[t].avg_y = 0;
        for (var h=0; h<terrs[t].hexes.length; h++) {
            var hh = terrs[t].hexes[h];
            terrs[t].avg_x += hh.x;
            terrs[t].avg_y += hh.y;
            createBorder(hh);
            var surrounding = getSurrounding(hh);
            for (var i=0; i<surrounding.length; i++) {
                var sur = surrounding[i];
                if (sur.tID != hh.tID) {
                    if (terrs[t].adj.indexOf(terrs[sur.tID]) < 0) {
                        terrs[t].adj.push(terrs[sur.tID]);
                    }
                }
            }
        }
        terrs[t].avg_x /= terrs[t].hexes.length;
        terrs[t].avg_y /= terrs[t].hexes.length;
    }
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
