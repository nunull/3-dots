const _VERSION = "v0.051";

/*
TODO
[x] communication test
[x] socket io include
[x] https
[x] sound
[x] rectangle ????? checken
[x] typography example
[x] sound example
[x] multi land möglichkeite
[x] beispiel zusammenhänge objekte (job für ralf)
[x] pendown??? checken
[x] rotation of rects???
[x] better spawn logic / spawn speed
[x] reverb
[x] interaction collision example 
[x] typograhy als form
[ ] linien (vektoren) zwischen zwei bots ?
[ ] growth simulation / l-system demo?
[ ] machine communication
[ ] network sound


[ ] fix performance
[ ] optimize communication
[ ] installations tutorial
[ ] audio noise



*/
let allLands = ['default']; // all possible lands
let selectLand;
const MachineType = {
    NONE: 0,
    CIRCLE: 1,
    RECT: 2,
    TRI: 3,
    POINT: 4,
    LINE: 5,
    CUSTOM: 6,
    TEXT: 7
};

function keyPressed() {
    if (key == 'd') {
        if (flatlandConfig.debug == false) {
            flatlandConfig.debug = true;
            gui.show();
        } else {
            flatlandConfig.debug = false;
            gui.hide();
        }
    }
    if (key == 'c') {
        if (flatlandConfig.clearscreen == false) {
            flatlandConfig.clearscreen = true;
        } else {
            flatlandConfig.clearscreen = false;
        }
    }
}

function initSocketIO(_server) {
    //establish a connection to the central flatland server
    socket = io.connect(_server);
    socket.on('updateremotemachines', updateRemoteMachines);
    socket.on('removemachine', removeMachine);
    socket.on('lands', updateLands);
    console.log('socket.id = ' + socket.id);
    socket.emit('registerland', {
        land: flatlandConfig.land
    });

}

function updateLands(data) {
    flatland.updateLands(data);
}

function removeClient(data) {
    flatland.removeClient(data);
}

function removeMachine(data) {
    flatland.removeMachine(data);
}

function updateRemoteMachines(data) {
    flatland.updateRemoteMachines(data);
}

class Flatland {
    constructor(_autospan) {
        // this.socket = io.connect(flatlandConfig.server);
        // this.socket.on('updateremotemachines', updateRemoteMachines);
        // this.socket.on('removemachine', removeMachine);

        this.machinesLocal = [];
        this.machinesRemote = [];
        this.monofont = loadFont('../../assets/fonts/RobotoMono-Regular.otf');
        this.sendeven = 1;

        textFont(this.monofont);
        textSize(12);

        this.overlayCanvas;
        this.overlayCanvas = createGraphics(windowWidth, windowHeight);
        this.overlayCanvas.textFont(this.monofont);
        this.overlayCanvas.textSize(13);

        this.drawingCanvas;
        this.drawingCanvas = createGraphics(windowWidth, windowHeight);
        this.drawingCanvas.background(flatlandConfig.backgroundcolor[0], flatlandConfig.backgroundcolor[1], flatlandConfig.backgroundcolor[2]);
        this.lastspawn = 0;
        if (_autospan === undefined) {
            this.autospawn = 1;
            this.spawn();
        } else {
            this.autospawn = _autospan;
        }

        // this.registerLand(flatlandConfig.land);

    }

    registerLand(landname) {
        socket.emit('registerland', {
            land: landname
        });
    }
    updateLands(data) {
        allLands = data;
        updateDatDropdown(selectLand, allLands);
        selectLand.setValue(flatlandConfig.land);
        //   updateDropdown('lands' , allLands);
    }

    spawn(_x, _y, _size) {

        if (_x === undefined) {
            this.x = random(-width / 2, width / 2);
   
        } else {
            this.x = _x;
        }
        if (_y === undefined) {
            this.y = random(-width / 2, width / 2);
   
        } else {
            this.y = _y;
        }
        if (_y === undefined) {
            this.size = 100;
   
        } else {
            this.size = _size;
        }

        if (!flatlandConfig.presenter) {
            this.machinesLocal.push(new Machine(this.genRandomMachineID(), this.x, this.y, this.size, MachineType.CIRCLE, true));
        }
    }



