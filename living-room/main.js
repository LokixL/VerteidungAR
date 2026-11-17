import * as THREE from 'three';
import { installModelHeight, installDemoNavigation } from '../shared/ripley-controls.js';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// RIPLEY Fire Physics: illustrative visualization, not a physically calibrated fire model.
const app = document.querySelector('#app');
app.innerHTML = `
  <div id="stage"></div>
  <div id="overlay">
    <div id="gesture-surface" aria-hidden="true"></div>
    <header class="topbar">
      <div class="brand"><strong>RIPLEY</strong><small>FIRE PHYSICS · AR DEMONSTRATOR</small></div>
      <div id="status" role="status" aria-live="polite">3D-Vorschau bereit</div>
    </header>
    <div class="grow"></div>
    <section class="panel accordion-panel is-collapsed" id="controls-panel" aria-label="AR-Steuerung">
      <div class="menu-toggle-row">
        <button id="panel-toggle" class="menu-toggle" type="button" aria-controls="panel-inner" aria-expanded="false">☰ Menü</button>
        <span class="panel-summary" id="panel-summary">Wohnzimmer · Normal</span>
      </div>
      <div id="panel-inner" class="panel-inner">
      <details class="control-menu" id="menu-view">
        <summary><span>◉ Ansicht</span><span class="menu-current" id="view-current">Normal</span><span class="menu-arrow">⌄</span></summary>
        <div class="menu-content">
          <div class="view-switch" role="group" aria-label="Darstellungsmodus">
            <button id="view-normal" class="view-button active" type="button" aria-pressed="true">Normal</button>
            <button id="view-thermal" class="view-button" type="button" aria-pressed="false">Thermal</button>
          </div>
          <div id="thermal-info" class="thermal-info" hidden>
            <div class="thermal-info-title">Thermal View · qualitative Temperaturzonen</div>
            <div class="thermal-gradient"></div>
            <div class="thermal-ticks"><span>kühl</span><span>warm</span><span>heiß</span></div>
            <p id="thermal-explanation" class="thermal-explanation">Illustrative Wärmeverteilung zum ausgewählten Mechanismus.</p>
          </div>
        </div>
      </details>
      <details class="control-menu" id="menu-scene">
        <summary><span>♨ Szenario</span><span class="menu-current" id="scene-current">Wohnzimmer</span><span class="menu-arrow">⌄</span></summary>
        <div class="menu-content">
          <div class="button-grid" id="mode-buttons"></div>
        </div>
      </details>
      <details class="control-menu" id="menu-transform">
        <summary><span>⤢ Modellsteuerung</span><span class="menu-current">Größe · Drehung</span><span class="menu-arrow">⌄</span></summary>
        <div class="menu-content">
          <div class="setting">
            <label for="scale-control">Größe <strong id="scale-value">100 %</strong></label>
            <div class="scale-row">
              <button id="scale-minus" class="stepper" type="button" aria-label="Verkleinern">−</button>
              <input id="scale-control" type="range" min="30" max="250" step="5" value="100" />
              <button id="scale-plus" class="stepper" type="button" aria-label="Vergrößern">+</button>
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
          <p class="hint" id="hint">Android: Start AR → grünen Kreis platzieren. Danach: mit einem Finger drehen, mit zwei Fingern skalieren. Alternativ die Regler nutzen.</p>
        </div>
      </details>
      <div class="scenario-feedback" id="scenario-feedback" hidden>
        <div class="scenario-feedback-heading">
          <strong id="mode-title">Wohnzimmer</strong>
          <button id="close-description" type="button" aria-label="Beschreibung schließen" title="Beschreibung schließen">×</button>
        </div>
        <p class="description" id="mode-description">Ausgangssituation: Möbel und elektrische Steckdosenleiste.</p>
      </div>
      <div class="quick-actions"><button id="reset" class="reset" type="button">↺ Reset</button></div>
      </div>
    </section>
    <div id="ar-place-actions" aria-live="polite">
      <button id="place-now" type="button" hidden>◎ Wohnzimmer hier platzieren</button>
      <button id="place-again" type="button" hidden>↺ Neu platzieren</button>
    </div>
    <div id="ar-launch"></div>
  </div>`;

