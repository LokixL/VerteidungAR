import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * RIPLEY / ACOUSTICS 01 – schematische Longitudinalwellen-Visualisierung.
 * Physikalische Kennwerte c, lambda, Laufzeit werden aus den Zahlen der Buchabbildung
 * berechnet. Die 3D-Teilchenbewegung ist zwecks Sichtbarkeit stark vergrößert,
 * auf wenige Perioden skaliert und zeitlich gedehnt: KEINE maßstäbliche Simulation.
 * Medium-spezifische Geschwindigkeiten sind illustrative 20-C-Beispielwerte,
 * nicht als material-, richtungs- und temperaturunabhängige Konstanten gedacht.
 */
const $ = selector => document.querySelector(selector);
const app = $('#app');
app.innerHTML = `
  <div id="stage"></div>
  <div id="overlay">
    <header class="topbar">
      <div class="brand"><strong>RIPLEY</strong><small>ACOUSTICS 01 · LONGITUDINAL WAVE</small></div>
      <div id="status" class="status" role="status" aria-live="polite">3D-Vorschau bereit</div>
    </header>
    <div class="scene-label" id="scene-label">LUFT · VERDICHTUNG / VERDÜNNUNG</div>
    <div class="spacer"></div>
    <!-- This toggle remains accessible even when the entire controls panel is hidden. -->
    <div id="menu-toggle-row">
      <button id="panel-toggle" type="button" aria-controls="controls-panel" aria-expanded="false">☰ Menü</button>
    </div>
    <section id="controls-panel" aria-label="Akustik-Demonstration">
      <details class="control-menu" id="menu-medium">
        <summary><span>◈ Medium</span><span class="menu-current" id="medium-current">Luft</span><span class="arrow">⌄</span></summary>
        <div class="menu-body">
          <div class="btn-grid">
            <button type="button" data-medium="air">☁ Luft</button>
            <button type="button" data-medium="water">≈ Wasser</button>
            <button type="button" data-medium="steel">▦ Stahl</button>
          </div>
          <p class="caption" id="medium-description">Luftteilchen schwingen parallel zur Ausbreitungsrichtung.</p>
        </div>
      </details>
      <details class="control-menu" id="menu-frequency">
        <summary><span>〰 Frequenz</span><span class="menu-current" id="freq-current">1.000 Hz</span><span class="arrow">⌄</span></summary>
        <div class="menu-body">
          <div class="btn-grid four">
            <button type="button" data-frequency="20">20 Hz</button>
            <button type="button" data-frequency="100">100 Hz</button>
            <button type="button" data-frequency="1000">1.000 Hz</button>
            <button type="button" data-frequency="20000">20 kHz</button>
          </div>
          <p class="caption">Bei gleicher Schallgeschwindigkeit gilt: Je höher die Frequenz, desto kürzer die Wellenlänge.</p>
        </div>
      </details>
      <details class="control-menu" id="menu-measure">
        <summary><span>◷ Messung & Modell</span><span class="menu-current" id="measure-current">10 m · Normaltempo</span><span class="arrow">⌄</span></summary>
        <div class="menu-body">
          <div class="controls-group">
            <label>Rechnerische Entfernung Quelle–Empfänger</label>
            <div class="btn-grid">
              <button type="button" data-distance="1">1 m</button>
              <button type="button" data-distance="5">5 m</button>
              <button type="button" data-distance="10">10 m</button>
            </div>
          </div>
          <div class="controls-group">
            <label>Animation <strong id="playback-current">Normaltempo (Zeitlupe)</strong></label>
            <div class="btn-grid">
              <button type="button" id="play-pause">Ⅱ Pause</button>
              <button type="button" data-speed="slow">Langsam</button>
              <button type="button" data-speed="normal">Normal</button>
            </div>
          </div>
          <div class="controls-group">
            <label for="size-slider">Größe des AR-Modells <strong id="size-value">100 %</strong></label>
            <input id="size-slider" type="range" min="30" max="250" value="100" step="5" />
          </div>
          <div class="controls-group">
            <label for="rotation-slider">Modell drehen <strong id="rotation-value">0°</strong></label>
            <input id="rotation-slider" type="range" min="0" max="360" value="0" step="5" />
          </div>
        </div>
      </details>
      <div class="metrics" aria-label="Berechnete Schallkenngrößen">
        <div class="metric"><small>Geschwindigkeit c</small><strong id="metric-speed">340 m/s</strong></div>
        <div class="metric"><small>Wellenlänge λ</small><strong id="metric-wave">34 cm</strong></div>
        <div class="metric highlight"><small>Laufzeit t</small><strong id="metric-time">29,4 ms</strong></div>
      </div>
      <p class="physics-disclaimer">Wellenbewegung stark verlangsamt und vergrößert; Laufzeit und Wellenlänge werden unabhängig davon berechnet.</p>
      <div class="info-box" id="info-box" role="note">
        <button type="button" id="info-close" aria-label="Erklärung ausblenden">×</button>
        <strong id="info-title">So funktioniert die Longitudinalwelle</strong>
        <div id="info-text">Die Teilchen schwingen lokal vor und zurück. Die Druckstörung wandert weiter zur Schallquelle gegenüberliegenden Seite.</div>
      </div>
      <div class="actions">
        <button type="button" id="info-toggle" hidden>ⓘ Erklärung</button>
        <button type="button" id="reset">↺ Reset</button>
      </div>
    </section>
    <div id="ar-place-actions">
      <button id="place-now" type="button" hidden>◎ Wellenmodell hier platzieren</button>
      <button id="place-again" type="button" hidden>↺ Neu platzieren</button>
    </div>
    <div id="ar-launch"></div>
  </div>
  <a id="home-link" href="../">← Akustik-Menü</a>
`;

