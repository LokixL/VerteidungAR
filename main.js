import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// RIPLEY Fire Physics: illustrative visualization, not a physically calibrated fire model.
const app = document.querySelector('#app');
app.innerHTML = `
  <div id="stage"></div>
  <div id="overlay">
    <header class="topbar">
      <div class="brand"><strong>RIPLEY</strong><small>FIRE PHYSICS · AR DEMONSTRATOR</small></div>
      <div id="status" role="status" aria-live="polite">3D-Vorschau bereit</div>
    </header>
    <div class="grow"></div>
    <section class="panel" id="controls-panel">
      <div class="menu-toggle-row"><button id="menu-toggle" class="menu-toggle" type="button" aria-controls="controls-panel" aria-expanded="true">▾ Menü einklappen</button></div>
      <div class="panel-head"><div><span class="eyebrow">LIVING ROOM SCENARIO</span><h1 id="mode-title">Wohnzimmer</h1></div><button id="reset" class="reset" type="button">↺ Reset</button></div>
      <p class="description" id="mode-description">Ausgangssituation: Möbel und elektrische Steckdosenleiste.</p>
      <div class="button-grid" id="mode-buttons"></div>
      <div class="settings-grid">
        <div class="setting">
          <label for="scale-control">Größe <strong id="scale-value">100 %</strong></label>
          <div class="scale-row">
            <button id="scale-minus" class="stepper" type="button" aria-label="Verkleinern">−</button>
            <input id="scale-control" type="range" min="30" max="250" step="5" value="100" />
            <button id="scale-plus" class="stepper" type="button" aria-label="Vergrößern">+</button>
          </div>
        </div>
        <div class="setting view-control">
          <span class="view-heading">Ansicht</span>
          <div class="view-switch" role="group" aria-label="Darstellungsmodus">
            <button id="view-normal" class="view-button active" type="button" aria-pressed="true">Normal</button>
            <button id="view-thermal" class="view-button" type="button" aria-pressed="false">Temperatur</button>
          </div>
        </div>
      </div>
      <div class="rotation-setting">
        <label for="rotation-control">Wohnzimmer drehen <strong id="rotation-value">0°</strong></label>
        <div class="rotation-row">
          <button id="rotate-left" class="stepper" type="button" aria-label="15 Grad nach links drehen">↶</button>
          <input id="rotation-control" type="range" min="0" max="360" step="5" value="0" aria-label="Wohnzimmer um die senkrechte Achse drehen" />
          <button id="rotate-right" class="stepper" type="button" aria-label="15 Grad nach rechts drehen">↷</button>
        </div>
      </div>
      <div class="temperature-panel" id="temperature-panel" hidden>
        <div class="temperature-heading"><strong>Temperaturübersicht</strong><span>Illustrative Werte</span></div>
        <label class="temp-field" for="temp-source"><span><i class="temp-dot source-dot"></i>Brandquelle · Steckdosenleiste</span><strong id="temp-source-value">20 °C</strong></label>
        <input id="temp-source" type="range" min="20" max="600" step="5" value="20" />
        <label class="temp-field" for="temp-air"><span><i class="temp-dot air-dot"></i>Heißgase · obere Raumzone</span><strong id="temp-air-value">20 °C</strong></label>
        <input id="temp-air" type="range" min="20" max="300" step="5" value="20" />
        <label class="temp-field" for="temp-surface"><span><i class="temp-dot surface-dot"></i>Oberfläche · Sofa</span><strong id="temp-surface-value">20 °C</strong></label>
        <input id="temp-surface" type="range" min="20" max="300" step="5" value="20" />
        <p class="small-note">Schematische Temperaturzonen: frei einstellbare Beispielwerte, keine Simulation, Messung oder Vorhersage. Wärmeleitung wird gesondert an der Steckdosenleiste illustriert.</p>
      </div>
      <p class="hint" id="hint">Desktop: Modell mit der Maus drehen. Android: START AR drücken, Tisch anvisieren und einmal ins Kamerabild tippen.</p>
    </section>
    <div id="ar-launch"></div>
  </div>`;