const UI = {
  status: document.querySelector('#status'),
  title: document.querySelector('#mode-title'),
  description: document.querySelector('#mode-description'),
  feedback: document.querySelector('#scenario-feedback'),
  buttons: document.querySelector('#mode-buttons'),
  hint: document.querySelector('#hint'),
  overlay: document.querySelector('#overlay'),
  gestureSurface: document.querySelector('#gesture-surface')
};
const setStatus = (message) => { UI.status.textContent = message; };

// The entire right-side control dock starts collapsed (also on desktop).
// Independent AR start and placement buttons remain visible.
const panel = document.querySelector('#controls-panel');
const panelToggle = document.querySelector('#panel-toggle');
const panelInner = document.querySelector('#panel-inner');
function setPanelOpen(open) {
  panel.classList.toggle('is-collapsed', !open);
  panelToggle.setAttribute('aria-expanded', String(open));
  panelInner.setAttribute('aria-hidden', String(!open));
  panelToggle.textContent = open ? '✕ Schließen' : '☰ Menü';
  if(!open)for(const menu of document.querySelectorAll('#panel-inner details.control-menu'))menu.open=false;
}
panelToggle.addEventListener('click', e=>{e.stopPropagation();setPanelOpen(panel.classList.contains('is-collapsed'));});
setPanelOpen(false);
function refreshPanelSummary() {
  const sceneName = document.querySelector('#scene-current')?.textContent || 'Wohnzimmer';
  const viewName = document.querySelector('#view-current')?.textContent || 'Normal';
  document.querySelector('#panel-summary').textContent = `${sceneName} · ${viewName}`;
}
// Opening an accordion section closes the other sections, not the whole dock.
const menus=[...document.querySelectorAll('#panel-inner details.control-menu')];
for (const menu of menus) {
  menu.addEventListener('toggle',()=>{
    if(menu.open)for(const other of menus)if(other!==menu)other.open=false;
  });
}

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
// Verschiebt nur die 3D-Gruppe, nicht Kamera oder WebXR-Tischanker.
installModelHeight({root:contentRoot,mount:'#menu-transform .menu-content'});
installDemoNavigation({homeHref:'../'});
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
// Thermal view: qualitative MECHANISM diagrams, not measurements/thermography.
// Do not imply measured °C values or that an IR camera directly images hot air.
const THERMAL_SCENES = {
  room: { note:'Ausgangszustand: keine lokale Erwärmung dargestellt.' },
  fire: { note:'Brandentstehung: lokaler Wärmeeintrag an der Steckdosenleiste. Der Raum bleibt zunächst überwiegend kühl.' },
  radiation: { note:'Radiation: Wärme wird durch Strahlung an direkt bestrahlte nahe Oberflächen übertragen. Die Erwärmung ist lokal, nicht am gesamten Sofa.' },
  convection: { note:'Convection: aufsteigende Heißgase erwärmen den Bereich über der Quelle und benachbarte obere Flächen. Die farbige Luftfahne ist schematisch und keine Thermografie.' },
  conduction: { note:'Conduction: Wärme breitet sich IM FESTEN Material der Steckdosenleiste vom heißen Bereich zu benachbarten Abschnitten aus; andere Möbel werden dadurch nicht direkt erhitzt.' }
};
let currentView='normal';
let thermalState='room';
const thermalOverlay=new THREE.Group();
contentRoot.add(thermalOverlay);
const palette={
  cold:'#202263', cool:'#2151a0', mild:'#278f95', warm:'#efbb37',
  hot:'#f36a25', extreme:'#fff2c9'
};
const THERMAL_MATERIALS=Object.fromEntries(Object.entries(palette).map(([k,v])=>
  [k,new THREE.MeshBasicMaterial({color:v,side:THREE.DoubleSide})]));
const roleByIndex=['floor','wall','wall','sofa','sofa','sofa','sofa',
  'carpet','table','table','table','table','table','cabinet','strip',
  'strip','strip','strip','window','curtain','curtain'];
function markProceduralRoom(){
  roomRoot.children.forEach((child,i)=>{if(child.isMesh)child.userData.thermalRole=roleByIndex[i]||'other';});
}
markProceduralRoom();