const MEDIUM = {
  air: {
    name: 'Luft', c: 340, accent: '#8ed9ff', base: '#8ac6ed', compress: '#f0ffff',
    bg: '#133751', rows: 6, layers: 3, columns: 39, dot: 0.0056, frontSpeed: 0.22,
    description: 'Gas: Luftteilchen schwingen um ihre Ruhelage; Verdichtungen und Verdünnungen werden weitergegeben.',
    info: 'Luft: Die Schallstörung breitet sich in einem Gas durch lokale Druck- und Dichteschwankungen aus.'
  },
  water: {
    name: 'Wasser', c: 1400, accent: '#63efe5', base: '#20aeba', compress: '#c6fffb',
    bg: '#135460', rows: 7, layers: 3, columns: 43, dot: 0.0060, frontSpeed: 0.46,
    description: 'Flüssigkeit: Dichtes, transparentes Teilchenfeld mit longitudinalen Druckschwankungen.',
    info: 'Wasser: Schall bewegt sich unter diesen Beispielbedingungen schneller als in Luft. Bei gleicher Frequenz wächst dadurch die Wellenlänge.'
  },
  steel: {
    name: 'Stahl', c: 5900, accent: '#d8e9ff', base: '#819bb6', compress: '#ffffff',
    bg: '#38485d', rows: 5, layers: 3, columns: 39, dot: 0.0072, frontSpeed: 0.82,
    description: 'Festkörper: Geordnetes Gitter mit longitudinal schwingenden Materialpunkten.',
    info: 'Stahl: Hier zeigen wir vereinfachend eine longitudinale Volumenwelle. In Festkörpern können außerdem andere Wellentypen auftreten.'
  }
};
const FREQUENCIES = [20, 100, 1000, 20000];
const DISTANCES = [1, 5, 10];
const state = {
  medium: 'air', frequency: 1000, distance: 10,
  speed: 'normal', paused: false, scale: 1, rotation: 0,
  progress: 0.005, phase: 0, infoVisible: true
};
const setStatus = message => { $('#status').textContent = message; };
const fmt = (value, places = 0) => value.toLocaleString('de-DE', { maximumFractionDigits: places, minimumFractionDigits: places });
const wavelengthString = metres => metres < .1 ? `${fmt(metres * 100, 1)} cm` : metres < 1 ? `${fmt(metres * 100, 0)} cm` : `${fmt(metres, metres >= 10 ? 1 : 2)} m`;
const visualCycles = frequency => ({20: 0.9, 100: 1.55, 1000: 2.95, 20000: 5.3})[frequency];

