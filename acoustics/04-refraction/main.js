import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * RIPLEY — ACOUSTICS 04 / Refraction & Fire Plume.
 * Educational ray tracing in a 2-D temperature field (geometrical acoustics,
 * idealized air); glowing pulses are intentionally slowed for readability.
 * This is NOT a CFD simulation, wave-field solver, or validated fire detector.
 * Distance, temperature field and phase figures are hypothetical examples.
 */
const $ = (selector) => document.querySelector(selector);
$('#app').innerHTML = `
<div id="stage"></div>
<div id="overlay">
  <header class="topbar">
    <div class="brand"><strong>RIPLEY</strong><small>ACOUSTICS 04 · REFRACTION & FIRE</small></div>
    <div class="status" id="status" role="status" aria-live="polite">3D-Vorschau bereit</div>
  </header>
  <div class="scene-label" id="scene-label">TEMPERATURGRADIENT · SCHALLBRECHUNG</div>
  <div class="spacer"></div>
  <div id="menu-toggle-row"><button id="panel-toggle" type="button" aria-expanded="true" aria-controls="controls-panel">⌄ Menü ausblenden</button></div>
  <section id="controls-panel" aria-label="Akustik 4 Steuerung">
    <details class="control-menu" open>
      <summary><span>〰 Thema</span><span class="menu-current" id="mode-current">Temperaturgradient</span><span class="arrow">⌄</span></summary>
      <div class="menu-body">
        <div class="buttons">
          <button type="button" data-mode="gradient">01 · Bodenprofil</button>
          <button type="button" data-mode="plume">02 · Fire Plume</button>
          <button type="button" data-mode="detection">03 · Active Detection</button>
        </div>
        <p class="caption">Die Wellenwege werden als gekrümmte, animierte Strahlen durch das Temperaturfeld dargestellt.</p>
      </div>
    </details>
    <details class="control-menu">
      <summary><span>♨ Temperatur & Signal</span><span class="menu-current" id="profile-current">Boden warm</span><span class="arrow">⌄</span></summary>
      <div class="menu-body">
        <div id="profile-buttons" class="buttons two">
          <button type="button" id="profile-left">Boden warm</button>
          <button type="button" id="profile-right">Boden kalt</button>
        </div>
        <div class="field">
          <label for="delta">Temperaturdifferenz <strong id="delta-value">55 °C</strong></label>
          <input id="delta" type="range" min="0" max="80" step="5" value="55" />
          <p class="caption" id="temp-help">Idealisierte vertikale Lufttemperaturverteilung über dem Boden.</p>
        </div>
        <div class="field" id="frequency-field" hidden>
          <label for="frequency">Prüffrequenz <strong id="frequency-value">1.000 Hz</strong></label>
          <input id="frequency" type="range" min="0" max="2" step="1" value="1" />
          <p class="caption">Für die dargestellte Phasenverschiebung; die geometrischen Schallwege hängen hier nicht von der Frequenz ab.</p>
        </div>
        <div class="thermal-bar" aria-hidden="true"></div>
        <div class="thermal-scale"><span>kühl</span><strong>schematisches Temperaturfeld</strong><span>heiß</span></div>
      </div>
    </details>
    <details class="control-menu">
      <summary><span>⤢ Modell & Animation</span><span class="menu-current" id="model-current">100 % · 0°</span><span class="arrow">⌄</span></summary>
      <div class="menu-body">
        <div class="buttons two">
          <button type="button" id="pause">Ⅱ Pause</button>
          <button type="button" id="slow">◷ Zeitlupe</button>
        </div>
        <div class="field">
          <label for="size">Modellgröße <strong id="size-value">100 %</strong></label>
          <input id="size" type="range" min="30" max="200" step="5" value="100" />
        </div>
        <div class="field">
          <label for="rotation">Modell drehen <strong id="rotation-value">0°</strong></label>
          <input id="rotation" type="range" min="0" max="360" step="5" value="0" />
        </div>
      </div>
    </details>
    <div class="metrics">
      <div class="metric"><small>Schallgeschw. an Quelle</small><strong id="metric-speed">343 m/s</strong></div>
      <div class="metric"><small>Laufzeit (9 m)</small><strong id="metric-time">26,2 ms</strong></div>
      <div class="metric"><small>Änderung Δt</small><strong id="metric-delay">–</strong></div>
    </div>
    <div id="measurement" hidden>
      <div class="metrics">
        <div class="metric"><small>Referenz</small><strong id="reference-time">26,2 ms</strong></div>
        <div class="metric"><small>Mit heißer Zone</small><strong id="heated-time">–</strong></div>
        <div class="metric"><small>Δφ bei Frequenz</small><strong id="phase-value">–</strong></div>
      </div>
      <canvas class="signal-plot" id="wave-chart" width="720" height="168" aria-label="Schematischer Vergleich der Empfangssignale"></canvas>
      <div class="signal-key" id="chart-legend"><span><i class="ref"></i>Referenzsignal</span><span><i class="fire"></i>erwärmtes Medium</span></div>
    </div>
    <div class="info-box" id="info-box">
      <button type="button" id="hide-info" aria-label="Beschreibung schließen">×</button>
      <strong id="info-title">Temperaturgradient</strong>
      <div id="info-text"></div>
    </div>
    <div class="actions"><button id="show-info" type="button" hidden>ⓘ Erklärung</button><button id="reset" type="button">↺ Reset</button></div>
    <p class="disclaimer">Didaktisches 2-D-Strahlenmodell in idealisierter Luft. Temperaturverteilung, Weggeometrie und Impulsanimation sind keine Messergebnisse. Keine vollständige Akustik- oder Brandströmungssimulation.</p>
  </section>
  <div id="ar-place-actions">
    <button type="button" id="place-now" hidden>◎ Modell hier platzieren</button>
    <button type="button" id="place-again" hidden>↺ Neu platzieren</button>
  </div>
  <div id="ar-launch"></div>
</div>
<a id="home-link" href="../">← Akustik-Menü</a>`;