// 3D labels name thermal regions; invented absolute temperatures are deliberately avoided.
function makeThermalLabel(){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false}));
  sprite.scale.set(0.21,0.052,1);
  thermalOverlay.add(sprite);
  return {canvas,texture,sprite};
}
const thermalLabels={source:makeThermalLabel(),air:makeThermalLabel(),surface:makeThermalLabel()};
thermalLabels.source.sprite.position.set(0.19,0.105,-0.165);
thermalLabels.air.sprite.position.set(0.07,0.275,-0.035);
thermalLabels.surface.sprite.position.set(0.035,0.10,-0.08);
function drawLabel(label,text){
  const ctx=label.canvas.getContext('2d');ctx.clearRect(0,0,512,128);
  ctx.fillStyle='rgba(10,18,46,0.90)';
  ctx.beginPath();ctx.roundRect(4,10,504,105,22);ctx.fill();
  ctx.strokeStyle='#93e7ff';ctx.lineWidth=3;ctx.stroke();
  ctx.font='600 39px system-ui, sans-serif';ctx.fillStyle='#fff';
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,64,475);
  label.texture.needsUpdate=true;
}
const heatPlume=new THREE.Mesh(
  new THREE.ConeGeometry(0.085,0.24,28,1,true),
  new THREE.MeshBasicMaterial({color:'#f9ab31',transparent:true,opacity:0.2,
    depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending})
);
// Larger at the top, narrowing down towards the hot power strip.
heatPlume.rotation.z=Math.PI; heatPlume.position.set(SOURCE.x,0.167,SOURCE.z);
thermalOverlay.add(heatPlume);
const upperWallHeat=new THREE.Mesh(
  new THREE.PlaneGeometry(0.18,0.064),
  new THREE.MeshBasicMaterial({color:'#f3a039',transparent:true,opacity:0.36,
    depthWrite:false,side:THREE.DoubleSide})
);
// Rear wall near the upper end of the hot-gas plume, NOT the whole room.
upperWallHeat.position.set(0.205,0.243,-0.235);
thermalOverlay.add(upperWallHeat);
const sourceSpot=new THREE.Mesh(
  new THREE.SphereGeometry(0.026,16,12),
  new THREE.MeshBasicMaterial({color:'#fff2c9',transparent:true,opacity:0.86,depthWrite:false})
);
sourceSpot.position.copy(SOURCE); thermalOverlay.add(sourceSpot);
// Radiation: localized heated floor patch close to the electrical source.
// A whole sofa turning uniformly orange would not be a defensible heatmap.
const radiationPatch=new THREE.Mesh(
  new THREE.CircleGeometry(0.082,48),
  new THREE.MeshBasicMaterial({color:'#eeb23f',transparent:true,opacity:0.48,
    side:THREE.DoubleSide,depthWrite:false})
);
radiationPatch.rotation.x=-Math.PI/2;
radiationPatch.position.set(0.142,0.014,-0.155);
thermalOverlay.add(radiationPatch);
// Conduction: qualitative temperature gradient ALONG the solid power strip.
const conductionGradient=new THREE.Group();
for (let i=0;i<7;i++) {
  const level = Math.abs(i-3);
  const material = new THREE.MeshBasicMaterial({
    color: [0xffedac,0xf99138,0xe4a846,0x3f9ba4][level],
    transparent:true,opacity:0.9,depthWrite:false
  });
  const segment=new THREE.Mesh(new THREE.BoxGeometry(0.010,0.0026,0.028),material);
  segment.position.set(0.213+(i-3)*0.0105,0.034,-0.194);
  conductionGradient.add(segment);
}
thermalOverlay.add(conductionGradient);