    clearScreen() {
        background(0, 0, 0);
        if (flatlandConfig.clearscreen) {
            //   background(flatlandConfig.backgroundcolor[0], flatlandConfig.backgroundcolor[1], flatlandConfig.backgroundcolor[2]);
            this.drawingCanvas.background(flatlandConfig.backgroundcolor[0], flatlandConfig.backgroundcolor[1], flatlandConfig.backgroundcolor[2], flatlandConfig.backgroundblend * 255);
        }

    }

    drawDebugInformation() {
        if (flatlandConfig.debug) {
            var _debugmessage_ = 'debug\n' +
                '----------------------------------\n' +
                'version  : ' + _VERSION + '\n' +
                'fps      : ' + frameRate() + '\n' +
                'myID     : ' + socket.id + '\n' +
                '#local   : ' + this.machineCountLocal() + "\n" +
                '#remote  : ' + this.machineCountRemote() + "\n" +
                'pendown  : ' + machineConfig.pendown + "\n" +
                //   'lands    : '+ allLands.join(" ")+'\n'+
                '\n' +
                'press <d> to toggle debug mode';
            this.overlayCanvas.clear();
            this.overlayCanvas.fill(0);
            this.overlayCanvas.noStroke();
            this.overlayCanvas.rect(4, 5, 280, 180);
            this.overlayCanvas.fill(255, 255, 255);
            this.overlayCanvas.text(_debugmessage_, 10, 20);
            image(this.overlayCanvas, -width / 2, -height / 2);
        }

    }

    removeMachine(data) {
        if (this.machinesRemote[data.machineid]) {
            this.machinesRemote[data.machineid].setAlive(false);
        }
    }

    removeClient(data) {
        // remove all machines from client
    }

    updateRemoteMachines(data) {
        if (data.socketid == socket.id) return; // my own machines; do nothing 
        if (data.land != flatlandConfig.land) return; // refuse all outlanders
        if (this.machinesRemote[data.machineid] && this.machinesRemote[data.machineid].isAlive()) {
            //update 
            this.machinesRemote[data.machineid].set(data.pos.x, data.pos.y, data.size);
            this.machinesRemote[data.machineid].setDColor1(data.color1);
            this.machinesRemote[data.machineid].setDColor2(data.color2);
            this.machinesRemote[data.machineid].setRotation(data.rotation);
            this.machinesRemote[data.machineid].setPen(data.pendown);
            this.machinesRemote[data.machineid].setText(data.text);
            if (data.type) this.machinesRemote[data.machineid].setType(data.type);

        } else {
            // new
            //console.log("new");
            this.machinesRemote[data.machineid] = new Machine(data.machineid, data.pos.x, data.pos.y, data.size, data.type, false);
            this.machinesRemote[data.machineid].setSocketID(data.socketid);
            this.machinesRemote[data.machineid].setMachineID(data.machineid);
            //this.machinesRemote[data.machineid].set(data.pos.x, data.pos.y, data.size);
            this.machinesRemote[data.machineid].setDColor1(data.color1);
            this.machinesRemote[data.machineid].setDColor2(data.color2);
            this.machinesRemote[data.machineid].setRotation(data.rotation);
            this.machinesRemote[data.machineid].setPen(data.pendown);

            this.machinesRemote[data.machineid].setText(data.text);
            if (data.type) this.machinesRemote[data.machineid].setType(data.type);

        }

    }

    update() {
        this.clearScreen();
        image(this.drawingCanvas, -width / 2, -height / 2);
        if (!flatlandConfig.presenter) {
            if (this.autospawn) {
                if (this.machinesLocal.length < machineConfig.maxCount) {
                    if ((millis() - this.lastspawn) >= flatlandConfig.spawnIntervall) {                //this.lastspawn = millis();
                        this.spawn();
                        this.lastspawn = millis();
                    }
                }
            }
            for (let i = 0; i < this.machinesLocal.length; i++) {
                if (!this.machinesLocal[i].isAlive()) {
                    if (this.machinesLocal[i].audio == true && this.machinesLocal[i].audioStopped == -1) {
                        this.machinesLocal[i].stopAudio();
                        if (!this.machinesLocal[i].reverb) {
                            this.machinesLocal.splice(i, 1);
                        }
                    }
                    if (this.machinesLocal[i].audio == true && this.machinesLocal[i].audioStopped > 0) {
                        if ((millis() - this.machinesLocal[i].audioStopped) > 100) { // let the reverb fade out
                            this.machinesLocal.splice(i, 1);
                        }
                    }
                    if (this.machinesLocal[i].audio == false) {
                        this.machinesLocal.splice(i, 1);

                    }
                } else {
                    this.machinesLocal[i].premove();
                    this.machinesLocal[i].move();
                    this.machinesLocal[i].update(i);
                    this.machinesLocal[i].display();
                }
                this.sendeven = !this.sendeven;
            }
        }
        for (var key in this.machinesRemote) {
            if (!this.machinesRemote[key].isAlive() || this.machinesRemote[key].lastupdated() > 2000) {
                delete this.machinesRemote[key];
            } else {
                this.machinesRemote[key]._drawOnCanvas();
                this.machinesRemote[key].display();
            }
        }
        /*
                for (var key in this.machinesRemote) {
                    this.machinesRemote[key].display();
                }
        */
        this.drawDebugInformation();
    }