// The entire control panel can be collapsed without affecting the WebXR
// placement ring, the AR start button, or the running 3D animation.
const controlPanel = $('#controls-panel');
const panelToggle = $('#panel-toggle');
function setPanelExpanded(expanded) {
  controlPanel.hidden = !expanded;
  panelToggle.setAttribute('aria-expanded', String(expanded));
  panelToggle.textContent = expanded ? '✕ Menü' : '☰ Menü';
}
panelToggle.addEventListener('click', event => {
  event.stopPropagation();
  setPanelExpanded(controlPanel.hidden);
});
// Leave the existing desktop interface open. On phones, start with the full
// panel closed so the AR camera has the largest possible viewing area.
setPanelExpanded(false);

for (const menu of document.querySelectorAll('details.control-menu')) {
  menu.addEventListener('toggle', () => {
    if (menu.open) for (const other of document.querySelectorAll('details.control-menu')) if (other !== menu) other.open = false;
  });
}
$('#overlay').addEventListener('beforexrselect', e => {
  if (e.target.closest('button, summary, input, a, #controls-panel, #ar-launch')) e.preventDefault();
});

// --- 3D / Desktop and WebXR share the same scene ---

function enablePinchScaling(){
  const el = renderer.domElement;
  let startDist = 0;
  let startScale = state.scale;
  const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
  const dist = touches => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
  el.addEventListener('touchstart', e => {
    if (e.target.closest('#overlay')) return;
    if (e.touches.length === 2) { startDist = dist(e.touches); startScale = state.scale; }
  }, {passive:true});
  el.addEventListener('touchmove', e => {
    if (e.target.closest('#overlay')) return;
    if (e.touches.length === 2 && startDist > 0) {
      e.preventDefault();
      const nextScale = clamp(startScale * (dist(e.touches) / startDist), 0.3, 2.5);
      state.scale = nextScale;
      $('#size-slider').value = Math.round(nextScale * 100);
      updateTransform();
    }
  }, {passive:false});
  el.addEventListener('touchend', e => { if (e.touches.length < 2) startDist = 0; });
}

const scene = new THREE.Scene();
const background = new THREE.Color('#122338');
scene.background = background;
scene.add(new THREE.HemisphereLight(0xcbefff, 0x41566c, 2.35));
const keyLight = new THREE.DirectionalLight('#effaff', 2.3);
keyLight.position.set(0.8, 2.0, 1.6);
scene.add(keyLight);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.01, 30);
camera.position.set(1.25, .78, 1.46);
camera.lookAt(0, .19, 0);
const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, powerPreference: 'high-performance'});
renderer.xr.enabled = true;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
$('#stage').appendChild(renderer.domElement);
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.target.set(0, .18, 0);
orbit.minDistance = .55;
orbit.maxDistance = 3.6;