const UI = {
  status: document.querySelector('#status'),
  title: document.querySelector('#mode-title'),
  description: document.querySelector('#mode-description'),
  buttons: document.querySelector('#mode-buttons'),
  hint: document.querySelector('#hint'),
  overlay: document.querySelector('#overlay')
};
const setStatus = (message) => { UI.status.textContent = message; };

// Collapse the controls without stopping AR or changing the current demonstration.
const controlsPanel = document.querySelector('#controls-panel');
const menuToggle = document.querySelector('#menu-toggle');
menuToggle.addEventListener('click', (event) => {
  event.stopPropagation();
  const collapsed = controlsPanel.classList.toggle('is-collapsed');
  menuToggle.setAttribute('aria-expanded', String(!collapsed));
  menuToggle.textContent = collapsed ? '☰ Menü öffnen' : '▾ Menü einklappen';
});

const scene = new THREE.Scene();
scene.background = new THREE.Color('#172333');
scene.add(new THREE.HemisphereLight(0xffffff, 0x62718a, 2.3));
const sun = new THREE.DirectionalLight(0xffffff, 2.5);
sun.position.set(0.6, 2.5, 1.6);
scene.add(sun);
const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.01, 30);
camera.position.set(0.75, 0.55, 0.95);
camera.lookAt(0, 0.13, 0);
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.xr.enabled = true;
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.querySelector('#stage').appendChild(renderer.domElement);
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.target.set(0, 0.12, 0);
orbit.enableDamping = true;

// The placement root is moved ONCE following the WebXR hit-test. Never animate this root.
const placementRoot = new THREE.Group();
scene.add(placementRoot);
const roomRoot = new THREE.Group();
const fireFx = new THREE.Group();
const radiationFx = new THREE.Group();
const convectionFx = new THREE.Group();
const conductionFx = new THREE.Group();
const contentRoot = new THREE.Group();
placementRoot.add(contentRoot);
contentRoot.add(roomRoot, fireFx, radiationFx, convectionFx, conductionFx);
const thermalFx = new THREE.Group();
contentRoot.add(thermalFx);

const mat = (c, opts={}) => new THREE.MeshStandardMaterial({ color:c, roughness:0.8, ...opts });
const basic = (c, opacity=1) => new THREE.MeshBasicMaterial({ color:c, transparent:opacity<1, opacity, depthWrite:false, side:THREE.DoubleSide });
const box = (parent, size, position, material) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  m.position.set(...position); parent.add(m); return m;
};
function clearGroup(group) {
  while (group.children.length) {
    const child = group.children[0]; group.remove(child);
    child.traverse(object => {
      if (object.isMesh) {
        object.geometry?.dispose();
        const materials=Array.isArray(object.material)?object.material:[object.material];
        materials.forEach(m=>m?.dispose());
      }
    });
  }
}

