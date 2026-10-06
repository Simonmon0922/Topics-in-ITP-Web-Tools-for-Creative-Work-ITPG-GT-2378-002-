let notes = [];

// the condition of circles notes
let ringState = {
  small:  { step: 0, last: 0, interval: 180 },
  medium: { step: 0, last: 0, interval: 350 },
  large:  { step: 0, last: 0, interval: 550 }
};

// range
const circles = [
  { id: "small",  radius: 150 },
  { id: "medium", radius: 240 },
  { id: "large",  radius: 340 }
];

// position
let circlePos = {
  small:  { x: 500, y: 500 },
  medium: { x: 500, y: 500 },
  large:  { x: 500, y: 500 }
};

let currentCircleId = "medium";

// Tone.js
let padSynth, kick, hihat;

// BGM
let bgmSmallMedium, bgmMediumLarge, bgmLargeSmall, bgmTriple;
let intersectState, currentBGM;

let ghostTrails = []; // {x, y, r, alpha}

function spawnGhost(x, y, r = 14) {
  ghostTrails.push({ x, y, r, alpha: 160 });
}

function updateAndDrawGhosts() {
  noStroke();
  for (let i = ghostTrails.length - 1; i >= 0; i--) {
    let g = ghostTrails[i];
    fill(255, 255, 255, g.alpha);
    ellipse(g.x, g.y, g.r * 2);
    g.alpha -= 10; // higher = shorter trail; tune to taste
    if (g.alpha <= 0) ghostTrails.splice(i, 1);
  }
}

// beats levels
const TEMPO_STEPS = [80, 120, 180, 250, 350, 450, 600, 750];
const SMALL_TEMPO_STEPS = [80, 150, 250, 400, 600, 900, 1300, 1800];
const LARGE_TEMPO_STEPS = [80, 150, 250, 400, 600, 1100, 1800, 2500];

let dragging = false;

function preload() {

  Tone.setContext(getAudioContext());
  // Pad Synth sound in the mid-circle
  padSynth = new Tone.PolySynth(6, Tone.AMSynth).toMaster();
     padSynth.set({
    oscillator: { type: "square" },
    envelope: { attack: 0.005, decay: 0.05, sustain: 0.3, release: 0.1 },
    volume: -17
  });

  // drum beats in the large circle
  kick = new Tone.MembraneSynth().toMaster();

  // cymbal sound（MetalSynth）in the small circle
   hihat = new Tone.MetalSynth({
    frequency: 250,
    envelope: { attack: 0.001, decay: 0.05, release: 0.01 },
    harmonicity: 3.1,
    modulationIndex: 8,
    resonance: 2000,
    octaves: 1.2
  }).toMaster();
  hihat.volume.value = -19;

  // BGM when cross
  bgmSmallMedium = loadSound("bgmSmallMedium.mp3");
  bgmMediumLarge = loadSound("bgmMediumLarge.mp3");
  bgmLargeSmall  = loadSound("bgmLargeSmall.mp3");
  bgmTriple      = loadSound("bgmTriple.mp3");

  intersectState = {
    small_medium:false,
    medium_large:false,
    large_small:false,
    triple:false
  };
}

// function drawNeonRing(x, y, diameter, active) {
//   noFill();
//   if (!active) {
//     stroke(255);
//     strokeWeight(2);
//     ellipse(x, y, diameter);
//     return;
//   }
//   colorMode(HSB, 360, 100, 100, 255);
//   let hue = (millis() / 5) % 360;
//   for (let i = 3; i >= 0; i--) {
//     stroke(hue, 100, 100, 255 / (i + 1));  // outer layers = dimmer
//     strokeWeight(2 + i * 4);               // outer layers = thicker/softer
//     ellipse(x, y, diameter);               // each pass IS a ring
//   }
//   colorMode(RGB, 255);
// }

function setup() {
  let c = createCanvas(1000, 1080);
  c.parent('canvas-wrap');   // <-- add this line
  textAlign(CENTER, CENTER);
  window.initRecorder();
}