// placementRoot: ONLY WebXR hit-test position. contentRoot: independent rotation and size.
const placementRoot = new THREE.Group();
scene.add(placementRoot);
const contentRoot = new THREE.Group();
placementRoot.add(contentRoot);
const displayRoot = new THREE.Group();
contentRoot.add(displayRoot);
const particlesRoot = new THREE.Group();
contentRoot.add(particlesRoot);
const chamberRoot = new THREE.Group();
contentRoot.add(chamberRoot);
const labelsRoot = new THREE.Group();
contentRoot.add(labelsRoot);
const effectsRoot = new THREE.Group();
contentRoot.add(effectsRoot);

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({color, roughness: .5, metalness: .05, ...opts});
const flat = (color, opacity = 1) => new THREE.MeshBasicMaterial({color, transparent: opacity < 1, opacity, side: THREE.DoubleSide, depthWrite: opacity === 1});
const addBox = (parent, size, position, material) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
};
const addCylinder = (parent, rTop, rBottom, height, position, material, radial = 24) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, height, radial), material);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
};
const baseMaterial = mat('#183449', {metalness: .46, roughness: .55});
const base = addBox(displayRoot, [1.32, .024, .48], [0, .012, 0], baseMaterial);
base.receiveShadow = true;
addBox(displayRoot, [1.29, .004, .45], [0, .027, 0], flat('#245b73', .66));
for(const z of [-.225,.225]){
  addBox(displayRoot,[1.29,.009,.004],[0,.038,z],flat('#53d9ee',.60));
}
for(let j=0;j<=10;j++){
  const x=-.61+j*.122;
  addBox(displayRoot,[.002,.002,.025],[x,.032,-.19],flat('#98edeb',.55));
}
// Visibly separate transducer and receiver. They are intentionally not photorealistic.
const sourceHousing=addBox(displayRoot,[.105,.19,.18],[-.574,.14,0],mat('#233647',{metalness:.4,roughness:.48}));
const speakerRim=addCylinder(displayRoot,.067,.067,.012,[-.51,.157,0],mat('#8da9b5',{metalness:.75,roughness:.3}),48);
speakerRim.rotation.z=Math.PI/2;
const diaphragm=addCylinder(displayRoot,.053,.053,.006,[-.500,.157,0],flat('#50d8f3'),48);
diaphragm.rotation.z=Math.PI/2;
const micStand=addCylinder(displayRoot,.007,.007,.155,[.586,.109,0],mat('#98bac8',{metalness:.7}));
addCylinder(displayRoot,.045,.052,.012,[.586,.041,0],mat('#4d6d80',{metalness:.5}));
const micHead=addCylinder(displayRoot,.025,.028,.075,[.586,.213,0],mat('#c9d4dc',{metalness:.6}),32);
micHead.rotation.z=Math.PI/2;
const micLed=new THREE.Mesh(new THREE.SphereGeometry(.012,12,9),flat('#1cd09b'));
micLed.position.set(.628,.213,0);
displayRoot.add(micLed);
// Decorative conductor rails over and under the medium.
for (const y of [.068,.34]) for (const z of [-.16,.16]) {
  addBox(displayRoot, [.95,.006,.005], [0,y,z], flat('#a8cdd9', .3));
}
const axisLine = addBox(displayRoot,[.92,.003,.003],[0,.055,0],flat('#77eed8',.45));

function makeSprite(text, position, width = .43, size = 36) {
  const canvas=document.createElement('canvas'); canvas.width=768; canvas.height=128;
  const ctx=canvas.getContext('2d');
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false});
  const sprite=new THREE.Sprite(material);
  sprite.scale.set(width,width/6.0,1);
  sprite.position.set(...position);
  labelsRoot.add(sprite);
  function setText(value){
    ctx.clearRect(0,0,768,128);
    ctx.fillStyle='rgba(9,27,41,.88)';ctx.beginPath();ctx.roundRect(4,5,760,118,23);ctx.fill();
    ctx.lineWidth=3;ctx.strokeStyle='#8af2d4';ctx.stroke();
    ctx.fillStyle='#e9fffa';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`700 ${size}px system-ui`;
    ctx.fillText(value,384,64,690);texture.needsUpdate=true;
  }
  setText(text);
  return {sprite,setText,texture,material};
}
const mediumLabel=makeSprite('LUFT · 1.000 Hz',[0,.43,0],.52,38);
const sourceLabel=makeSprite('SOURCE',[-.564,.29,0],.17,38);
const micLabel=makeSprite('RECEIVER',[.58,.33,0],.19,38);
const waveLabel=makeSprite('VERDICHTUNG / VERDÜNNUNG',[0,.48,-.055],.55,28);

let instanced=null;
let pointMeta=[];
let linkLine=null;
let linkData=[];
let chamberMesh=null;
const dotGeometry=new THREE.SphereGeometry(1,9,7);
const dummy=new THREE.Object3D();
const colorTemp=new THREE.Color();
const baseColor=new THREE.Color();
const highColor=new THREE.Color();
const xLow=-.445,xHigh=.445,xRange=xHigh-xLow;
const yLow=.115,yHigh=.298;