    machineCountRemote() {
        return Object.keys(this.machinesRemote).length;
    }


    machineCountLocal() {
        return this.machinesLocal.length;
    }

    genRandomMachineID() {
        return Math.floor((1 + Math.random()) * 0x10000000000).toString(16).substring(1);
    };
}


class defaultMachine {
    constructor(_machineid, _x, _y, _size, _type, _isLocal) {
        this.t = 0;
        this.id = 0;

        this.alive = true;
        this.audioStopped = -1;
        this.setType(_type);
        this.pos = createVector(_x, _y);
        this.posPrevious = createVector(this.pos.x, this.pos.y);
        this.size = _size;
        this.rotation = 0;

        this.last_type = this.type;
        this.last_pos = this.pos.copy();
        this.last_size = this.size;
        this.last_rotation = this.rotation;

        this.lastupdate = millis();
        this.lifetime = machineConfig.lifetime;
        this.osc, this.playing, this.freq, this.amp;

        this.audio = false;
        this.reverb = false;
        this.freq = 440;
        this.amp = 0.2;
        this.pan = 0;
        this.phase = 0;
        // this.pendown = false;
        this.type = MachineType.CIRCLE;
        this.text = "x";
        this.color1 = color(machineConfig.color1[0], machineConfig.color1[1], machineConfig.color1[2], machineConfig.color1Opacity * 255);
        this.color2 = color(machineConfig.color2[0], machineConfig.color2[1], machineConfig.color2[2], machineConfig.color2Opacity * 255);
        // this.speed = 1;
        this.socketid = -1;
        this.machineid = _machineid;
        this.local = _isLocal;
        this.born = millis();
        this.lastsend = millis();
        this.setup();
    }

    setText(_txt) {
        this.text = _txt;
    }


    setType(_type) {
        this.type = _type;
    }

    setRotation(_rot) {
        this.rotation = _rot;
    }

    setPosition(_x, _y) {
        this.pos.x = _x;
        this.pos.y = _y;
    }

    stopAudio() {
        this.osc.amp(0, 5);
        this.osc.stop(1.0);
        if (this.reverb) {
            flatlandReverb.amp(0, 1);
            //    flatlandReverb.disconnect(this.osc);
        }
        this.audioStopped = millis();
    }
    setAudioPhase(_phase) { // set phase
        this.osc.phase(_phase);
        this.phase = _phase;
    }

    setPhase(_phase) { // deprecated
        this.osc.phase(_phase);
        this.phase = _phase;
    }
    setPan(_pan) { // deprecated
        this.osc.pan(_pan, 0.9);
        this.pan = _pan;
    }
    setAudioPan(_pan) {
        this.osc.pan(_pan, 0.9);
        this.pan = _pan;
    }
    enableAudio(_freq, _amp) {
        this.osc = new p5.Oscillator('sine');
        this.audio = true;
        this.freq = _freq;
        this.amp = _amp;
        this.osc.freq(_freq, 0);
        this.osc.amp(_amp, 0);
        this.osc.start();
    }


    connectReverb() {
        connectReverb(3, 0.2);
    }
    connectReverb(_reverbtime, _decayrate) {
        this.osc.disconnect(); // remove from noremal audio chain
        //       flatlandReverb = new p5.Reverb();
        flatlandReverb.process(this.osc, _reverbtime, _decayrate);
        flatlandReverb.amp(0, 0.0);
        this.reverb = true;
    }