// ---- UI + state ----
const MODES = {
  gradient: {
    name: 'Temperaturgradient',
    title: 'Schallbrechung in unterschiedlich warmer Luft',
    description: 'Wie in Abbildung 9 deiner Arbeit: Warme Luft am Boden erhöht dort die Schallgeschwindigkeit und kann Schallwege nach oben krümmen. Bei kalter Luft am Boden ist die Krümmung umgekehrt. Die Farbe beschreibt das idealisierte Lufttemperaturfeld.'
  },
  plume: {
    name: 'Fire Plume',
    title: 'Schallweg durch einen heißen Fire Plume',
    description: 'Über dem Feuer steigt erwärmtes Gas auf. Das lokale Temperaturfeld kann die Schallgeschwindigkeit und dadurch Ausbreitungsweg und Laufzeit verändern. Ein Fire Plume ist turbulent und instationär; hier verwenden wir ein stationäres, vereinfachtes Temperaturprofil.'
  },
  detection: {
    name: 'Active Detection',
    title: 'Referenzsignal und Schallausbreitung bei Feuer',
    description: 'Ein unverändertes Signal wird von einem Lautsprecher zum Mikrofon übertragen. Durch die heiße Zone kann die Laufzeit leicht anders sein. Die daraus berechnete Phasenänderung ist ein Beispiel für den Zusammenhang zu aktiver akustischer Branddetektion – kein Nachweis automatischer Feuererkennung.'
  }
};
const S = {
  mode: 'gradient', ground: 'warm', fireOn: true,
  delta: 55, freqIndex: 1, scale: 100, angle: 0,
  paused: false, slow: false, elapsed: 0
};
const FREQUENCIES = [500, 1000, 2000];
const fmt = (x, digits = 1) => x.toLocaleString('de-DE', {maximumFractionDigits: digits, minimumFractionDigits: digits});
const setStatus = text => $('#status').textContent = text;
const panel = $('#controls-panel');
const panelToggle = $('#panel-toggle');
function setPanel(open) {
  panel.hidden = !open;
  panelToggle.textContent = open ? '⌄ Menü ausblenden' : '☰ Menü öffnen';
  panelToggle.setAttribute('aria-expanded', String(open));
}
panelToggle.addEventListener('click', event => {event.stopPropagation(); setPanel(panel.hidden);});
setPanel(!matchMedia('(max-width:760px), (max-height:540px)').matches);
for (const detail of document.querySelectorAll('.control-menu')) {
  detail.addEventListener('toggle', () => {
    if (!detail.open) return;
    for (const other of document.querySelectorAll('.control-menu')) if (other !== detail) other.open = false;
  });
}
$('#overlay').addEventListener('beforexrselect', event => {
  if (event.target.closest('button, summary, input, #controls-panel, #ar-launch')) event.preventDefault();
});

