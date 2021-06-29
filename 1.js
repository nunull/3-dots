var flatlandConfig = {
    // server: "http://localhost:3000",
    server: "https://flatland.earth",
    land: '3-dots',
    updateIntervall: 40,
    spawnIntervall: 600,
    debug: true,
    clearscreen: false,
    backgroundcolor: [0, 0, 0],
    backgroundblend: 0.5
}

var machineConfig = {
    name: 'empty-machine-example',
    maxCount: 8,
    minSize: 10,
    maxSize: 30,
    lifetime: 2800,
    color1: [255, 255, 255],
    color1Opacity: 0.1,
    color2: [0, 255, 255],
    color2Opacity: 0.1,
    pendown: false

}

class Machine extends defaultMachine {
    setup() {
        this.setType(MachineType.CIRCLE);
        this.setFill(255, 255, 255);
        this.setStroke(0, 0, 0);
        this.setSize(8);
        this.setPosition(random(-width/2, width/2), random(-width/2, width/2)); // go to random pos;

        

        const maxVelocity = 5;
        this.velocity = createVector(random(-maxVelocity, maxVelocity), random(-maxVelocity, maxVelocity))

        this.osc = new p5.Oscillator('sine');
        this.modOsc = new p5.Oscillator('sine');
        
        this.osc.freq(1);
        // this.osc.freq(random(1, 2000));

        reverb.process(this.osc, 2, 2);
        this.modOsc.disconnect();

        this.osc.start();
        this.modOsc.start();

        this.audioRoutingSetUp = false;

        document.addEventListener('stop-audio', () => {
            if (flatland.machinesLocal.indexOf(this) !== -1) return;

            this.osc.stop()
            this.modOsc.stop()
        })
    }

    move() {
        if (!this.audioRoutingSetUp && flatland.machinesLocal.length > 1) {
            const index = flatland.machinesLocal.indexOf(this);
            const nextIndex = (index + 1) % flatland.machinesLocal.length;
            const nextMachine = flatland.machinesLocal[nextIndex];

            nextMachine.osc.freq(this.modOsc);
            
            this.audioRoutingSetUp = true;
        }

        // this.setPosition(
        //     constrain(this.pos.x + this.velocity.x, -width/2, width/2),
        //     constrain(this.pos.y + this.velocity.y, -height/2, height/2));

        // if (this.pos.x <= -width/2 || this.pos.x >= width/2) this.velocity.x *= -1;
        // if (this.pos.y <= -height/2 || this.pos.y >= height/2) this.velocity.y *= -1;







        const index = flatland.machinesLocal.indexOf(this);
        const angle = 2*PI * (index / flatland.machinesLocal.length);
        // console.log(angle)

        const radius = 100;
        this.setPosition(sin(angle)*radius, -cos(angle)*radius);







        let d = 0;
        for (let machine of flatland.machinesLocal) {
            d += dist(this.pos.x, this.pos.y, machine.pos.x, machine.pos.y);
        }

        var amp = constrain(map(d, width*1.5, 0, 0, 1), 0, 1);

        this.modOsc.freq(d/2, 0.1);
        this.modOsc.amp(amp*400, 0.1);
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

let lastUpdated = 0;

function draw() {
    if (millis() - lastUpdated > random(1200, 2000)) {
        console.log('update')

        flatlandConfig.spawnIntervall = random(200, 1500);
        machineConfig.lifetime = random(200, 3000);

        console.log(flatlandConfig.spawnIntervall, machineConfig.lifetime);

        if (random() > 0.8) {
            console.log('clear oscs')
            
            document.dispatchEvent(new Event('stop-audio'));
        }

        lastUpdated = millis();
    }

    flatland.update();
}