// A medium change updates three distinct visual languages (sparse gas, dense fluid, solid lattice).
function rebuildMedium() {
  if(instanced){particlesRoot.remove(instanced);instanced.material.dispose();instanced=null;}
  if(linkLine){particlesRoot.remove(linkLine);linkLine.geometry.dispose();linkLine.material.dispose();linkLine=null;}
  if(chamberMesh){chamberRoot.remove(chamberMesh);chamberMesh.geometry.dispose();chamberMesh.material.dispose();chamberMesh=null;}
  linkData=[];
  const md=MEDIUM[state.medium];
  const cols=md.columns, rows=md.rows, layers=md.layers;
  const count=cols*rows*layers;
  const particleMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',metalness:state.medium==='steel'?.56:.10,roughness:state.medium==='steel'?.24:.39});
  instanced=new THREE.InstancedMesh(dotGeometry,particleMaterial,count);
  instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  instanced.frustumCulled=false;
  particlesRoot.add(instanced);
  pointMeta=[];
  for(let a=0;a<cols;a++) for(let b=0;b<rows;b++) for(let c=0;c<layers;c++) {
    const nx=a/(cols-1);
    let y=yLow+b*(yHigh-yLow)/(rows-1), z=-.115+c*.115;
    if(state.medium==='air'){
      // Gas: slight stable spatial disorder, not random particle drift.
      y+=.005*Math.sin(a*2.7+b*1.8+c*.7);
      z+=.005*Math.cos(a*.91+b*2.4+c*1.6);
    } else if(state.medium==='water') {
      y+=.003*Math.sin(a*1.7+b*1.2+c*.73);
    }
    pointMeta.push({nx, y, z, row:b, layer:c});
  }
  if(state.medium==='steel'){
    const vertices=[];
    const at=(a,b,c)=>({nx:a/(cols-1),y:yLow+b*(yHigh-yLow)/(rows-1),z:-.115+c*.115});
    // Longitudinal links; endpoints move with the lattice sites during animation.
    for(let b=0;b<rows;b++)for(let c=0;c<layers;c++)for(let a=0;a<cols-1;a++){
      linkData.push([at(a,b,c),at(a+1,b,c)]);
      vertices.push(0,0,0,0,0,0);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    linkLine=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:'#8daec8',transparent:true,opacity:.48,depthWrite:false}));
    linkLine.frustumCulled=false;
    particlesRoot.add(linkLine);
  }
  const chamberOpacity=state.medium==='air'?.027:.055;
  const chamberColor=state.medium==='water'?'#087aa2':'#89caff';
  chamberMesh=new THREE.Mesh(new THREE.BoxGeometry(.94,.265,.326),flat(chamberColor,chamberOpacity));
  chamberMesh.position.set(0,.205,0);
  chamberRoot.add(chamberMesh);
  // Also updates the 3D cosmetics between media.
  const accent = new THREE.Color(md.accent);
  diaphragm.material.color.copy(accent);
  axisLine.material.color.copy(accent);
  for (const ring of waveRings) ring.material.color.copy(accent);
  mediumLabel.setText(`${md.name.toUpperCase()} · ${fmt(state.frequency)} Hz`);
  $('#scene-label').textContent=`${md.name.toUpperCase()} · VERDICHTUNG / VERDÜNNUNG`;
  $('#medium-description').textContent=md.description;
  state.progress=0;
  state.phase=0;
}

// Transparent rings are travelling compression markers. They do not represent
// spherical physical wavefronts or an actual wavefront geometry in every medium.
const waveRings=[];
for(let i=0;i<8;i++){
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.135,.0026,5,64),flat('#8ddcf5',.28));
  ring.rotation.y=Math.PI/2; ring.scale.y=.78;
  effectsRoot.add(ring);waveRings.push(ring);
}