    setReverbAmp(_amp) {
        flatlandReverb.amp(_amp, 10);
    }

    setReverbDrywet(_dryWet) {
        flatlandReverb.drywet(_dryWet);
    }

    removeReverb() {
    }


    setAudioFrequency(_freq) {
        this.freq = _freq;
        this.osc.freq(this.freq, 0.8);

    }
    setAudioAmplitude(_amp) {
        this.amp = _amp;
        this.osc.amp(this.amp, 1);

    }
    updateSound(_freq, _amp) {  // deprecated
        this.freq = _freq;
        this.amp = _amp;
        this.osc.freq(this.freq, 0.8);
        this.osc.amp(this.amp, 0.8);

    }
    setup() {
        // can be overwritten
    }
    setAlive(_set) {
        this.alive = _set;
    }
    isAlive() {
        return this.alive;
    }
    setColor1(_c) {
        this.color1 = _c; //color(_c.r, _c.g, _c.b, _c.a);
    }
    setDColor1(_c) {
        this.color1 = color(_c.r, _c.g, _c.b, _c.a); //color(_c.r, _c.g, _c.b, _c.a);
    }
    setDColor2(_c) {
        this.color2 = color(_c.r, _c.g, _c.b, _c.a); //color(_c.r, _c.g, _c.b, _c.a);
    }

    setColor1(_r, _g_, _b, _a) {
        this.color1 = color(_r, _g_, _b, _a);

    }
    setFill(_c) {
        this.color1 = _c; //color(_c.r, _c.g, _c.b, _c.a);
    }

    setFill(_r, _g_, _b, _a) {
        this.color1 = color(_r, _g_, _b, _a);

    }

    setColor2(_c) {
        this.color2 = _c;
    }

    setColor2(_r, _g_, _b, _a) {
        this.color2 = color(_r, _g_, _b, _a);

    }

    setStroke(_c) {
        this.color2 = _c;
    }

    setStroke(_r, _g_, _b, _a) {
        this.color2 = color(_r, _g_, _b, _a);

    }

    setRotation(_r) {
        this.rotation = _r;
    }
    setSize(_size) {
        this.size = _size;
    }
    setSocketID(_socketid) {
        this.socketid = _socketid;
    }
    setMachineID(_machineid) {
        this.machineid = _machineid;
    }
    setPen(_pendown) {
        this.pendown = _pendown;
    }
    setPenDown() {
        this.pendown = true;
    }
    setPenUp() {
        this.pendown = false;
    }
    setLifetime(_lifetime) {
        this.born = millis();
        this.lifetime = _lifetime;
    }
    setType(_type) {
        this.type = _type;
    }
    set(_x, _y, _size) {
        this.lastupdate = millis();
        if (!this.local) {
            this.posPrevious.x = this.pos.x;
            this.posPrevious.y = this.pos.y;
            this.pos.x = _x;
            this.pos.y = _y;
        }
        this.size = _size;
    }