// ---- Math: geometrical-acoustics ray model ----
// Physical illustration domain (metres), represented by the AR model in miniature.
const X_MIN = -4.5, X_MAX = 4.5, HEIGHT = 3.4, EMITTER_HEIGHT = 1.55;
const X_WORLD = x => x * (1.48 / 9);
const Y_WORLD = y => .058 + y * (.66 / HEIGHT);
const SPEED = T => 331.3 * Math.sqrt((T + 273.15) / 273.15); // ideal gas, approximate dry air
function airTemperature(x, y, mode = S.mode, ground = S.ground, delta = S.delta, heat = S.fireOn) {
  if (mode === 'gradient') {
    // Warmer ground: T decreases with height. Cold ground: T increases with height.
    const decay = Math.exp(-Math.max(0, y) / 1.18);
    return ground === 'warm' ? 16 + delta * decay : 16 + delta * (1 - decay);
  }
  if (!heat) return 20;
  const yy = Math.max(0, y);
  const width = .39 + .15 * yy;
  const center = .12 * Math.sin(.52 * yy);
  return 20 + delta * Math.exp(-.5 * ((x - center) / width) ** 2) * Math.exp(-.13 * yy);
}
function localSoundSpeed(x, y, medium) {return SPEED(airTemperature(x, y, medium.mode, medium.ground, medium.delta, medium.fireOn));}
function rayTrace(theta0, medium) {
  const N = 270, dx = (X_MAX-X_MIN)/N;
  let x=X_MIN, y=EMITTER_HEIGHT, theta=theta0, time=0;
  const pts=[{x,y}], gradStep=.035;
  for(let i=0;i<N;i++) {
    const c=localSoundSpeed(x,y,medium);
    const lnX=(Math.log(localSoundSpeed(x+gradStep,y,medium))-Math.log(localSoundSpeed(x-gradStep,y,medium)))/(2*gradStep);
    const lnY=(Math.log(localSoundSpeed(x,y+gradStep,medium))-Math.log(localSoundSpeed(x,y-gradStep,medium)))/(2*gradStep);
    // Small-angle ray equations, for paraxial propagation in a non-uniform medium:
    // dy/dx=tan(theta), dtheta/dx=tan(theta)*dln(c)/dx - dln(c)/dy.
    theta += (Math.tan(theta)*lnX-lnY)*dx;
    y += Math.tan(theta)*dx;
    time += dx / (Math.cos(theta) * c);
    x += dx;
    pts.push({x,y});
    if(y < .04 || y > HEIGHT+.02) break;
  }
  return {points:pts, y, time, reached: x >= X_MAX-0.01};
}
function aimRay(medium) {
  let lo=-.28,hi=.28,mid=0,result;
  for(let i=0;i<23;i++) {
    mid=(lo+hi)/2;
    result=rayTrace(mid,medium);
    if(result.y>EMITTER_HEIGHT) hi=mid; else lo=mid;
  }
  return {angle:mid,...result};
}