function applyThermalMaterials(){
  // The fallback room's meshes have semantic roles. The optional external GLB
  // has no assured thermal mesh tags and therefore receives a neutral base color.
  roomRoot.traverse(obj=>{
    if(!obj.isMesh)return;
    if(!obj.userData.normalMaterial)obj.userData.normalMaterial=obj.material;
    if(currentView!=='thermal'){
      obj.material=obj.userData.normalMaterial;
      return;
    }
    const role=obj.userData.thermalRole||'other';
    let level = role==='floor'?'cold':'cool';
    // Only the source component receives a noticeable localized temperature change.
    // Additional surfaces are shown through explicitly placed local overlays.
    if(role==='strip' && thermalState!=='room')level=
      thermalState==='conduction'?'mild':'hot';
    obj.material=THERMAL_MATERIALS[level];
  });
}
function updateThermalView(){
  const isThermal=currentView==='thermal';
  const t=THERMAL_SCENES[thermalState];
  thermalOverlay.visible=isThermal;
  heatPlume.visible=isThermal&&thermalState==='convection';
  upperWallHeat.visible=isThermal&&thermalState==='convection';
  radiationPatch.visible=isThermal&&thermalState==='radiation';
  conductionGradient.visible=isThermal&&thermalState==='conduction';
  sourceSpot.visible=isThermal&&thermalState!=='room';
  thermalLabels.source.sprite.visible=isThermal&&thermalState!=='room';
  thermalLabels.air.sprite.visible=isThermal&&thermalState==='convection';
  thermalLabels.surface.sprite.visible=isThermal&&thermalState==='radiation';
  drawLabel(thermalLabels.source,'Wärmequelle');
  drawLabel(thermalLabels.air,'Heißgasfahne');
  drawLabel(thermalLabels.surface,'Bestrahlte Fläche');
  document.querySelector('#thermal-info').hidden=!isThermal;
  document.querySelector('#thermal-explanation').textContent=t.note+
    ' Relative Falschfarben – keine gemessenen Temperaturen, keine echte Wärmebildkamera.';
  applyThermalMaterials();
}
function setView(view){
  currentView=view==='thermal'?'thermal':'normal';
  for(const [id,v] of [['view-normal','normal'],['view-thermal','thermal']]){
    const btn=document.getElementById(id);
    btn.classList.toggle('active',currentView===v);
    btn.setAttribute('aria-pressed',String(currentView===v));
  }
  updateThermalView();
  document.querySelector('#view-current').textContent=currentView==='thermal'?'Thermal':'Normal';
  refreshPanelSummary();
}
document.querySelector('#view-normal').addEventListener('click',()=>setView('normal'));
document.querySelector('#view-thermal').addEventListener('click',()=>setView('thermal'));
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

// One finger rotates (in 3D preview OrbitControls already does this);
// two fingers pinch the MODEL, not the AR placement root/camera.
// In WebXR this goes through an interactive DOM overlay after placement.
const touchDistance=(a,b)=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
function bindModelGestures(surface, immersive=false) {
  let startDistance=0, startScale=1, lastX=null;
  surface.addEventListener('touchstart', e=>{
    if(immersive && (!renderer.xr.isPresenting || !placed))return;
    if(e.touches.length===2){
      startDistance=touchDistance(e.touches[0],e.touches[1]);
      startScale=scaleValue;
      lastX=null;
      if(!immersive)orbit.enabled=false; // don't zoom camera and model at once
      e.preventDefault();
    } else if(e.touches.length===1) {
      lastX=e.touches[0].clientX;
    }
  },{passive:false});
  surface.addEventListener('touchmove',e=>{
    if(immersive && (!renderer.xr.isPresenting || !placed))return;
    if(e.touches.length===2){
      if(startDistance<=0){startDistance=touchDistance(e.touches[0],e.touches[1]);startScale=scaleValue;}
      e.preventDefault();
      setModelScale(startScale*touchDistance(e.touches[0],e.touches[1])/startDistance);
    } else if(immersive && e.touches.length===1 && lastX!==null) {
      e.preventDefault();
      const x=e.touches[0].clientX;
      setModelRotation(THREE.MathUtils.euclideanModulo(modelRotationDegrees+(x-lastX)*0.65,360));
      lastX=x;
    }
  },{passive:false});
  const end=e=>{
    if(e.touches.length<2){
      startDistance=0;
      if(!immersive&&!renderer.xr.isPresenting)orbit.enabled=true;
    }
    lastX=e.touches.length===1?e.touches[0].clientX:null;
  };
  surface.addEventListener('touchend',end,{passive:true});
  surface.addEventListener('touchcancel',end,{passive:true});
}
bindModelGestures(renderer.domElement);
bindModelGestures(UI.gestureSurface,true);

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
  thermalState=state;
  updateThermalView(); // Thermal is optional; effect visibility remains unchanged
  UI.title.textContent=states[state].label;
  document.querySelector('#scene-current').textContent=states[state].label;
  refreshPanelSummary();
  UI.description.textContent=states[state].description;
  UI.feedback.hidden=false;
  for(const btn of UI.buttons.children)btn.classList.toggle('active',btn.dataset.mode===state);
}
setState('room');
UI.feedback.hidden=true; // Initial UI stays compact until a scene is selected.
document.querySelector('#close-description').addEventListener('click', e=>{e.stopPropagation();UI.feedback.hidden=true;});