function updateTransform(){
  contentRoot.scale.setScalar(state.scale);
  contentRoot.rotation.y=state.rotation*Math.PI/180;
  $('#size-value').textContent=`${Math.round(state.scale*100)} %`;
  $('#rotation-value').textContent=`${state.rotation}°`;
}
function updateInfo(){
  const md=MEDIUM[state.medium];
  $('#info-title').textContent=`Longitudinalwelle in ${md.name}`;
  $('#info-text').textContent=`${md.info} Die Teilchen pendeln entlang der Ausbreitungsachse; die Störung wandert zur Empfangsseite. Frequenz und Medium ändern die berechnete Wellenlänge und Laufzeit.`;
}
function updateMetrics(){
  const md=MEDIUM[state.medium];
  const lambda=md.c/state.frequency;
  const ms=1000*state.distance/md.c;
  $('#metric-speed').textContent=`${fmt(md.c)} m/s`;
  $('#metric-wave').textContent=wavelengthString(lambda);
  $('#metric-time').textContent=`${fmt(ms, ms<2?2:1)} ms`;
  $('#medium-current').textContent=md.name;
  $('#freq-current').textContent=`${fmt(state.frequency)} Hz`;
  $('#measure-current').textContent=`${state.distance} m · ${state.speed==='slow'?'langsam':'normal'}`;
  $('#playback-current').textContent=state.speed==='slow'?'Extra langsam':'Normaltempo (Zeitlupe)';
  $('#play-pause').textContent=state.paused?'▶ Weiter':'Ⅱ Pause';
  for(const btn of document.querySelectorAll('[data-medium]'))btn.classList.toggle('active',btn.dataset.medium===state.medium);
  for(const btn of document.querySelectorAll('[data-frequency]'))btn.classList.toggle('active',Number(btn.dataset.frequency)===state.frequency);
  for(const btn of document.querySelectorAll('[data-distance]'))btn.classList.toggle('active',Number(btn.dataset.distance)===state.distance);
  for(const btn of document.querySelectorAll('[data-speed]'))btn.classList.toggle('active',btn.dataset.speed===state.speed);
  mediumLabel.setText(`${md.name.toUpperCase()} · ${fmt(state.frequency)} Hz`);
  waveLabel.setText(`λ = ${wavelengthString(lambda)} · VEREINFACHT`);
  updateInfo();
}
function setMedium(medium){if(!MEDIUM[medium])return;state.medium=medium;rebuildMedium();updateMetrics();}
function setFrequency(f){if(!FREQUENCIES.includes(f))return;state.frequency=f;state.progress=0;state.phase=0;updateMetrics();}
function setDistance(distance){if(!DISTANCES.includes(distance))return;state.distance=distance;updateMetrics();}
function resetModel(){
  Object.assign(state,{medium:'air',frequency:1000,distance:10,speed:'normal',paused:false,scale:1,rotation:0,progress:0,phase:0});
  $('#size-slider').value=100;$('#rotation-slider').value=0;
  updateTransform();rebuildMedium();updateMetrics();
  if(renderer.xr.isPresenting)resetPlacement();
  else {placementRoot.position.set(0,0,0);placementRoot.quaternion.identity();}
  setStatus(renderer.xr.isPresenting?'Erneut eine Fläche anvisieren':'3D-Vorschau zurückgesetzt');
}
for(const btn of document.querySelectorAll('[data-medium]'))btn.addEventListener('click',()=>setMedium(btn.dataset.medium));
for(const btn of document.querySelectorAll('[data-frequency]'))btn.addEventListener('click',()=>setFrequency(Number(btn.dataset.frequency)));
for(const btn of document.querySelectorAll('[data-distance]'))btn.addEventListener('click',()=>setDistance(Number(btn.dataset.distance)));
for(const btn of document.querySelectorAll('[data-speed]'))btn.addEventListener('click',()=>{state.speed=btn.dataset.speed;updateMetrics();});
$('#play-pause').addEventListener('click',()=>{state.paused=!state.paused;updateMetrics();});
$('#size-slider').addEventListener('input',e=>{state.scale=Number(e.target.value)/100;updateTransform();});
$('#rotation-slider').addEventListener('input',e=>{state.rotation=Number(e.target.value);updateTransform();});
$('#reset').addEventListener('click',resetModel);
$('#info-close').addEventListener('click',()=>{state.infoVisible=false;$('#info-box').hidden=true;$('#info-toggle').hidden=false;});
$('#info-toggle').addEventListener('click',()=>{state.infoVisible=true;$('#info-box').hidden=false;$('#info-toggle').hidden=true;});