// ---- Three.js AR + 3D visualisation ----
const scene=new THREE.Scene();
const sceneBackground = new THREE.Color('#102237'); scene.background=sceneBackground;
scene.add(new THREE.HemisphereLight('#b8f8ff','#39475c',2.4));
const keyLight=new THREE.DirectionalLight('#ffffff',2.2);keyLight.position.set(.6,1.9,1.5);scene.add(keyLight);
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.01,30);
camera.position.set(1.20,.91,1.6);camera.lookAt(0,.34,0);
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
renderer.xr.enabled=true;renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
$('#stage').appendChild(renderer.domElement);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.target.set(0,.34,0);orbit.enableDamping=true;orbit.minDistance=.6;orbit.maxDistance=4;
const placementRoot=new THREE.Group();scene.add(placementRoot);
const modelRoot=new THREE.Group();placementRoot.add(modelRoot);
const staticGroup=new THREE.Group(),dynamicGroup=new THREE.Group(),pathsGroup=new THREE.Group(),plumeGroup=new THREE.Group();
modelRoot.add(staticGroup,dynamicGroup,pathsGroup,plumeGroup);
const mat=(c,opts={})=>new THREE.MeshStandardMaterial({color:c,roughness:.7,...opts});
const bright=(c,opacity=1)=>new THREE.MeshBasicMaterial({color:c,transparent:opacity<1,opacity,depthWrite:opacity===1,side:THREE.DoubleSide});
function box(group,scale,pos,material){const mesh=new THREE.Mesh(new THREE.BoxGeometry(...scale),material);mesh.position.set(...pos);group.add(mesh);return mesh;}
function clearGroup(group) {
  while(group.children.length){
    const object=group.children[0];group.remove(object);
    object.traverse(o=>{
      o.geometry?.dispose?.();
      const m=o.material;if(m)for(const material of (Array.isArray(m)?m:[m])){
        material.map?.dispose?.();material.dispose?.();
      }
    });
  }
}
function label(group,text,pos,width=.22,accent='#6dffcd') {
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=120;
  const c=canvas.getContext('2d');
  c.fillStyle='rgba(7,27,42,.91)';c.beginPath();c.roundRect(3,4,634,112,18);c.fill();
  c.strokeStyle=accent;c.lineWidth=3;c.stroke();
  c.textAlign='center';c.textBaseline='middle';c.font='700 35px system-ui';c.fillStyle='#eafffa';c.fillText(text,320,59,608);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false}));
  sprite.position.set(...pos);sprite.scale.set(width,width*.1875,1);group.add(sprite);return sprite;
}
// Raised, gridded experiment plate: physical size approx 1.7 x .60 metres in the scene.
box(staticGroup,[1.72,.024,.62],[0,.015,0],mat('#13364b',{metalness:.32}));
box(staticGroup,[1.67,.004,.57],[0,.029,0],bright('#1d5770',.55));
for(let i=0;i<=10;i++) {
  const xx=-.77+i*.154;
  const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(xx,.035,-.275),new THREE.Vector3(xx,.035,.275)]);
  staticGroup.add(new THREE.Line(geo,new THREE.LineBasicMaterial({color:'#3b8294',transparent:true,opacity:.20})));
}
for(let i=0;i<=5;i++) {
  const zz=-.25+i*.10;
  const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.8,.035,zz),new THREE.Vector3(.8,.035,zz)]);
  staticGroup.add(new THREE.Line(geo,new THREE.LineBasicMaterial({color:'#3b8294',transparent:true,opacity:.20})));
}
// Vertical transparent thermal plane behind the sound rays.
const thermalVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const thermalFragment=`
precision highp float;
varying vec2 vUv;
uniform float uTime,uDelta,uFire;
uniform int uMode,uCold;
vec3 heatColor(float t){
  vec3 col=vec3(.055,.125,.41);
  col=mix(col,vec3(.12,.50,.83),smoothstep(10.,35.,t));
  col=mix(col,vec3(.12,.79,.70),smoothstep(31.,55.,t));
  col=mix(col,vec3(.69,.88,.37),smoothstep(54.,83.,t));
  col=mix(col,vec3(1.,.75,.20),smoothstep(80.,115.,t));
  col=mix(col,vec3(1.,.29,.16),smoothstep(112.,170.,t));
  col=mix(col,vec3(1.,.94,.72),smoothstep(170.,255.,t));
  return col;
}
void main(){
  float x=(vUv.x-.5)*9.;
  float y=vUv.y*3.4;
  float T=20.;
  if(uMode==0){
    float decay=exp(-y/1.18);
    T=(uCold==1)?(16.+uDelta*(1.-decay)):(16.+uDelta*decay);
  }else if(uFire>.5){
    float width=.39+.15*y;
    float center=.12*sin(.52*y)+.065*sin(6.*y-uTime*.35);
    T=20.+uDelta*exp(-.5*pow((x-center)/width,2.))*exp(-.13*y);
  }
  float thermal=clamp((T-15.)/190.,0.,1.);
  vec3 color=heatColor(T);
  float xfade=smoothstep(0.,.09,vUv.x)*smoothstep(0.,.09,1.-vUv.x);
  float yfade=smoothstep(0.,.06,vUv.y)*smoothstep(0.,.06,1.-vUv.y);
  float plumeMask=exp(-pow(x/(.48+.19*y),2.));
  float alpha=(uMode==0)?(.18+.24*clamp((T-10.)/75.,0.,1.)):(.09+uFire*(.52*plumeMask)*thermal);
  gl_FragColor=vec4(color,alpha*xfade*yfade);
}`;
const heatUniforms={uTime:{value:0},uDelta:{value:55},uFire:{value:1},uMode:{value:0},uCold:{value:0}};
const thermalSheet=new THREE.Mesh(new THREE.PlaneGeometry(1.48,.66),new THREE.ShaderMaterial({uniforms:heatUniforms,vertexShader:thermalVertex,fragmentShader:thermalFragment,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
thermalSheet.position.set(0,.388,-.135);thermalSheet.renderOrder=1;staticGroup.add(thermalSheet);

// Linear source/receiver, suspended on rods at the same elevation.
function makeTransducer(x,isMic=false){
  box(staticGroup,[.085,.12,.12],[x,Y_WORLD(EMITTER_HEIGHT),.03],mat(isMic?'#91bacd':'#315a73',{metalness:.55}));
  const cyl=new THREE.Mesh(new THREE.CylinderGeometry(.047,.048,.014,28),mat(isMic?'#8df8da':'#55cbe8',{metalness:.40,emissive:isMic?'#0d5540':'#0a4260',emissiveIntensity:.7}));
  cyl.rotation.z=Math.PI/2;cyl.position.set(x+(isMic?-.05:.05),Y_WORLD(EMITTER_HEIGHT),.03);staticGroup.add(cyl);
  box(staticGroup,[.010,Y_WORLD(EMITTER_HEIGHT)-.038,.013],[x,(Y_WORLD(EMITTER_HEIGHT)+.04)/2,.03],mat('#7596a6',{metalness:.6}));
  box(staticGroup,[.12,.012,.09],[x,.044,.03],mat('#516e82',{metalness:.4}));
  label(staticGroup,isMic?'MIKROFON':'LAUTSPRECHER',[x,.77,.015],isMic?.19:.24,isMic?'#8df8ca':'#6dd4ff');
}
makeTransducer(X_WORLD(X_MIN),false);makeTransducer(X_WORLD(X_MAX),true);
label(staticGroup,'9 m · Modellstrecke',[0,.092,.25],.29,'#94c8d9');
const halo=new THREE.Mesh(new THREE.TorusGeometry(.045,.0035,8,48),bright('#70e7ff',.72));
halo.rotation.y=Math.PI/2;halo.position.set(X_WORLD(X_MIN)+.05,Y_WORLD(EMITTER_HEIGHT),.03);staticGroup.add(halo);

// Animated volume particle cloud for the hot plume.
const PARTICLES=155;
const plumePos=new Float32Array(PARTICLES*3),plumeColors=new Float32Array(PARTICLES*3);
const plumeBase=Array.from({length:PARTICLES},(_,i)=>({height:(i*.61803398875)%1,seed:(i*2.399963)%6.28,spread:(i*.7548776)%1}));
for(let i=0;i<PARTICLES;i++){
  const cold=new THREE.Color(i%3===0?'#ffe789':i%3===1?'#ff9139':'#ff4e59');
  plumeColors.set([cold.r,cold.g,cold.b],i*3);
}
const particleGeo=new THREE.BufferGeometry();
particleGeo.setAttribute('position',new THREE.BufferAttribute(plumePos,3));
particleGeo.setAttribute('color',new THREE.BufferAttribute(plumeColors,3));
const plumePoints=new THREE.Points(particleGeo,new THREE.PointsMaterial({size:.022,vertexColors:true,transparent:true,opacity:.72,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true}));
plumeGroup.add(plumePoints);
function animatePlume(t){
  const isActive=S.mode!=='gradient'&&S.fireOn;
  plumeGroup.visible=isActive;
  if(!isActive)return;
  for(let i=0;i<PARTICLES;i++){
    const p=plumeBase[i];const phase=(p.height+t*.15)%1;
    const xx=.028*Math.sin(p.seed+phase*11)+(.020+phase*.12)*Math.sin(p.seed*2.1+phase*8)*(.45+p.spread);
    plumePos[i*3]=xx;
    plumePos[i*3+1]=.09+phase*.56;
    plumePos[i*3+2]=-.055+.085*Math.cos(p.seed*2+phase*3)*(.4+phase*.6);
  }
  particleGeo.attributes.position.needsUpdate=true;
}

const rayTracks=[];
const wavefronts=[];
function pathFromTrace(trace){return trace.points.map(p=>new THREE.Vector3(X_WORLD(p.x),Y_WORLD(p.y),.002));}
function addRay(trace,color,opts={}){
  if(trace.points.length<2)return;
  const points=pathFromTrace(trace);
  const curve=new THREE.CatmullRomCurve3(points,false,'centripetal');
  if(opts.dashed){
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineDashedMaterial({color,dashSize:.023,gapSize:.015,transparent:true,opacity:.80,depthTest:false}));
    line.computeLineDistances();pathsGroup.add(line);
  }else{
    const tube=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.min(230,trace.points.length),.0048,6,false),bright(color,.96));
    tube.renderOrder=3;pathsGroup.add(tube);
    const glowTube=new THREE.Mesh(new THREE.TubeGeometry(curve,90,.011,5,false),bright(color,.12));
    glowTube.renderOrder=2;pathsGroup.add(glowTube);
  }
  if(opts.pulses!==false){
    const beads=[];
    for(let i=0;i<(opts.count||5);i++){
      const bead=new THREE.Mesh(new THREE.SphereGeometry(.014,12,9),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.96,depthTest:false}));
      bead.renderOrder=5;pathsGroup.add(bead);beads.push(bead);
    }
    rayTracks.push({curve,beads,phase:opts.phase||0,rate:opts.rate||.16});
  }
}
function indicator(text,x,y,color){label(dynamicGroup,text,[x,y,.12],.17,color);}
function updateThermal(){
  heatUniforms.uMode.value=S.mode==='gradient'?0:S.mode==='plume'?1:2;
  heatUniforms.uDelta.value=S.delta;
  heatUniforms.uCold.value=S.ground==='cold'?1:0;
  heatUniforms.uFire.value=S.fireOn?1:0;
}
let baseTime=0, hotTime=0;
function buildRays() {
  clearGroup(pathsGroup);clearGroup(dynamicGroup);rayTracks.length=0;wavefronts.length=0;
  updateThermal();
  const environment={mode:S.mode,ground:S.ground,delta:S.delta,fireOn:S.fireOn};
  const normal={mode:'plume',ground:'warm',delta:0,fireOn:false};
  const straight=aimRay(normal);
  const heated=aimRay(environment);
  baseTime=straight.time;
  hotTime=heated.time;
  if(S.mode==='detection') {
    addRay(straight,'#70dfff',{dashed:true,count:4,rate:.12});
    if(S.fireOn){
      addRay(heated,'#ffb15c',{count:5,rate:.14});
      indicator('REFERENZ',-.42,.12,'#70dfff');
      indicator('MIT FEUER',.24,.14,'#ffb15c');
    }else indicator('REFERENZ',0,.14,'#70dfff');
  }else {
    const aimed=aimRay(environment);
    // Offset rays demonstrate a directional wave fan: no claiming they all hit the microphone.
    for(const [i,delta] of [-.050,-.025,0,.025,.050].entries()) {
      const traced=rayTrace(aimed.angle+delta,environment);
      addRay(traced,i===2?'#e9fff2':(S.mode==='gradient'?'#71d8ff':'#ffd889'),{count:4,rate:.13,phase:0});
    }
    // A set of coordinated bright strips connects equal animation phases
    // across the ray fan: a visible schematic travelling wavefront.
    for(let j=0;j<4;j++){
      const coordinates=new Float32Array(rayTracks.length*3);
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.BufferAttribute(coordinates,3));
      const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({
        color:S.mode==='gradient'?'#b4f9ff':'#ffe9aa',transparent:true,opacity:.78,depthTest:false
      }));
      line.renderOrder=5;pathsGroup.add(line);
      wavefronts.push({line,index:j});
    }
    indicator(S.mode==='gradient'?(S.ground==='warm'?'BODEN WARM':'BODEN KALT'):(S.fireOn?'HEISSER GASSTROM':'NORMALE LUFT'),0,.14,S.mode==='gradient'?'#71d8ff':'#ffcb87');
  }
  const sourceTemp=airTemperature(X_MIN,EMITTER_HEIGHT);
  $('#metric-speed').textContent=`${fmt(SPEED(sourceTemp))} m/s`;
  $('#metric-time').textContent=`${fmt(hotTime*1000,2)} ms`;
  $('#metric-delay').textContent=`${S.fireOn||S.mode==='gradient'?(hotTime-baseTime>=0?'+':'')+fmt((hotTime-baseTime)*1000,2)+' ms':'0,00 ms'}`;
  $('#reference-time').textContent=`${fmt(baseTime*1000,2)} ms`;
  $('#heated-time').textContent=`${fmt(hotTime*1000,2)} ms`;
  const phase=-(hotTime-baseTime)*FREQUENCIES[S.freqIndex]*360;
  $('#phase-value').textContent=`${fmt(phase,0)}°`;
  $('#measurement').hidden=S.mode!=='detection';
}
function renderChart(){
  if(S.mode!=='detection')return;
  const canvas=$('#wave-chart'),ctx=canvas.getContext('2d');
  const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
  ctx.strokeStyle='#375365';ctx.lineWidth=1;
  for(let j=1;j<4;j++){let yy=j*h/4;ctx.beginPath();ctx.moveTo(0,yy);ctx.lineTo(w,yy);ctx.stroke();}
  const phase=-(hotTime-baseTime)*FREQUENCIES[S.freqIndex]*2*Math.PI;
  for(const [color,shift] of [['#70dfff',0],['#ffad62',S.fireOn?phase:0]]){
    if(color==='#ffad62'&&!S.fireOn)continue;
    ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();
    for(let i=0;i<w;i+=2){const v=Math.sin(i/w*2*Math.PI*4+shift);const y=h/2-50*v;if(i===0)ctx.moveTo(i,y);else ctx.lineTo(i,y);}
    ctx.stroke();
  }
}
function syncControls(){
  $('#mode-current').textContent=MODES[S.mode].name;
  $('#scene-label').textContent=S.mode==='gradient'?'TEMPERATURGRADIENT · SCHALLBRECHUNG':S.mode==='plume'?'FIRE PLUME · GEKRÜMMTE SCHALLWEGE':'ACTIVE DETECTION · REFERENZ VS. FEUER';
  $('#info-title').textContent=MODES[S.mode].title;
  $('#info-text').textContent=MODES[S.mode].description;
  $('#frequency-field').hidden=S.mode!=='detection';
  $('#profile-left').textContent=S.mode==='gradient'?'Boden warm':'Normal';
  $('#profile-right').textContent=S.mode==='gradient'?'Boden kalt':'Fire Plume';
  $('#profile-current').textContent=S.mode==='gradient'?(S.ground==='warm'?'Boden warm':'Boden kalt'):(S.fireOn?'Fire Plume':'Normale Luft');
  $('#profile-left').classList.toggle('active',S.mode==='gradient'?S.ground==='warm':!S.fireOn);
  $('#profile-right').classList.toggle('active',S.mode==='gradient'?S.ground==='cold':S.fireOn);
  $('#delta').max=S.mode==='gradient'?80:250;
  $('#delta').value=S.delta;
  $('#delta-value').textContent=`${S.delta} °C`;
  $('#temp-help').textContent=S.mode==='gradient'?'Vertikaler Temperaturunterschied im vereinfachten Luftprofil.':
    'Schematische Erwärmung in der Plume-Mitte über 20 °C Umgebungsluft.';
  $('#frequency').value=S.freqIndex;
  $('#frequency-value').textContent=`${FREQUENCIES[S.freqIndex].toLocaleString('de-DE')} Hz`;
  $('#size').value=S.scale;$('#rotation').value=S.angle;
  $('#size-value').textContent=`${S.scale} %`;
  $('#rotation-value').textContent=`${S.angle}°`;
  $('#model-current').textContent=`${S.scale} % · ${S.angle}°`;
  $('#pause').textContent=S.paused?'▶ Fortsetzen':'Ⅱ Pause';
  $('#slow').classList.toggle('active',S.slow);
  for(const btn of document.querySelectorAll('[data-mode]'))btn.classList.toggle('active',btn.dataset.mode===S.mode);
  modelRoot.scale.setScalar(.58*S.scale/100);
  modelRoot.rotation.y=S.angle*Math.PI/180;
  buildRays();renderChart();
}
for(const btn of document.querySelectorAll('[data-mode]'))btn.addEventListener('click',()=>{
  S.mode=btn.dataset.mode;
  S.delta=S.mode==='gradient'?55:160;
  S.fireOn=true;
  syncControls();
});
$('#profile-left').addEventListener('click',()=>{
  if(S.mode==='gradient')S.ground='warm';else S.fireOn=false;
  syncControls();
});
$('#profile-right').addEventListener('click',()=>{
  if(S.mode==='gradient')S.ground='cold';else S.fireOn=true;
  syncControls();
});
$('#delta').addEventListener('input',e=>{S.delta=Number(e.target.value);syncControls();});
$('#frequency').addEventListener('input',e=>{S.freqIndex=Number(e.target.value);syncControls();});
$('#size').addEventListener('input',e=>{S.scale=Number(e.target.value);syncControls();});
$('#rotation').addEventListener('input',e=>{S.angle=Number(e.target.value);syncControls();});
$('#pause').addEventListener('click',()=>{S.paused=!S.paused;syncControls();});
$('#slow').addEventListener('click',()=>{S.slow=!S.slow;syncControls();});
$('#hide-info').addEventListener('click',()=>{$('#info-box').hidden=true;$('#show-info').hidden=false;});
$('#show-info').addEventListener('click',()=>{$('#info-box').hidden=false;$('#show-info').hidden=true;});