    move() {
        this.updatePos()
        this.pos.x += random(-this.speed, this.speed);
        this.pos.y += random(-this.speed, this.speed);
        this.size = map(this.age(), 0, this.lifetime, machineConfig.maxSize, machineConfig.minSize);
    }
    getLifetime() {
        return map(this.age(), 0, this.lifetime, 0.0, 1.0);
    }
    penUp() {
        this.pendown = false;
    }
    penDown() {
        this.pendown = true;
    }
    age() {
        return millis() - this.born;
    }
    lastupdated() {
        return millis() - this.lastupdate;
    }
    premove() {
        if (this.local) {
            this.posPrevious.x = this.pos.x;
            this.posPrevious.y = this.pos.y;

        }
    }
    update(_id) {
        this.id = _id;
        if (this.local == true && socket.id != undefined) {
            this.socketid = socket.id;
        }
        if (this.age() > this.lifetime) {
            this.setAlive(false);
            socket.emit('removemachine', {
                machineid: this.machineid
            });

        } else {
            if ((millis() - this.lastsend) > flatlandConfig.updateIntervall) {
                this.lastsend = millis();
                //send my machine data to server
                var data = {
                    machineid: this.machineid,
                    socketid: this.socketid,
                    land: flatlandConfig.land,
                    //                    alive: this.alive,
                    pos: {
                        'x': this.pos.x,
                        'y': this.pos.y
                    },
                    size: this.size,
                    text: this.text,
                    type: this.type,
                    rotation: this.rotation,
                    pendown: this.pendown,
                    color1: {
                        'r': red(this.color1),
                        'g': green(this.color1),
                        'b': blue(this.color1),
                        'a': alpha(this.color1)
                    },
                    color2: {
                        'r': red(this.color2),
                        'g': green(this.color2),
                        'b': blue(this.color2),
                        'a': alpha(this.color2)
                    },
                    age: this.age(),

                }
                /*
                                console.log("sss  = "+ this.type);
                                if (this.type != this.last_type) {
                                    var addp = {
                                        type: this.type
                                    }
                                    //Object.assign(data, addp); 
                                    console.log("hi");
                                }
                         */
                socket.emit('machine', data);
            }
        }
        this.last_type = this.type
        this.last_pos = this.pos.copy();
        this.last_size = this.size;
        this.last_rotation = this.rotation;



        this.t++;
        if (this.pos.x < -width / 2) this.pos.x = -width / 2;
        if (this.pos.y < -height / 2) this.pos.y = -height / 2;
        if (this.pos.x > width / 2) this.pos.x = width / 2;
        if (this.pos.y > height / 2) this.pos.y = height / 2;
        //        this.color1 = color(machineConfig.color1[0], machineConfig.color1[1], machineConfig.color1[2], machineConfig.color1Opacity * 255);
        //        this.color2 = color(machineConfig.color2[0], machineConfig.color2[1], machineConfig.color2[2], machineConfig.color2Opacity * 255);
        // this.pendown = machineConfig.pendown;
        this.lastupdate = millis();

        this._drawOnCanvas();

    }
    _drawOnCanvas() {
        //        this.pendown = true;
        if (this.pendown && (this.posPrevious.x != this.pos.x || this.posPrevious.y != this.pos.x)) {
            //   flatland.drawingCanvas.stroke(this.pencolor);
            //  flatland.drawingCanvas.strokeWeight(this.pensize);
            // flatland.drawingCanvas.line(this.posPrevious.x + width / 2, this.posPrevious.y + height / 2, this.pos.x + width / 2, this.pos.y + height / 2);
            flatland.drawingCanvas.fill(this.color1);
            flatland.drawingCanvas.stroke(this.color2)
            if (this.type == MachineType.LINE) {
                flatland.drawingCanvas.strokeWeight(this.size);
                //                flatland.drawingCanvas.point(this.pos.x + width / 2, this.pos.y + height / 2)
                flatland.drawingCanvas.line(this.posPrevious.x + width / 2, this.posPrevious.y + height / 2, this.pos.x + width / 2, this.pos.y + height / 2);
            }
            if (this.type == MachineType.POINT) {
                flatland.drawingCanvas.strokeWeight(this.size);
                flatland.drawingCanvas.point(this.pos.x + width / 2, this.pos.y + height / 2)
            }
            if (this.type == MachineType.CIRCLE) {
                flatland.drawingCanvas.strokeWeight(1);
                flatland.drawingCanvas.push();
                flatland.drawingCanvas.translate(this.pos.x + width / 2, this.pos.y + height / 2);
                flatland.drawingCanvas.ellipse(0, 0, this.size, this.size);
                flatland.drawingCanvas.pop();
            }
            if (this.type == MachineType.RECT) {
                flatland.drawingCanvas.strokeWeight(1);
                flatland.drawingCanvas.rectMode(CENTER)
                flatland.drawingCanvas.push();
                flatland.drawingCanvas.translate(this.pos.x + width / 2, this.pos.y + height / 2);
                flatland.drawingCanvas.rotate(this.rotation);
                flatland.drawingCanvas.rect(0, 0, this.size, this.size);

                flatland.drawingCanvas.pop();
            }

            if (this.type == MachineType.TEXT) {
                flatland.drawingCanvas.strokeWeight(1);
                flatland.drawingCanvas.textAlign(CENTER, CENTER)
                flatland.drawingCanvas.push();
                flatland.drawingCanvas.translate(this.pos.x + width / 2, this.pos.y + height / 2);
                flatland.drawingCanvas.rotate(this.rotation);
                flatland.drawingCanvas.textSize(this.size);
                flatland.drawingCanvas.text(this.text, 0, 0);

                flatland.drawingCanvas.pop();
            }

        }

    }
    _displayMachine() {
        // fill(128, 255, 128);
        fill(this.color1);
        stroke(this.color2)
        //console.log(this.type);
        if (this.type == MachineType.LINE) {
            strokeWeight(this.size);
            point(this.pos.x, this.pos.y)
        }

        if (this.type == MachineType.POINT) {
            stroke(this.color2)
            strokeWeight(this.size);
            point(this.pos.x, this.pos.y)
        }
        if (this.type == MachineType.CIRCLE) {
            strokeWeight(1);
            push();
            translate(this.pos.x, this.pos.y);
            ellipse(0, 0, this.size, this.size);
            pop();
        }
        if (this.type == MachineType.RECT) {
            strokeWeight(1);
            rectMode(CENTER)
            push();
            translate(this.pos.x, this.pos.y);
            rotateZ(this.rotation);
            rect(0, 0, this.size, this.size);
            pop();
        }


        if (this.type == MachineType.TEXT) {
            strokeWeight(1);
            textAlign(CENTER, CENTER)
            push();
            translate(this.pos.x, this.pos.y);
            rotate(this.rotation);
            textSize(this.size);
            text(this.text, 0, 0);
            pop();
        }

    }

