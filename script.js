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
            parseMap("file:///Users/PrestonT/JDice/map.txt", false);
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

    setInterval(function() {
        gameLoop(ctx);
    }, 31);

});

var mouseDown = 0;

function parseMap(map, edit) {
    var rawFile = new XMLHttpRequest();
    rawFile.open("GET", map, false);
    rawFile.onreadystatechange = function ()
    {
        if(rawFile.readyState === 4)
        {
            if(rawFile.status === 200 || rawFile.status == 0)
            {
                var allText = rawFile.responseText;
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
                        isSurrounded(hh);
                        if (isSurrounded(hh)) {
                            //hh.color = "rgb(255, 255, 255)";
                        }
                    }
                    terrs[t].avg_x /= terrs[t].hexes.length;
                    terrs[t].avg_y /= terrs[t].hexes.length;
                }
            }
        }
    }
    rawFile.send(null);
}

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    mouse_x = evt.clientX - rect.left;
    mouse_y = evt.clientY - rect.top;
}

var activeTerr = undefined;

function gameLoop(ctx) {
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

    ctx.fillStyle = "rgb(140,140,150)";
    ctx.clearRect(0, 0, 1280, 720);

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

    if (activeTerr != undefined) {
        ctx.font = "16px sans-serif";
        ctx.fillStyle = "rgb(0,0,0)";
        ctx.fillText("Territory " + String(activeTerr.tID), 10, 20);
    }
}

var buttons = [];

function newTerr(num, dButton) {
    if (dButton == undefined) {
        dButton = true;
    }
    var t = {};
    t.tID = num;
    t.avg_x = 0;
    t.avg_y = 0;
    t.hexes = [];
    t.color = randomColor();

    t.addHex = function(h) {
        this.hexes.push(h);
    };

    t.draw = function(ctx) {
        var s = String(this.tID);
        ctx.fillStyle = "rgb(0,0,0)";
        ctx.font = "18px sans-serif";
        ctx.fillText(s, this.avg_x, this.avg_y); 
    }

    terrs[num] = t;

    if (!dButton) {
        return t;
    }

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

    return t;
}

function randomColor() {
    var r = String(Math.floor(Math.random() * 255));
    var g = String(Math.floor(Math.random() * 255));
    var b = String(Math.floor(Math.random() * 255));
    return "rgb("+r+","+g+","+b+")";
}

var terrs = [];
var hexes = [];
var hexWidth = 28;
var hexHeight = 14;
var blip = 6;

var surrounding = [
    Array(-1, -1),
    Array(-1, 1),
    Array(-2, 0),
    Array(2, 0),
    Array(1, -1),
    Array(1, 1),    
];

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

    hex.draw = function(ctx) {
        ctx.fillStyle = hex.color;
        ctx.fill(this.shape);
        ctx.strokeStyle = "rgb(0, 0, 0)";
        ctx.stroke(this.shape);
        /*
        var s = "("+String(this.r)+", "+String(this.c)+")";
        s = "T: "+String(this.tID);
        ctx.font = "9px serif";
        ctx.fillStyle = "rgb(0,0,0)";
        ctx.fillText(s, this.x-10, this.y+2);
        */
    }

    return hex;
}