function buildRoom() {
  clearGroup(roomRoot);
  const floor=mat('#bba58b');
  const walls=mat('#e7dac6', { side:THREE.DoubleSide });
  box(roomRoot,[0.67,0.012,0.50],[0,0.006,0],floor);
  box(roomRoot,[0.67,0.28,0.012],[0,0.14,-0.244],walls);
  box(roomRoot,[0.012,0.28,0.50],[-0.33,0.14,0],walls);
  const sofa=mat('#336475');
  box(roomRoot,[0.23,0.075,0.11],[-0.155,0.064,0.035],sofa);
  box(roomRoot,[0.23,0.105,0.035],[-0.155,0.113,-0.028],sofa);
  for(const x of [-0.254,-0.056])box(roomRoot,[0.035,0.07,0.11],[x,0.065,0.035],sofa);
  box(roomRoot,[0.23,0.003,0.16],[-0.03,0.015,0.10],mat('#c18d70'));
  box(roomRoot,[0.14,0.014,0.115],[0.12,0.092,0.07],mat('#79563f'));
  for(const x of [0.068,0.172])for(const z of [0.027,0.115])box(roomRoot,[0.012,0.08,0.012],[x,0.05,z],mat('#654734'));
  box(roomRoot,[0.075,0.11,0.095],[0.252,0.061,-0.13],mat('#8f7558'));
  // Electrical power strip: the source of the illustrative fault (x=0.215,z=-0.194).
  box(roomRoot,[0.074,0.014,0.032],[0.213,0.025,-0.194],mat('#25282c'));
  for(let i=0;i<3;i++)box(roomRoot,[0.008,0.002,0.012],[0.191+i*0.022,0.033,-0.194],mat('#c9d2d7'));
  // Window and curtain to make heat transfer effects readable.
  box(roomRoot,[0.13,0.13,0.007],[-0.22,0.18,-0.234],mat('#89a6ad',{metalness:0.15}));
  box(roomRoot,[0.027,0.21,0.014],[-0.292,0.17,-0.225],mat('#c58a68'));
  box(roomRoot,[0.027,0.21,0.014],[-0.148,0.17,-0.225],mat('#c58a68'));
}

// Effects are intentionally separate from roomRoot so a GLB can replace only the furniture.
const SOURCE = new THREE.Vector3(0.213,0.04,-0.194);
function buildFire() {
  clearGroup(fireFx);
  const ember=new THREE.Mesh(new THREE.SphereGeometry(0.017,16,12),basic('#ff5f1f',0.88));
  ember.position.copy(SOURCE); ember.name='ember';fireFx.add(ember);
  for(let i=0;i<8;i++){
    const smoke=new THREE.Mesh(new THREE.SphereGeometry(0.014+i*0.0015,10,8),basic('#8f9399',0.29));
    smoke.userData.smokeIndex=i;fireFx.add(smoke);
  }
  const glow=new THREE.PointLight('#ff661e',0.6,0.25);glow.position.copy(SOURCE); fireFx.add(glow);
}
function buildRadiation() {
  clearGroup(radiationFx);
  // Expanding horizontal arcs illustrate radiative energy directed toward nearby objects.
  for(let i=0;i<5;i++) {
    const circle = new THREE.Mesh(new THREE.RingGeometry(0.05+i*0.033,0.052+i*0.033,64,1,0,Math.PI*1.15),basic('#ffad3d',0.88));
    circle.rotation.x=-Math.PI/2;circle.rotation.z=0.3;
    circle.position.copy(SOURCE).add(new THREE.Vector3(0,0.008,0));
    circle.userData.phase=i; radiationFx.add(circle);
  }
  // Highlight heating of a nearby object without implying a quantitative temperature.
  const hotspot=box(radiationFx,[0.043,0.015,0.08],[0.249,0.124,-0.128],basic('#ffb347',0.48));
  hotspot.userData.hotspot=true;
}
function buildConvection() {
  clearGroup(convectionFx);
  // Animated ascending arrows represent transport by rising hot gases.
  for(let i=0;i<10;i++){
    const material=basic(i%2?'#ffe18b':'#ff8735',0.85);
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(0.002,0.002,0.045,7),material);
    const tip=new THREE.Mesh(new THREE.ConeGeometry(0.009,0.020,9),material);
    const arrow=new THREE.Group(); stem.position.y=0.003;tip.position.y=0.033;
    arrow.add(stem,tip);arrow.userData.particle=i;convectionFx.add(arrow);
  }
}
function buildConduction() {
  clearGroup(conductionFx);
  // A luminous trail through the strip shows conductive heat transfer in the solid housing.
  const conductor=box(conductionFx,[0.075,0.016,0.035],[0.213,0.025,-0.194],basic('#ff7e2b',0.33));
  conductor.userData.conductor=true;
  for(let i=0;i<7;i++){
    const dot=new THREE.Mesh(new THREE.SphereGeometry(0.0045,10,8),basic('#ffcf63',0.97));
    dot.userData.dotIndex=i;conductionFx.add(dot);
  }
}
buildRoom();buildFire();buildRadiation();buildConvection();buildConduction();
// Visual temperature zones; each is an independent illustrative input.
// These values do NOT result from a physically calibrated fire model.
const thermalZones = {
  source: { position: SOURCE.clone(), radius: 0.037, value: 20, maximum: 600 },
  air: { position: new THREE.Vector3(0.06, 0.225, -0.06), radius: 0.085, value: 20, maximum: 300 },
  surface: { position: new THREE.Vector3(-0.155, 0.106, 0.037), radius: 0.057, value: 20, maximum: 300 }
};
for (const [name, zone] of Object.entries(thermalZones)) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(zone.radius, 24, 16),
    new THREE.MeshBasicMaterial({ color: '#4d9edb', transparent: true, opacity: 0.12,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  );
  mesh.position.copy(zone.position);
  zone.mesh = mesh;
  thermalFx.add(mesh);
}
function zoneColor(value, max) {
  const ratio = THREE.MathUtils.clamp((value - 20) / (max - 20), 0, 1);
  return new THREE.Color().setHSL((0.60 - 0.60 * ratio), 0.95, 0.55);
}
function setZoneTemp(name, temp) {
  const zone = thermalZones[name];
  if (!zone) return;
  zone.value = THREE.MathUtils.clamp(Number(temp), 20, zone.maximum);
  document.querySelector(`#temp-${name}`).value = String(zone.value);
  document.querySelector(`#temp-${name}-value`).textContent = `${zone.value} °C`;
  zone.mesh.material.color.copy(zoneColor(zone.value, zone.maximum));
  const intensity = (zone.value - 20) / (zone.maximum - 20);
  zone.mesh.material.opacity = 0.09 + 0.30 * intensity;
  zone.mesh.scale.setScalar(0.9 + 0.3 * intensity);
}
for (const name of Object.keys(thermalZones)) {
  document.querySelector(`#temp-${name}`).addEventListener('input', e => {
    setZoneTemp(name, e.target.value);
  });
}

