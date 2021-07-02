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
            constrain(this.pos.x + this.velocity.x, 0, width),
            constrain(this.pos.y + this.velocity.y, 0, height));

        if (this.pos.x <= 0 || this.pos.x >= width) this.velocity.x *= -1;
        if (this.pos.y <= 0 || this.pos.y >= height) this.velocity.y *= -1;

        console.log("this.pos.x =" + this.pos.x);
        //console.log();


        let d = 0;
        for (let machine of flatland.machinesLocal) {
            d += abs(dist(this.pos.x, this.pos.y, machine.pos.x, machine.pos.y))+1;
        }

        var amp = constrain(map(d, width*1.5, 0, 0, 1), 0, 1);
        console.log("d =" + d);
        this.modOsc.freq(d/2, 0.1);
        this.modOsc.amp(amp*800, 0.1);
        this.osc.amp(amp*0.2, 0.1);

        // generate grayscale depending from amplitude
        var grayscale = int(map(amp, 0, 1, 0, 255));
        // generate transparency depending from amplitude
        var transparency = int(map(amp, 0, 1, 255, 0));

        this.setFill(grayscale, grayscale, grayscale, transparency);
        this.setStroke(grayscale, grayscale, grayscale, transparency);

        previous[int(this.pos.x)][int(this.pos.y)] = 500;
}
}




let gui;
let flatland;
let reverb;

let cols;
let rows;
let current;
let previous;
let dampening = 0.99;

function setup() {
    reverb = new p5.Reverb();
    reverb.amp(3);
    
    pixelDensity(1);
    createCanvas(windowWidth, windowHeight);

 
    //wasser setup
    //createCanvas(600, 400);
    cols = windowWidth;
    rows = windowHeight;

    current = new Array(cols).fill(0).map(n => new Array(rows).fill(0));
    previous = new Array(cols).fill(0).map(n => new Array(rows).fill(0));



    flatland = new Flatland();
    initGui();
    initSocketIO(flatlandConfig.server);

}


function draw() {
    flatland.update();

    loadPixels();
    for (let i = 1; i < cols - 1; i++) {
      for (let j = 1; j < rows - 1; j++) {
        current[i][j] =
          (previous[i - 1][j] +
            previous[i + 1][j] +
            previous[i][j - 1] +
            previous[i][j + 1]) /
            2 -
          current[i][j];
        current[i][j] = current[i][j] * dampening;
        
        let index = (i + j * cols) * 4;
        pixels[index + 0] = current[i][j]+pixels[index];
        pixels[index + 1] = current[i][j]+pixels[index+1];
        pixels[index + 2] = current[i][j]+pixels[index+2];
      }
    }
    updatePixels();
  

}
/*
function mouseDragged() {
    previous[this.pos.x][this.pos.y] = 38500;
  }
  */