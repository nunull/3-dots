var flatlandConfig = {
    // server: "http://localhost:3000",
    server: "https://flatland.earth",
    land: '3-dots',
    updateIntervall: 40,
    spawnIntervall: 1000,
    debug: true,
    clearscreen: true,
    backgroundcolor: [13, 19, 73], // schönes blau: 13, 19, 73
    backgroundblend: 0.5
}

var machineConfig = {
    name: 'empty-machine-example',
    maxCount: 3,
    minSize: 10,
    maxSize: 30,
    lifetime: 10000,
    color1: [255, 0, 255],
    color1Opacity: 0.1,
    color2: [0, 255, 255],
    color2Opacity: 0.1,
    pendown: false

}

/*
To Do
a)
Bewegung der Bots verändern: sich abwechselndes System von Anziehung und Abstoßung
bei Berührung kurze Interaktion (Vibration/Schwingung)
Sound aufbessern
Reverb automatisieren

b)
Timms System miteinbinden/weitere Implementierung erstellen

*/ 

class Machine extends defaultMachine {
    setup() {
        this.setType(MachineType.CIRCLE);
        this.setFill(0, 0, 0);
        this.setStroke(0, 0, 0);
        this.setPosition(random(-width/2, width/2), random(-height/2, height/2)); // go to random pos;

        const maxVelocity = 5;
        this.velocity = createVector(0, 0)

        this.osc = new p5.Oscillator('sine');
        this.modOsc = new p5.Oscillator('sine');
        
        this.osc.freq(440);        

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

        let sum = createVector(0, 0)
        for (let force of forces) {
            sum.add(force.getForce(this))
        }

        // console.log('sum', sum)

        this.velocity.add(sum)

        // this.setPosition(
        //     constrain(this.pos.x + this.velocity.x, 0, width),
        //     constrain(this.pos.y + this.velocity.y, 0, height));

        // if (this.pos.x <= 0 || this.pos.x >= width) this.velocity.x *= -1;
        // if (this.pos.y <= 0 || this.pos.y >= height) this.velocity.y *= -1;

        this.setPosition(
            constrain(this.pos.x + this.velocity.x, -width/2, width/2),
            constrain(this.pos.y + this.velocity.y, -height/2, height/2));

        if (this.pos.x <= -width/2 || this.pos.x >= width/2) this.velocity.x *= -1;
        if (this.pos.y <= -height/2 || this.pos.y >= height/2) this.velocity.y *= -1;

        // console.log("this.pos.x =" + this.pos.x);
        //console.log();


        let d = 0;
        var index = flatland.machinesLocal.indexOf(this);
        var next = flatland.machinesLocal[(index+1)%flatland.machinesLocal.length];
        
        d = int(abs(dist(this.pos.x, this.pos.y, next.pos.x, next.pos.y)));
        d = d%100+1;

        var amp = constrain(map(d, 100, 0, 0, 1), 0, 1);
        // console.log("d =" + d);
        this.modOsc.freq(d/2, 0.1);
        this.modOsc.amp(amp*modulationDepth, 0.1);
        this.osc.amp(amp*0.2, 0.1);

        // generate grayscale depending from amplitude
        var grayscale = int(map(amp, 0, 1, 0, 255));
        // generate transparency depending from amplitude
        var transparency = int(map(amp, 0, 1, 0, 255));

        //this.setFill(grayscale*88, grayscale*156, grayscale*168, transparency); //88, 156, 168
        this.setFill(88, 156, 168, transparency); //88, 156, 168
        
        this.setStroke(88, 156, 168, transparency);

        var waveX = int(map(this.pos.x, -width/2, width/2, 0, width-1));
        // console.log("waveX = " + waveX);
        var waveY = int(map(this.pos.y, -height/2, height/2, 0, height-1));

        previous[waveX][waveY] = 1000; //1000 ist cool
    }

    onFinish() {
        console.log('onFinish');

        this.osc.amp(0, 0.1);
        
    }
}


class Atractor {
    constructor(position) {
        this.position = position;
    }

    getForce(machine) {
        let force = p5.Vector.sub(this.position, machine.pos);
        force.setMag(1);
        // console.log('machine.position', machine.pos)
        return force
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

let modulationDepth = 80;

let forces = [];

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


    // forces.push(new Atractor(createVector(0, 0)));
    // forces.push(new Atractor(createVector(100, 200)));

}

let lastAtractorAdded = 0;

function draw() {
    if (millis() - lastAtractorAdded >= random(6000, 10000)) {
        forces.push(new Atractor(createVector(random(-width/2, width/2), random(-height/2, height/2))));
        lastAtractorAdded = millis();

        modulationDepth = random(10, 1000);

        for(let machine of flatland.machinesLocal) {
            machine.osc.freq(random(1, 800));
        } 
    }

    push();
    translate(width/2, height/2);
    flatland.update();
    pop();

    loadPixels();
    for (let i = 1; i < cols - 1; i++) {
      for (let j = 1; j < rows - 1; j++) {
        current[i][j] =
          (previous[i - 1][j] +
            previous[i + 1][j] +
            previous[i][j - 1] +
            previous[i][j + 1]) / 2 - current[i][j];
        current[i][j] = current[i][j] * dampening;
        
        let index = (i + j * cols) * 4;
        pixels[index + 0] = current[i][j]+pixels[index];
        pixels[index + 1] = current[i][j]+pixels[index+1];
        pixels[index + 2] = current[i][j]+pixels[index+2];
      }
    }
    updatePixels();


    let temp = previous;
    previous = current;
    current = temp;
  

}

function mousePressed() {
    userStartAudio();
}

/*
function mouseDragged() {
    previous[this.pos.x][this.pos.y] = 38500;
  }
  */