let currentView = 'normal';
function setView(view) {
  currentView = view === 'thermal' ? 'thermal' : 'normal';
  thermalFx.visible = currentView === 'thermal';
  document.querySelector('#temperature-panel').hidden = currentView !== 'thermal';
  for (const [id, value] of [['view-normal','normal'], ['view-thermal','thermal']]) {
    const btn = document.getElementById(id);
    btn.classList.toggle('active', value === currentView);
    btn.setAttribute('aria-pressed', String(value === currentView));
  }
}
document.querySelector('#view-normal').addEventListener('click', () => setView('normal'));
document.querySelector('#view-thermal').addEventListener('click', () => setView('thermal'));

// Preset temperatures are purely illustrative values chosen for communication,
// and never imply real heating rates or thermodynamic coupling.
const TEMPERATURE_PRESETS = {
  room:       { source:20,  air:20,  surface:20 },
  fire:       { source:200, air:35,  surface:35 },
  radiation:  { source:240, air:45,  surface:110 },
  convection: { source:240, air:120, surface:55 },
  conduction: { source:240, air:40,  surface:40 }
};
function setTemperaturePreset(state) {
  for (const [name, value] of Object.entries(TEMPERATURE_PRESETS[state])) {
    setZoneTemp(name, value);
  }
}
setTemperaturePreset('room');
setView('normal');

// Scale the entire demonstration as one unit, keeping the hit-test placement untouched.
const scaleSlider=document.querySelector('#scale-control');
let scaleValue=1;
function setModelScale(scale){
  scaleValue=THREE.MathUtils.clamp(Number(scale),0.3,2.5);
  contentRoot.scale.setScalar(scaleValue);
  scaleSlider.value=Math.round(scaleValue*100);
  document.querySelector('#scale-value').textContent=`${Math.round(scaleValue*100)} %`;
}
setModelScale(1);
scaleSlider.addEventListener('input',e=>setModelScale(Number(e.target.value)/100));
document.querySelector('#scale-minus').addEventListener('click',()=>setModelScale(scaleValue-0.1));
document.querySelector('#scale-plus').addEventListener('click',()=>setModelScale(scaleValue+0.1));