// --- WebXR hit-test placement (reticle in real space; no camera parenting) ---
const reticle=new THREE.Mesh(
  new THREE.RingGeometry(.070,.092,52).rotateX(-Math.PI/2),
  new THREE.MeshBasicMaterial({color:'#6cfdba',side:THREE.DoubleSide,depthTest:false})
);
reticle.matrixAutoUpdate=false;reticle.visible=false;scene.add(reticle);
let placed=false;
let hitTestSource=null;
let requestingHitTest=false;
const xrController=renderer.xr.getController(0);
scene.add(xrController);
function updatePlaceButtons(){
  const isXR=renderer.xr.isPresenting;
  $('#place-now').hidden=!isXR||placed||!reticle.visible;
  $('#place-again').hidden=!isXR||!placed;
}
function resetPlacement(){
  placed=false;placementRoot.visible=false;reticle.visible=false;
  setStatus('Tisch anvisieren · auf grünen Kreis tippen');
  updatePlaceButtons();
}
function place(){
  if(!renderer.xr.isPresenting||placed||!reticle.visible)return;
  placementRoot.position.setFromMatrixPosition(reticle.matrix);
  placementRoot.quaternion.setFromRotationMatrix(reticle.matrix);
  placementRoot.visible=true;placed=true;reticle.visible=false;
  setStatus('Wellenmodell auf dem Tisch platziert');
  updatePlaceButtons();
}
xrController.addEventListener('select',place);
$('#place-now').addEventListener('click',e=>{e.stopPropagation();place();});
$('#place-again').addEventListener('click',e=>{e.stopPropagation();resetPlacement();});
const arButton=ARButton.createButton(renderer,{
  requiredFeatures:['hit-test'],
  optionalFeatures:['dom-overlay'],
  domOverlay:{root:$('#overlay')}
});
$('#ar-launch').appendChild(arButton);
enablePinchScaling();
renderer.xr.addEventListener('sessionstart',()=>{
  document.body.classList.add('in-xr');scene.background=null;
  orbit.enabled=false;resetPlacement();
  if(!renderer.xr.getSession()?.domOverlayState) setStatus('AR aktiv – Browser blendet Bedienoberfläche evtl. aus');
});
renderer.xr.addEventListener('sessionend',()=>{
  hitTestSource?.cancel();hitTestSource=null;requestingHitTest=false;
  document.body.classList.remove('in-xr');
  scene.background=background;orbit.enabled=true;
  placed=false;reticle.visible=false;placementRoot.visible=true;
  placementRoot.position.set(0,0,0);placementRoot.quaternion.identity();
  updatePlaceButtons();setStatus('3D-Vorschau bereit');
});
async function requestHitTest(session){
  if(hitTestSource||requestingHitTest)return;
  requestingHitTest=true;
  try{
    const viewer=await session.requestReferenceSpace('viewer');
    if(renderer.xr.getSession()!==session)return;
    const source=await session.requestHitTestSource({space:viewer});
    if(renderer.xr.getSession()===session)hitTestSource=source;
    else source.cancel();
  }catch(err){setStatus(`Tischerkennung nicht verfügbar: ${err.message}`);}
  finally{requestingHitTest=false;}
}