// ---- WebXR placement: do not change placementRoot after it is placed ----
const reticle=new THREE.Mesh(new THREE.RingGeometry(.072,.092,48).rotateX(-Math.PI/2),
  new THREE.MeshBasicMaterial({color:'#71ffc0',side:THREE.DoubleSide,depthTest:false}));
reticle.matrixAutoUpdate=false;reticle.visible=false;scene.add(reticle);
let placed=false,hitTestSource=null,requestingHitTest=false;
const xrController=renderer.xr.getController(0);scene.add(xrController);
function updatePlaceUI(){
  const xr=renderer.xr.isPresenting;
  $('#place-now').hidden=!xr||placed||!reticle.visible;
  $('#place-again').hidden=!xr||!placed;
}
function resetPlacement(){
  placed=false;placementRoot.visible=false;reticle.visible=false;
  setStatus('Tisch anvisieren · grünen Kreis antippen');updatePlaceUI();
}
function place(){
  if(!renderer.xr.isPresenting||placed||!reticle.visible)return;
  placementRoot.position.setFromMatrixPosition(reticle.matrix);
  placementRoot.quaternion.setFromRotationMatrix(reticle.matrix);
  placementRoot.visible=true;placed=true;reticle.visible=false;
  setStatus('Akustik 4 platziert');updatePlaceUI();
}
xrController.addEventListener('select',place);
$('#place-now').addEventListener('click',e=>{e.stopPropagation();place();});
$('#place-again').addEventListener('click',e=>{e.stopPropagation();resetPlacement();});
const arButton=ARButton.createButton(renderer,{requiredFeatures:['hit-test'],optionalFeatures:['dom-overlay'],domOverlay:{root:$('#overlay')}});
$('#ar-launch').appendChild(arButton);
renderer.xr.addEventListener('sessionstart',()=>{
  document.body.classList.add('in-xr');scene.background=null;orbit.enabled=false;resetPlacement();
  if(!renderer.xr.getSession()?.domOverlayState)setStatus('AR aktiv · Bedienmenü ggf. nicht sichtbar (DOM Overlay fehlt)');
});
renderer.xr.addEventListener('sessionend',()=>{
  hitTestSource?.cancel();hitTestSource=null;requestingHitTest=false;
  document.body.classList.remove('in-xr');scene.background=sceneBackground;orbit.enabled=true;
  placementRoot.visible=true;placed=false;reticle.visible=false;
  placementRoot.position.set(0,0,0);placementRoot.quaternion.identity();
  updatePlaceUI();setStatus('3D-Vorschau bereit');
});
async function requestHitTest(session){
  if(hitTestSource||requestingHitTest)return;
  requestingHitTest=true;
  try{
    const viewer=await session.requestReferenceSpace('viewer');
    if(renderer.xr.getSession()!==session)return;
    const src=await session.requestHitTestSource({space:viewer});
    if(renderer.xr.getSession()===session)hitTestSource=src;else src.cancel();
  }catch(err){setStatus(`Tischerkennung nicht verfügbar: ${err.message}`);}
  finally{requestingHitTest=false;}
}
function reset(){
  Object.assign(S,{mode:'gradient',ground:'warm',fireOn:true,delta:55,freqIndex:1,scale:100,angle:0,paused:false,slow:false,elapsed:0});
  syncControls();
  if(renderer.xr.isPresenting)resetPlacement();
  else{placementRoot.position.set(0,0,0);placementRoot.quaternion.identity();setStatus('3D-Vorschau zurückgesetzt');}
}
$('#reset').addEventListener('click',reset);