// Rotate only the visual content around the vertical (Y) axis.
// The WebXR hit-test placement root remains aligned with the real table.
const rotationSlider = document.querySelector('#rotation-control');
let modelRotationDegrees = 0;
function setModelRotation(degrees) {
  const requestedDegrees = Number(degrees);
  if (!Number.isFinite(requestedDegrees)) return;
  // Preserve 360° on the slider; 0° and 360° are equivalent in 3D.
  modelRotationDegrees = Math.max(0, Math.min(360, requestedDegrees));
  contentRoot.rotation.y = THREE.MathUtils.degToRad(modelRotationDegrees);
  rotationSlider.value = String(modelRotationDegrees);
  document.querySelector('#rotation-value').textContent = `${Math.round(modelRotationDegrees)}°`;
}
rotationSlider.addEventListener('input', e => setModelRotation(e.target.value));
document.querySelector('#rotate-left').addEventListener('click', e => {
  e.stopPropagation();
  setModelRotation((modelRotationDegrees - 15 + 360) % 360);
});
document.querySelector('#rotate-right').addEventListener('click', e => {
  e.stopPropagation();
  setModelRotation((modelRotationDegrees + 15) % 360);
});
setModelRotation(0);

// Two-finger pinch zoom is an optional convenience. The slider is the reliable fallback.
let pinchStartDistance=null,pinchStartScale=1;
const distance=(a,b)=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
renderer.domElement.addEventListener('touchstart',e=>{
  if(e.touches.length===2){pinchStartDistance=distance(e.touches[0],e.touches[1]);pinchStartScale=scaleValue;}
},{passive:true});
renderer.domElement.addEventListener('touchmove',e=>{
  if(e.touches.length===2&&pinchStartDistance>0){
    e.preventDefault();setModelScale(pinchStartScale*distance(e.touches[0],e.touches[1])/pinchStartDistance);
  }
},{passive:false});
renderer.domElement.addEventListener('touchend',e=>{if(e.touches.length<2)pinchStartDistance=null;},{passive:true});

const states = {
  room:{label:'Wohnzimmer',description:'Ausgangssituation: Sofa, Vorhang und elektrische Steckdosenleiste.'},
  fire:{label:'Brandentstehung',description:'Schematische Überhitzung an einer elektrischen Steckdosenleiste mit beginnender Rauchentwicklung.'},
  radiation:{label:'Radiation · Wärmestrahlung',description:'Strahlungsenergie wird vom heißen Bereich an benachbarte Oberflächen übertragen.'},
  convection:{label:'Convection · Konvektion',description:'Aufsteigende heiße Gase transportieren Wärme in die obere Raumzone.'},
  conduction:{label:'Conduction · Wärmeleitung',description:'Wärme breitet sich innerhalb des festen Materials der Steckdosenleiste aus.'}
};
let currentState='room';
const labels=[['room','Wohnzimmer'],['fire','Brand'],['radiation','Radiation'],['convection','Convection'],['conduction','Conduction']];
for(const [id,label] of labels){
  const button=document.createElement('button');
  button.type='button';button.dataset.mode=id;button.textContent=label;
  button.addEventListener('click',e=>{e.stopPropagation();setState(id);});
  UI.buttons.appendChild(button);
}
function setState(state){
  currentState=state;
  fireFx.visible=state!=='room';
  radiationFx.visible=state==='radiation';
  convectionFx.visible=state==='convection';
  conductionFx.visible=state==='conduction';
  setTemperaturePreset(state); // illustrative example for the selected mechanism
  UI.title.textContent=states[state].label;
  UI.description.textContent=states[state].description;
  for(const btn of UI.buttons.children)btn.classList.toggle('active',btn.dataset.mode===state);
}
setState('room');