    display() {
        if (this.isAlive()) {
            this._displayMachine();
            /*
                  if (this.local == true) {
                      if (flatlandConfig.debug) {
                          fill(127, 127, 127);
                          text("LOCAL:\n" + socket.id + "\n" + this.machineid + "\n" + this.pos.x + " " + this.pos.y, this.pos.x, this.pos.y);
                      }
      
                  } else {
      
      
                      if (flatlandConfig.debug) {
                          fill(127, 127, 127);
                          text("REMOTE\n: " + this.socketid + "\n" + this.machineid, this.pos.x, this.pos.y);
                      }
      
                  }
                  */
        }
    }

}


function updateDatDropdown(target, list) {
    innerHTMLStr = "";
    if (list.constructor.name == 'Array') {
        for (var i = 0; i < list.length; i++) {
            var str = "<option value='" + list[i] + "'>" + list[i] + "</option>";
            innerHTMLStr += str;
        }
    }
    if (list.constructor.name == 'Object') {
        for (var key in list) {
            var str = "<option value='" + list[key] + "'>" + key + "</option>";
            innerHTMLStr += str;
        }
    }
    if (innerHTMLStr != "") target.domElement.children[0].innerHTML = innerHTMLStr;
}

/*
make p5js responsive 
*/
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function initFlatlandAudio() {
    flatlandReverb = new p5.Reverb();

}
function initGui() {
    gui = new dat.GUI();

    let guiFlatlandFolder = gui.addFolder('flatlandConfig');
    guiFlatlandFolder.add(flatlandConfig, 'server');
    selectLand = guiFlatlandFolder.add(flatlandConfig, 'land', allLands);
    guiFlatlandFolder.add(flatlandConfig, 'debug');
    guiFlatlandFolder.add(flatlandConfig, 'updateIntervall', 1, 250);
    guiFlatlandFolder.add(flatlandConfig, 'spawnIntervall', 1, 5000);
    guiFlatlandFolder.addColor(flatlandConfig, 'backgroundcolor');
    guiFlatlandFolder.add(flatlandConfig, 'backgroundblend', 0.0, 1.0);
    guiFlatlandFolder.add(flatlandConfig, 'clearscreen');
    guiFlatlandFolder.open();

    let guiMachineFolder = gui.addFolder("machineConfig");

    guiMachineFolder.add(machineConfig, 'name');
    guiMachineFolder.add(machineConfig, 'maxCount', 1, 100);
    guiMachineFolder.add(machineConfig, "minSize", 1, 200);
    guiMachineFolder.add(machineConfig, "maxSize", 1, 200);
    guiMachineFolder.add(machineConfig, "lifetime", 1, 20000);
    guiMachineFolder.addColor(machineConfig, 'color1');
    guiMachineFolder.add(machineConfig, 'color1Opacity', 0, 1);
    guiMachineFolder.addColor(machineConfig, 'color2');
    guiMachineFolder.add(machineConfig, 'color2Opacity', 0.0, 1.0);
    guiMachineFolder.add(machineConfig, 'pendown');
    guiMachineFolder.open();
}