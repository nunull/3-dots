var flatlandConfig = {
    // server: "http://localhost:3000",
    server: "https://flatland.earth",
    land: '3-dots',
    updateIntervall: 40,
    spawnIntervall: 1000,
    debug: true,
    clearscreen: true,
    backgroundcolor: [255, 255, 255],
    backgroundblend: 0.5
}

var machineConfig = {
    name: 'empty-machine-example',
    maxCount: 3,
    minSize: 10,
    maxSize: 30,
    lifetime: 8000,
    color1: [255, 0, 255],
    color1Opacity: 0.1,
    color2: [0, 255, 255],
    color2Opacity: 0.1,
    pendown: false

}

class Machine extends defaultMachine {
    setup() {
        this.setType(MachineType.CIRCLE);
        this.setFill(0, 0, 0);
        this.setStroke(0, 0, 0);
        this.setPosition(random(-width/2, width/2), random(-width/2, width/2)); // go to random pos;

        const maxVelocity = 5;
        this.velocity = createVector(random(-maxVelocity, maxVelocity), random(-maxVelocity, maxVelocity))

        this.osc = new p5.Oscillator('sine');
        this.modOsc = new p5.Oscillator('sine');
        
        this.osc.freq(1);        

        reverb.process(this.osc, 2, 2);
        this.modOsc.disconnect();

        this.osc.start();
        this.modOsc.start();

        this.audioRoutingSetUp = false;
    }

    move() {
        if (!this.audioRoutingSetUp && flatland.machinesLocal.length > 1) {
            const index = flatland.machinesLocal.indexOf(this);
            const nextIndex = (index + 1) % flatland.machinesLocal.length;
            const nextMachine = flatland.machinesLocal[nextIndex];

            nextMachine.osc.freq(this.modOsc);
            
            this.audioRoutingSetUp = true;
        }

        this.setPosition(
            constrain(this.pos.x + this.velocity.x, -width/2, width/2),
            constrain(this.pos.y + this.velocity.y, -height/2, height/2));

        if (this.pos.x <= -width/2 || this.pos.x >= width/2) this.velocity.x *= -1;
        if (this.pos.y <= -height/2 || this.pos.y >= height/2) this.velocity.y *= -1;



        let d = 0;
        for (let machine of flatland.machinesLocal) {
            d += dist(this.pos.x, this.pos.y, machine.pos.x, machine.pos.y);
        }

        var amp = constrain(map(d, width*1.5, 0, 0, 1), 0, 1);

        this.modOsc.freq(d/2, 0.1);
        this.modOsc.amp(amp*800, 0.1);
        this.osc.amp(amp*0.2, 0.1);
    }
}




let gui;
let flatland;
let reverb;

function setup() {
    reverb = new p5.Reverb();
    reverb.amp(3);

    createCanvas(windowWidth, windowHeight, WEBGL);
    flatland = new Flatland();
    initGui();
    initSocketIO(flatlandConfig.server);
}


function draw() {
    flatland.update();
}