function draw() {
  background(15);

  drawUI();
  updateTempo();
  playAllRings();
}

function drawUI() {

  fill(230);
  textSize(26);
  text("T-C Music Box", width/2, 150);

  fill(180);
  textSize(16);
  text("A-K Add Notes | ← Cymbal → Drum | Spacebar to Switch Circles | Delete to Delete Notes", width/2, 210);
  text("Current Editing Circle：" + currentCircleId, width/2, 240);

  updateAndDrawGhosts();
  // draw circles
  circles.forEach(c => {
    if (!isEnabled(c.id)) return;

    let pos = circlePos[c.id];
    stroke(c.id === currentCircleId ? 255 : 130);
    strokeWeight(3);
    noFill();
    circle(pos.x, pos.y, c.radius * 2);
  });

  notes.forEach(n => drawNote(n));

  // cross circles detect
  handleIntersections();

  drawDragBall();

  // drawSliderLabels();
}

// draw notes on circles
function drawNote(note) {

  let c = circles.find(o => o.id === note.circleId);
  let pos = circlePos[note.circleId];
  let sameCircleList = notes.filter(n => n.circleId === note.circleId);

  let idx = sameCircleList.indexOf(note);
  let count = sameCircleList.length;

  let angle = TWO_PI * (idx / count) - HALF_PI;
  let x = pos.x + cos(angle) * c.radius;
  let y = pos.y + sin(angle) * c.radius;

  let isCurrent = (sameCircleList[ringState[note.circleId].step] === note);

  if (isCurrent) {
    fill(255);
    stroke(255);
    circle(x, y, 38);
  } else {
    fill(120, 200, 255);
    noStroke();
    circle(x, y, 26);
  }

  fill(0);
  text(note.key.toUpperCase(), x, y);
}

// speed
function updateTempo() {
  ringState.small.interval  = SMALL_TEMPO_STEPS[window.smallStep ?? 2];
  ringState.medium.interval = TEMPO_STEPS[window.mediumStep ?? 4];
  ringState.large.interval  = LARGE_TEMPO_STEPS[window.largeStep ?? 6];
}

// function drawSliderLabels() {
//   fill(230);
//   textSize(18);
//   text("Small（Cymbal）Pace",   120, 30);
//   text("Medium（Pad）Pace", 120, 70);
//   text("Large（Drum）Pace",   120, 110);
// }

// play the circles
function playAllRings() {
  let now = millis();

  ["small", "medium", "large"].forEach(id => {

    if (!isEnabled(id)) return;

    let list = notes.filter(n => n.circleId === id);
    if (list.length === 0) return;

    let rs = ringState[id];

    if (now - rs.last > rs.interval) {
      let n = list[rs.step];
      playTone(n);
      rs.last = now;
      rs.step = (rs.step + 1) % list.length;
    }
  });
}

// play tone
function playTone(note) {

  if (note.circleId === "medium") {
    padSynth.triggerAttackRelease(note.pitch, "2n");
  }
  else if (note.circleId === "large") {
    kick.triggerAttackRelease("C1", "8n");
  }
  else {
    hihat.triggerAttackRelease("16n");
  }
}

// keyboard
function keyPressed() {

  if (keyCode === LEFT_ARROW) {
    window.smallEnabled = true;
    currentCircleId = "small";
    return;
  }

  if (keyCode === RIGHT_ARROW) {
    window.largeEnabled = true;
    currentCircleId = "large";
    return;
  }

  if (key === " ") {
    switchRing();
    return;
  }

  if (keyCode === DELETE || keyCode === BACKSPACE) {
    if (notes.length > 0) notes.pop();
    resetSteps();
    return;
  }

  let p = keyToPitch(key);
  if (p) {
    notes.push({ key: key, pitch: p, circleId: currentCircleId });
    resetSteps();
  }
}

// Reset
function resetSteps() {
  ["small", "medium", "large"].forEach(id => ringState[id].step = 0);
}

// switch route
function switchRing() {
  let enabled = circles.map(c => c.id).filter(isEnabled);
  let idx = enabled.indexOf(currentCircleId);
  currentCircleId = enabled[(idx + 1) % enabled.length];
}