// ---- Animation ----
const clock=new THREE.Clock();
renderer.setAnimationLoop((_,frame)=>{
  const dt=Math.min(clock.getDelta(),.055);
  if(!S.paused)S.elapsed+=dt*(S.slow?.27:1);
  heatUniforms.uTime.value=S.elapsed;
  halo.scale.setScalar(.86+Math.sin(S.elapsed*6)*.11);
  halo.material.opacity=.53+.24*Math.sin(S.elapsed*5)**2;
  animatePlume(S.elapsed);
  for(const track of rayTracks){
    for(let i=0;i<track.beads.length;i++){
      const u=(S.elapsed*track.rate+i/track.beads.length+track.phase)%1;
      track.beads[i].position.copy(track.curve.getPointAt(u));
      track.beads[i].material.opacity=.22+.78*Math.sin(Math.PI*u);
      track.beads[i].scale.setScalar(.8+.5*Math.sin(Math.PI*u));
    }
  }
  for(const front of wavefronts){
    const position=front.line.geometry.attributes.position;
    const u=(S.elapsed*.13+front.index/4)%1;
    rayTracks.forEach((track,i)=>{
      const pt=track.curve.getPointAt(u);
      position.setXYZ(i,pt.x,pt.y,pt.z+.015);
    });
    position.needsUpdate=true;
    front.line.material.opacity=.35+.48*Math.sin(Math.PI*u);
  }
  if(renderer.xr.isPresenting&&frame&&!placed){
    const session=renderer.xr.getSession();requestHitTest(session);
    if(hitTestSource){
      const hits=frame.getHitTestResults(hitTestSource);
      const referenceSpace=renderer.xr.getReferenceSpace();
      if(hits.length&&referenceSpace){
        const pose=hits[0].getPose(referenceSpace);
        if(pose){reticle.matrix.fromArray(pose.transform.matrix);reticle.visible=true;}
        else reticle.visible=false;
      }else reticle.visible=false;
    }
    updatePlaceUI();
  }
  if(!renderer.xr.isPresenting)orbit.update();
  renderer.render(scene,camera);
});
window.addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);
});
syncControls();
if(!navigator.xr)setStatus('WebXR auf diesem Gerät nicht verfügbar – 3D-Vorschau nutzbar');