document.querySelector('#reset').addEventListener('click',e=>{
  e.stopPropagation();setState('room');setView('normal');setModelScale(1);setModelRotation(0);
  if(renderer.xr.isPresenting){ placed=false;placementRoot.visible=false;setStatus('Erneut eine Tischfläche anvisieren und tippen'); }
  else { placementRoot.position.set(0,0,0);placementRoot.quaternion.identity();setStatus('Wohnzimmer zurückgesetzt'); }
});

// Optional Meshy export. The model is aligned to a 67 x 50 cm demonstration footprint.
// Effects assume the electrical source is at SOURCE; adjust SOURCE for your GLB layout.
const loader=new GLTFLoader();
const modelUrl = new URL('./models/living-room.glb', import.meta.url).href;
fetch(modelUrl,{method:'HEAD'}).then(response=>{
  if(!response.ok)return;
  loader.load(modelUrl,gltf=>{
    clearGroup(roomRoot);
    const model=gltf.scene;
    model.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(model);
    const size=bounds.getSize(new THREE.Vector3());
    const scale=0.67/Math.max(size.x,size.z,0.0001);
    model.scale.multiplyScalar(scale);
    model.updateMatrixWorld(true);
    const b=new THREE.Box3().setFromObject(model);
    model.position.x-=(b.min.x+b.max.x)*0.5;
    model.position.z-=(b.min.z+b.max.z)*0.5;
    model.position.y-=b.min.y;
    roomRoot.add(model);
    setStatus('Meshy-Wohnzimmer geladen');
  },undefined,error=>console.warn('GLB konnte nicht geladen werden',error));
}).catch(()=>{});

// WebXR table placement via hit-test; AR stays optional so desktop preview works.
const reticle=new THREE.Mesh(
  new THREE.RingGeometry(0.065,0.085,40).rotateX(-Math.PI/2),
  new THREE.MeshBasicMaterial({color:'#5cf1aa',side:THREE.DoubleSide})
);
reticle.matrixAutoUpdate=false;reticle.visible=false;scene.add(reticle);
let placed=false;
let hitTestSource=null;
let requestingHitTest=false;
const xrController=renderer.xr.getController(0);
scene.add(xrController);
function place(){
  if(!renderer.xr.isPresenting || placed || !reticle.visible)return;
  placementRoot.position.setFromMatrixPosition(reticle.matrix);
  placementRoot.quaternion.setFromRotationMatrix(reticle.matrix);
  placementRoot.visible=true;
  placed=true;reticle.visible=false;
  setStatus('Wohnzimmer platziert');
  UI.hint.textContent='Effekt auswählen oder Reset drücken, um neu zu platzieren.';
}
xrController.addEventListener('select',place);
// Prevent UI button presses from triggering placement in immersive AR.
UI.overlay.addEventListener('beforexrselect',e=>{
  if(e.target.closest('button, .panel, #ar-launch'))e.preventDefault();
});
const arButton=ARButton.createButton(renderer,{
  requiredFeatures:['hit-test'],
  optionalFeatures:['dom-overlay'],
  domOverlay:{root:UI.overlay}
});
document.querySelector('#ar-launch').appendChild(arButton);
renderer.xr.addEventListener('sessionstart',()=>{
  document.body.classList.add('in-xr');scene.background=null;
  placementRoot.visible=false;placed=false;reticle.visible=false;orbit.enabled=false;
  const session=renderer.xr.getSession();
  if(!session?.domOverlayState){
    setStatus('DOM Overlay nicht verfügbar – Buttons eventuell nicht im AR-Modus sichtbar');
  }else setStatus('Tisch suchen und antippen');
});
renderer.xr.addEventListener('sessionend',()=>{
  hitTestSource?.cancel();hitTestSource=null;requestingHitTest=false;
  document.body.classList.remove('in-xr');
  placementRoot.visible=true;placed=false;reticle.visible=false;orbit.enabled=true;
  placementRoot.position.set(0,0,0);placementRoot.quaternion.identity();
  scene.background=new THREE.Color('#172333');setStatus('3D-Vorschau bereit');
});
async function requestHitTest(session){
  if(hitTestSource||requestingHitTest)return;
  requestingHitTest=true;
  try{
    const viewerSpace=await session.requestReferenceSpace('viewer');
    if(renderer.xr.getSession()!==session)return;
    const source=await session.requestHitTestSource({space:viewerSpace});
    if(renderer.xr.getSession()===session)hitTestSource=source;
    else source.cancel();
  }catch(err){setStatus(`Tischerkennung nicht verfügbar: ${err.message}`);}
  finally{requestingHitTest=false;}
}