// identify the working circle
function isEnabled(id) {
  if (window[id + "Enabled"] === undefined) return id === "medium";
  return window[id + "Enabled"];
}

function keyToPitch(k) {
  let map = {
    a:"C3", s:"E3", d:"G3", f:"C4",
    g:"E4", h:"G4", j:"C5", k:"E5"
  };
  return map[k.toLowerCase()] || null;
}


// drag circles
function drawDragBall() {
  let pos = circlePos[currentCircleId];
  fill(255);
  stroke(0);
  circle(pos.x, pos.y, 24);
}

function mousePressed() {
  let pos = circlePos[currentCircleId];
  if (dist(mouseX, mouseY, pos.x, pos.y) < 24) dragging = true;
}

function mouseDragged() {
  if (dragging) {
    circlePos[currentCircleId].x = mouseX;
    circlePos[currentCircleId].y = mouseY;
  }
}

function mouseReleased() {
  dragging = false;
}

// intersect detection
function handleIntersections() {

  let sm = getIntersection("small", "medium");
  let ml = getIntersection("medium", "large");
  let ls = getIntersection("large", "small");

  let triple = (sm.length > 0 && ml.length > 0 && ls.length > 0);

  if (triple) {
    playExclusiveBGM(bgmTriple);
    intersectState = { triple:true, small_medium:false, medium_large:false, large_small:false };
  } else {
    intersectState.triple = false;

    if (sm.length > 0) {
      playExclusiveBGM(bgmSmallMedium);
      intersectState.small_medium = true;
    } else intersectState.small_medium = false;

    if (ml.length > 0) {
      playExclusiveBGM(bgmMediumLarge);
      intersectState.medium_large = true;
    } else intersectState.medium_large = false;

    if (ls.length > 0) {
      playExclusiveBGM(bgmLargeSmall);
      intersectState.large_small = true;
    } else intersectState.large_small = false;
  }

  if (
    !intersectState.triple &&
    !intersectState.small_medium &&
    !intersectState.medium_large &&
    !intersectState.large_small
  ) {
    stopAllBGM();
  }

function spawnGhostsFor(points) {
  points.forEach(p => spawnGhost(p.x, p.y));
  drawPoints(points);
}

  spawnGhostsFor(sm);
spawnGhostsFor(ml);
spawnGhostsFor(ls);
}

function playExclusiveBGM(bgm) {
  if (currentBGM !== bgm) {
    if (currentBGM && currentBGM.isPlaying()) currentBGM.stop();
    bgm.play();
    currentBGM = bgm;
  }
}

function stopAllBGM() {
  if (currentBGM && currentBGM.isPlaying()) currentBGM.stop();
  currentBGM = null;
}

// intersect point
function drawPoints(points) {
points.forEach(pt => {
    fill(255, 220, 0);
    noStroke();
    circle(pt.x, pt.y, 26);
  });
}

function getIntersection(a, b) {
  if (!isEnabled(a) || !isEnabled(b)) return [];

  let ca = circles.find(c => c.id === a);
  let cb = circles.find(c => c.id === b);
  let pa = circlePos[a];
  let pb = circlePos[b];

  return circleIntersect(pa.x, pa.y, ca.radius, pb.x, pb.y, cb.radius);
}

function circleIntersect(x0,y0,r0,x1,y1,r1){
  let dx = x1-x0;
  let dy = y1-y0;
  let d  = sqrt(dx*dx + dy*dy);

  if(d > r0 + r1) return [];
  if(d < abs(r0 - r1)) return [];
  if(d === 0) return [];

  let a = (r0*r0 - r1*r1 + d*d) / (2*d);
  let h = sqrt(r0*r0 - a*a);

  let xm = x0 + (a*dx)/d;
  let ym = y0 + (a*dy)/d;

  return [
    { x: xm + (h*dy)/d, y: ym - (h*dx)/d },
    { x: xm - (h*dy)/d, y: ym + (h*dx)/d }
  ];
}