document.querySelector('#reset').addEventListener('click',e=>{
  e.stopPropagation();setState('room');UI.feedback.hidden=true;setView('normal');setModelScale(1);setModelRotation(0);
  if(renderer.xr.isPresenting){ resetPlacement(); }
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
    updateThermalView();
    setStatus('Meshy-Wohnzimmer geladen');
  },undefined,error=>console.warn('GLB konnte nicht geladen werden',error));
}).catch(()=>{});

// WebXR table placement via hit-test; AR stays optional so desktop preview works.
const reticle=new THREE.Mesh(
  new THREE.RingGeometry(0.065,0.085,40).rotateX(-Math.PI/2),
  new THREE.MeshBasicMaterial({color:'#21ff8a',side:THREE.DoubleSide,depthTest:false,depthWrite:false})
);
reticle.matrixAutoUpdate=false;reticle.visible=false;reticle.renderOrder=999;scene.add(reticle);
let placed=false;
let lastHitResult=null;
let hitTestSource=null;
const placeNowButton=document.getElementById('place-now');
const placeAgainButton=document.getElementById('place-again');
function showPlacementControls(){
  const inAR=renderer.xr.isPresenting;
  placeNowButton.hidden=!inAR || placed || !reticle.visible;
  placeAgainButton.hidden=!inAR || !placed;
}
function resetPlacement(){
  placed=false;
  document.body.classList.remove('xr-placed');
  reticle.visible=false;
  placementRoot.visible=false;
  showPlacementControls();
  setStatus('AR aktiv · Tisch langsam abscannen, bis der grüne Kreis erscheint');
}

let requestingHitTest=false;
const xrController=renderer.xr.getController(0);
scene.add(xrController);
function place(){
  if(!renderer.xr.isPresenting || placed || !reticle.visible)return;
  placementRoot.position.setFromMatrixPosition(reticle.matrix);
  placementRoot.quaternion.setFromRotationMatrix(reticle.matrix);
  placementRoot.visible=true;
  placed=true;reticle.visible=false;
  document.body.classList.add('xr-placed');
  setStatus('Wohnzimmer fixiert · Handy bewegen, um es von allen Seiten anzusehen');
  showPlacementControls();
  UI.hint.textContent='Modell mit einem Finger drehen, mit zwei Fingern vergrößern/verkleinern. Effekt wechseln oder neu platzieren.';
}
xrController.addEventListener('select',place);
placeNowButton.addEventListener('click',e=>{e.stopPropagation();place();});
placeAgainButton.addEventListener('click',e=>{e.stopPropagation();resetPlacement();});
// Prevent UI button presses from triggering placement in immersive AR.
UI.overlay.addEventListener('beforexrselect',e=>{
  if(e.target.closest('button, .panel, #ar-launch, #ar-place-actions'))e.preventDefault();
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
  document.body.classList.remove('xr-placed');
  showPlacementControls();
  const session=renderer.xr.getSession();
  if(!session?.domOverlayState){
    setStatus('DOM Overlay nicht verfügbar – Buttons eventuell nicht im AR-Modus sichtbar');
  }else setStatus('Tisch suchen und antippen');
});
renderer.xr.addEventListener('sessionend',()=>{
  hitTestSource?.cancel();hitTestSource=null;requestingHitTest=false;
  document.body.classList.remove('in-xr','xr-placed');
  placementRoot.visible=true;placed=false;reticle.visible=false;orbit.enabled=true;
  showPlacementControls();
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
  const heatIntensity=currentState==='room'?0:(currentState==='fire'?0.5:0.8);
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
    showPlacementControls();
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