const clock=new THREE.Clock();
renderer.setAnimationLoop((_time,frame)=>{
  const dt=Math.min(clock.getDelta(),0.06);
  const t=clock.elapsedTime;
  const heatIntensity=(thermalZones.source.value-20)/(thermalZones.source.maximum-20);
  for (const zone of Object.values(thermalZones)) {
    if (!zone.mesh.visible) continue;
    const base = 0.09 + 0.30 * (zone.value-20)/(zone.maximum-20);
    zone.mesh.material.opacity = base * (0.96 + 0.04 * Math.sin(t*2.2));
  }
  if(renderer.xr.isPresenting && frame && !placed){
    const session=renderer.xr.getSession();requestHitTest(session);
    if(hitTestSource){
      const hits=frame.getHitTestResults(hitTestSource);
      const space=renderer.xr.getReferenceSpace();
      if(hits.length && space){
        const pose=hits[0].getPose(space);
        if(pose){reticle.matrix.fromArray(pose.transform.matrix);reticle.visible=true;}
        else reticle.visible=false;
      }else reticle.visible=false;
    }
  }
  for(const child of fireFx.children){
    if(child.userData.smokeIndex!==undefined){
      const i=child.userData.smokeIndex,phase=((t*0.26+i/8)%1);
      child.position.set(SOURCE.x+0.018*Math.sin(i*2.7+phase*4), SOURCE.y+0.015+phase*0.19, SOURCE.z+0.013*Math.cos(i*1.7+phase*4));
      child.scale.setScalar(0.55+phase*1.3);
      child.material.opacity=(0.12+0.36*heatIntensity)*(1-phase);
    }
    if(child.name==='ember')child.scale.setScalar((0.55+heatIntensity*0.95)*(0.85+Math.sin(t*8)*0.14));
  }
  for(const ring of radiationFx.children){
    if(ring.userData.phase!==undefined){
      const pulse=(t*0.55+ring.userData.phase/5)%1;
      ring.material.opacity=0.85*(1-pulse);
    }
    if(ring.userData.hotspot)ring.material.opacity=0.24+0.16*(1+Math.sin(t*3));
  }
  for(const arrow of convectionFx.children){
    const i=arrow.userData.particle;
    const phase=(t*0.25+i/10)%1;
    arrow.position.set(SOURCE.x+Math.sin(i*2+phase*4)*0.025,SOURCE.y+0.03+phase*0.23,SOURCE.z+Math.cos(i*2.4+phase*4)*0.025);
    arrow.scale.setScalar(0.7+0.3*(1-phase));
  }
  for(const dot of conductionFx.children){
    if(dot.userData.dotIndex!==undefined){
      const phase=(t*0.42+dot.userData.dotIndex/7)%1;
      dot.position.set(0.183+0.06*phase,0.036,-0.194);
      dot.scale.setScalar(0.8+0.3*Math.sin(phase*Math.PI));
    }
    if(dot.userData.conductor)dot.material.opacity=0.25+0.18*Math.sin(t*3)**2;
  }
  if(!renderer.xr.isPresenting)orbit.update();
  renderer.render(scene,camera);
});
window.addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
if(!navigator.xr)setStatus('WebXR auf diesem Gerät nicht verfügbar – 3D-Vorschau nutzbar');