// Particle animation: longitudinal displacement, travelling wave packet and luminance.
const clock=new THREE.Clock();
const scratchColor=new THREE.Color();
const tmpVec=new THREE.Vector3();
function displacement(nx,phase,progress,k){
  const activation=THREE.MathUtils.smoothstep(progress-nx,0,.14);
  const angle=2*Math.PI*(k*nx-phase);
  return .0062*Math.sin(angle)*activation;
}
function animateParticles(){
  if(!instanced)return;
  const md=MEDIUM[state.medium];
  const cycles=visualCycles(state.frequency);
  baseColor.set(md.base);highColor.set(md.compress);
  const n=pointMeta.length;
  const phase=state.phase;
  for(let i=0;i<n;i++){
    const p=pointMeta[i];
    const active=THREE.MathUtils.smoothstep(state.progress-p.nx,0,.14);
    const angle=2*Math.PI*(cycles*p.nx-phase);
    const u=.0062*Math.sin(angle)*active;
    const x=xLow+xRange*p.nx+u;
    dummy.position.set(x,p.y,p.z);
    // Compression corresponds approximately to negative spatial displacement derivative.
    const compression=Math.max(0,-Math.cos(angle))*active;
    const size=md.dot*(1+.22*compression);
    dummy.scale.setScalar(size);
    dummy.rotation.set(0,0,0);dummy.updateMatrix();
    instanced.setMatrixAt(i,dummy.matrix);
    scratchColor.copy(baseColor).lerp(highColor,.68*compression);
    if(active<.001)scratchColor.multiplyScalar(.55);
    instanced.setColorAt(i,scratchColor);
  }
  instanced.instanceMatrix.needsUpdate=true;
  if(instanced.instanceColor)instanced.instanceColor.needsUpdate=true;
  if(linkLine){
    let v=0;
    const arr=linkLine.geometry.attributes.position.array;
    for(const [p,q] of linkData){
      arr[v++]=xLow+xRange*p.nx+displacement(p.nx,phase,state.progress,cycles);
      arr[v++]=p.y;arr[v++]=p.z;
      arr[v++]=xLow+xRange*q.nx+displacement(q.nx,phase,state.progress,cycles);
      arr[v++]=q.y;arr[v++]=q.z;
    }
    linkLine.geometry.attributes.position.needsUpdate=true;
  }
  // A microphone LED lights up after the leading disturbance reaches its end.
  const atReceiver=state.progress>1.03;
  micLed.material.color.set(atReceiver?'#ffdd7d':'#2dceae');
  const wobble=state.progress<.04?.0025: .0015;
  diaphragm.position.x=-.500+wobble*Math.sin(state.phase*2*Math.PI*cycles);
  for(let i=0;i<waveRings.length;i++){
    const ring=waveRings[i];
    const position=state.progress-i/cycles*.95;
    ring.visible=position>0&&position<1.02;
    ring.position.set(xLow+xRange*position,.205,0);
    ring.material.opacity=ring.visible?(.12+i*.02)*Math.min(1,(state.progress-position+.025)*9):0;
    const pulse=1+.08*Math.sin(state.phase*5+i);
    ring.scale.set(pulse, .83*pulse,pulse);
  }
}
renderer.setAnimationLoop((_time,frame)=>{
  const dt=Math.min(clock.getDelta(),.05);
  if(!state.paused){
    const md=MEDIUM[state.medium];
    state.progress+=dt*md.frontSpeed*(state.speed==='slow'?.42:1);
    state.phase+=dt*1.05*(state.speed==='slow'?.42:1);
    if(state.progress>1.36){state.progress=0;state.phase=0;}
  }
  animateParticles();
  if(renderer.xr.isPresenting && frame && !placed){
    const session=renderer.xr.getSession();
    if(session)requestHitTest(session);
    if(hitTestSource){
      const hits=frame.getHitTestResults(hitTestSource);
      const referenceSpace=renderer.xr.getReferenceSpace();
      if(hits.length && referenceSpace){
        const pose=hits[0].getPose(referenceSpace);
        if(pose){reticle.matrix.fromArray(pose.transform.matrix);reticle.visible=true;}
        else reticle.visible=false;
      }else reticle.visible=false;
    }
    updatePlaceButtons();
  }
  if(!renderer.xr.isPresenting)orbit.update();
  renderer.render(scene,camera);
});
window.addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
rebuildMedium();updateMetrics();updateTransform();
if(!navigator.xr)setStatus('Keine WebXR-Unterstützung – 3D-Vorschau verfügbar');
