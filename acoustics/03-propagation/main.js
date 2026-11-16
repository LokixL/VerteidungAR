import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * RIPLEY — ACOUSTICS 03 / Sound Propagation.
 * Animated *qualitative* wavefronts (not a numerically solved acoustic field).
 * Geometry, reflection/transmission amplitudes, diffraction and time scale
 * are illustrative. Frequencies and calculated air wavelengths are physical.
 */
const $ = selector => document.querySelector(selector);
$('#app').innerHTML = `
<div id="stage"></div>
<div id="overlay">
  <header class="topbar">
    <div class="brand"><strong>RIPLEY</strong><small>ACOUSTICS 03 · SOUND PROPAGATION</small></div>
    <div class="status" id="status" role="status" aria-live="polite">3D-Vorschau bereit</div>
  </header>
  <div class="scene-label" id="scene-label">REFLECTION · SCHALLWELLEN AN EINER WAND</div>
  <div class="spacer"></div>
  <div id="menu-toggle-row"><button id="panel-toggle" type="button" aria-expanded="false" aria-controls="controls-panel">☰ Menü</button></div>
  <section id="controls-panel" aria-label="Akustik 3 Steuerung">
    <details class="control-menu" open>
      <summary><span>〰 Phänomen</span><span class="menu-current" id="mode-current">Reflection</span><span class="arrow">⌄</span></summary>
      <div class="menu-body">
        <div class="buttons">
          <button type="button" data-mode="reflection">↩ Reflection</button>
          <button type="button" data-mode="absorption">▥ Absorption / Transmission</button>
          <button type="button" data-mode="scattering">✦ Scattering</button>
          <button type="button" data-mode="diffraction">◔ Diffraction / Shadow</button>
          <button type="button" data-mode="multipath">⌁ Direct / Multipath</button>
        </div>
        <p class="caption">Wellenfronten und bewegte Lichtimpulse veranschaulichen die Schallwege.</p>
      </div>
    </details>
    <details class="control-menu">
      <summary><span>▤ Material & Frequenz</span><span class="menu-current" id="material-current">Beton · 1 kHz</span><span class="arrow">⌄</span></summary>
      <div class="menu-body">
        <div class="buttons two">
          <button type="button" data-material="concrete">Beton</button>
          <button type="button" data-material="foam">Schaumstoff</button>
          <button type="button" data-material="glass">Glas</button>
          <button type="button" data-material="rough">Raue Wand</button>
        </div>
        <p class="caption">Materialvergleich qualitativ: Das reale Verhalten hängt von Frequenz, Wandaufbau und Montage ab.</p>
        <div class="field">
          <label for="frequency">Frequenz <strong id="frequency-value">1.000 Hz</strong></label>
          <input type="range" id="frequency" min="0" max="2" step="1" value="1" />
          <p class="caption">250 Hz · 1.000 Hz · 4.000 Hz. Niedrige Frequenzen beugen sich am Hindernis stärker um Kanten (bei sonst gleichen Bedingungen).</p>
        </div>
      </div>
    </details>
    <details class="control-menu">
      <summary><span>⤢ Modell & Animation</span><span class="menu-current" id="model-current">100 % · 0°</span><span class="arrow">⌄</span></summary>
      <div class="menu-body">
        <div class="buttons two">
          <button type="button" id="pause">Ⅱ Pause</button>
          <button type="button" id="slow">◷ Noch langsamer</button>
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
      <div class="metric"><small>Frequenz</small><strong id="metric-freq">1.000 Hz</strong></div>
      <div class="metric"><small>λ in Luft (20 °C)</small><strong id="metric-lambda">34,3 cm</strong></div>
      <div class="metric"><small>Phänomen</small><strong id="metric-mode">Reflexion</strong></div>
    </div>
    <div class="legend"><span><i class="incident"></i> Direktschall</span><span><i class="reflected"></i> Reflektiert</span><span><i class="transmitted"></i> Übertragen</span><span><i class="diffracted"></i> Gebeugt</span></div>
    <div class="info-box" id="info-box"><button type="button" id="hide-info" aria-label="Beschreibung schließen">×</button><strong id="info-title">Reflexion</strong><div id="info-text"></div></div>
    <div class="actions"><button id="show-info" type="button" hidden>ⓘ Erklärung</button><button id="reset" type="button">↺ Reset</button></div>
    <p class="disclaimer">Didaktische Modellierung: Wellenfronten, Amplituden und Bewegungstempo sind nicht maßstabsgetreu. Keine berechnete Schallfeldsimulation.</p>
  </section>
  <div id="ar-place-actions"><button type="button" id="place-now" hidden>◎ Modell hier platzieren</button><button type="button" id="place-again" hidden>↺ Neu platzieren</button></div>
  <div id="ar-launch"></div>
</div>
<a id="home-link" href="../">← Akustik-Menü</a>`;

// ------ UI and states ------
const modes = {
  reflection:{name:'Reflection',short:'Reflexion',title:'Reflection – spiegelnde Reflexion',description:'Schallfronten breiten sich von der Quelle aus. An einer glatten, harten Wand entsteht eine reflektierte Welle. Für eine ebene Oberfläche gilt idealisiert: Einfallswinkel = Reflexionswinkel. Im Modell: Cyan einfallend, Orange reflektiert.'},
  absorption:{name:'Absorption / Transmission',short:'Absorption',title:'Absorption und Transmission',description:'Beim Auftreffen auf ein Bauteil wird ein Teil der Schallenergie reflektiert, ein Anteil kann durch das Material übertragen werden und ein Anteil wird absorbiert. Hier sind die Intensitäten nur schematisch – keine realen Absorptionsgrade.'},
  scattering:{name:'Scattering',short:'Streuung',title:'Streuung an einer rauen Oberfläche',description:'Eine unebene Oberfläche verteilt Schallenergie auf mehrere Reflexionsrichtungen. Ob eine Oberfläche akustisch „rau“ wirkt, hängt auch vom Verhältnis ihrer Strukturen zur Wellenlänge ab.'},
  diffraction:{name:'Diffraction / Shadow',short:'Schallschatten',title:'Beugung und Schallschatten',description:'Ein Hindernis schwächt den direkten Schall dahinter. An seinen Kanten werden Wellen gebeugt und gelangen auch in den geometrischen Schatten. Die relative Wirkung hängt unter anderem von der Wellenlänge und Hindernisgröße ab.'},
  multipath:{name:'Direct / Multipath',short:'Mehrwege',title:'Direktschall, Reflexion und Laufzeit',description:'Das Mikrofon empfängt einen direkten und einen längeren, reflektierten Schallweg. Die Komponenten treffen zu unterschiedlichen Zeiten ein und können sich überlagern. Im Modell sind beide Wege durch laufende Lichtpunkte markiert.'}
};
const materials={
  concrete:{name:'Beton',reflect:.86,transmit:.09,visual:'#91a1ad'},
  foam:{name:'Schaumstoff',reflect:.14,transmit:.08,visual:'#365e70'},
  glass:{name:'Glas',reflect:.53,transmit:.36,visual:'#80c8dc'},
  rough:{name:'Raue Wand',reflect:.64,transmit:.06,visual:'#879494'}
};
const freqs=[250,1000,4000];
const s={mode:'reflection',material:'concrete',freqIndex:1,scale:100,angle:0,paused:false,slow:false,clock:0};
const setStatus=text=>$('#status').textContent=text;
const fmt=n=>Math.round(n).toLocaleString('de-DE');
const panel=$('#controls-panel');
const panelButton=$('#panel-toggle');
function setPanel(open){panel.hidden=!open;panelButton.textContent=open?'✕ Menü':'☰ Menü';panelButton.setAttribute('aria-expanded',String(open));}
panelButton.addEventListener('click',e=>{e.stopPropagation();setPanel(panel.hidden);});
setPanel(false);
setPanel(!matchMedia('(max-width:760px), (max-height:540px)').matches);
for(const d of document.querySelectorAll('.control-menu'))d.addEventListener('toggle',()=>{if(d.open){for(const other of document.querySelectorAll('.control-menu'))if(other!==d)other.open=false;}});
$('#overlay').addEventListener('beforexrselect',event=>{if(event.target.closest('button, summary, input, #controls-panel, #ar-launch'))event.preventDefault();});

// ------ Three.js scene ------

function enablePinchScaling(){
  const el = renderer.domElement;
  let startDist = 0;
  let startScale = s.scale;
  const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
  const dist = touches => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
  el.addEventListener('touchstart', e => {
    if (e.target.closest('#overlay')) return;
    if (e.touches.length === 2) { startDist = dist(e.touches); startScale = s.scale; }
  }, {passive:true});
  el.addEventListener('touchmove', e => {
    if (e.target.closest('#overlay')) return;
    if (e.touches.length === 2 && startDist > 0) {
      e.preventDefault();
      const nextScale = Math.round(clamp(startScale * (dist(e.touches) / startDist), 30, 250));
      s.scale = nextScale;
      $('#size').value = nextScale;
      syncTransform();
    }
  }, {passive:false});
  el.addEventListener('touchend', e => { if (e.touches.length < 2) startDist = 0; });
}

const scene=new THREE.Scene();
const bg=new THREE.Color('#132638');scene.background=bg;
scene.add(new THREE.HemisphereLight('#e5ffff','#314557',2.0));
const key=new THREE.DirectionalLight('#ffffff',2.45);key.position.set(1,2,1.35);scene.add(key);
const camera=new THREE.PerspectiveCamera(61,innerWidth/innerHeight,.01,30);
camera.position.set(1.30,1.16,1.7);camera.lookAt(0,.13,0);
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
renderer.xr.enabled=true;
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
$('#stage').appendChild(renderer.domElement);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.target.set(0,.14,0);orbit.minDistance=.55;orbit.maxDistance=4.1;
const placementRoot=new THREE.Group();scene.add(placementRoot);
const contentRoot=new THREE.Group();placementRoot.add(contentRoot);
const base=new THREE.Group(),setGroup=new THREE.Group();contentRoot.add(base,setGroup);
const mat=(c,props={})=>new THREE.MeshStandardMaterial({color:c,roughness:.63,...props});
const glow=(c,opacity=1)=>new THREE.MeshBasicMaterial({color:c,transparent:opacity<1,opacity,side:THREE.DoubleSide,depthWrite:opacity===1});
function block(parent,shape,pos,material){const o=new THREE.Mesh(new THREE.BoxGeometry(...shape),material);o.position.set(...pos);parent.add(o);return o;}
function cylinder(parent,top,bottom,height,pos,material){const o=new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,height,24),material);o.position.set(...pos);parent.add(o);return o;}
function line(parent,vertices,col,alpha=1){const geo=new THREE.BufferGeometry().setFromPoints(vertices.map(p=>new THREE.Vector3(...p)));const obj=new THREE.Line(geo,new THREE.LineBasicMaterial({color:col,transparent:alpha<1,opacity:alpha,depthWrite:false}));parent.add(obj);return obj;}
function label(parent,text,pos,width=.24,accent='#85e9d7'){
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=120;
  const ctx=canvas.getContext('2d');ctx.fillStyle='rgba(7,25,39,.91)';ctx.beginPath();ctx.roundRect(3,4,634,112,18);ctx.fill();
  ctx.strokeStyle=accent;ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#e7fff8';ctx.font='bold 39px system-ui';ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillText(text,320,60,600);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,transparent:true}));sprite.position.set(...pos);sprite.scale.set(width,width*.19,1);parent.add(sprite);return sprite;
}
function clearAll(parent){while(parent.children.length){const node=parent.children[0];parent.remove(node);node.traverse(child=>{child.geometry?.dispose?.();const m=child.material;if(m){for(const item of (Array.isArray(m)?m:[m])){item.map?.dispose?.();item.dispose?.();}}});}}
// Raised tabletop with a discreet coordinate grid.
block(base,[1.77,.021,1.10],[0,.012,0],mat('#163347',{metalness:.20}));
block(base,[1.72,.004,1.055],[0,.024,0],glow('#205567',.63));
for(let i=0;i<13;i++){const x=-.77+i*.128;line(base,[[x,.03,-.51],[x,.03,.51]],'#4d8490',.14);}
for(let i=0;i<9;i++){const z=-.49+i*.123;line(base,[[-.83,.031,z],[.83,.031,z]],'#4d8490',.14);}
for(const x of [-.81,.81])for(const z of [-.49,.49])cylinder(base,.011,.011,.025,[x,.04,z],glow('#6aefd7',.7));

const waveVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const waveFragment=`
precision highp float;
varying vec2 vUv;
uniform float uTime,uWave,uWall,uReflect,uTransmit,uDiffract,uScatter;
uniform int uMode;
const float TAU=6.28318530718;
float wave(vec2 p,vec2 center,float amount){
 float d=distance(p,center);
 float phase=TAU*((d-uTime*.20)/max(uWave,.01));
 float peak=pow(max(cos(phase),0.0),20.0);
 return amount*peak/(1.0+0.85*d);
}
void main(){
  vec2 p=vec2((vUv.x-.5)*1.72,(.5-vUv.y)*1.055);
  vec3 rgb=vec3(.0);float a=0.0;
  vec2 src=vec2(-.60,-.13);
  float wall=uWall;
  if(uMode==4){
    src=vec2(-.58,.16);
    float direct=wave(p,src,.78);
    vec2 virtualSrc=vec2(src.x,2.0*(-.40)-src.y);
    float reflected=wave(p,virtualSrc,.60);
    rgb+=vec3(.20,.79,1.0)*direct+vec3(1.0,.51,.19)*reflected;
    a+=direct+reflected;
  }else if(uMode==3){
    float incoming=wave(p,src,.94);
    float blocked=0.0;
    if(p.x>wall){
      float t=(wall-src.x)/max(.0001,p.x-src.x);
      float zAt=src.y+(p.y-src.y)*t;
      blocked=step(-.20,zAt)*step(zAt,.16);
    }
    float strength=mix(1.0,.075,blocked);
    float direct=incoming*strength;
    float edge1=wave(p,vec2(wall,-.20),.68*uDiffract)*step(wall,p.x);
    float edge2=wave(p,vec2(wall,.16),.68*uDiffract)*step(wall,p.x);
    rgb+=vec3(.28,.77,1.0)*direct+vec3(.60,.37,1.0)*(edge1+edge2);
    a+=direct+edge1+edge2;
  }else{
    float left=1.0-step(wall,p.x);
    float inc=wave(p,src,.88);
    float ref=wave(p,vec2(2.0*wall-src.x,src.y),uReflect);
    float tr=wave(p,src,uTransmit);
    rgb+=vec3(.29,.83,1.0)*inc*left;
    rgb+=vec3(1.0,.58,.25)*ref*left;
    rgb+=vec3(.33,1.0,.69)*tr*(1.0-left);
    a+=inc*left+ref*left+tr*(1.0-left);
    if(uMode==2){
       // Secondary wavelets: schematic diffuse reflection in multiple directions.
       for(int i=0;i<5;i++){
          vec2 center=vec2(wall,-.32+float(i)*.155);
          float diffuse=wave(p,center,uScatter*.19)*left;
          rgb+=vec3(1.0,.46,.64)*diffuse;
          a+=diffuse;
       }
    }
  }
  float fade=smoothstep(.04,.17,p.x+.84)*smoothstep(.04,.18,.84-p.x)*smoothstep(.01,.12,p.y+.52)*smoothstep(.01,.12,.52-p.y);
  gl_FragColor=vec4(rgb*1.45,clamp(a*.88*fade,0.0,.91));
}`;
const waveUniforms={uTime:{value:0},uWave:{value:.14},uWall:{value:.13},uReflect:{value:.78},uTransmit:{value:.1},uDiffract:{value:.45},uScatter:{value:.5},uMode:{value:0}};
const waveField=new THREE.Mesh(new THREE.PlaneGeometry(1.72,1.055),new THREE.ShaderMaterial({uniforms:waveUniforms,vertexShader:waveVertex,fragmentShader:waveFragment,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));
waveField.rotation.x=-Math.PI/2;waveField.position.y=.039;waveField.renderOrder=2;contentRoot.add(waveField);

// ------ 3D entities and travelling pulses ------
let paths=[];
function makeTrack(points,color,opacity=.5,pulses=3){
  const c=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0],p[1],p[2])));
  const tube=new THREE.Mesh(new THREE.TubeGeometry(c,65,.0027,5,false),glow(color,opacity));setGroup.add(tube);
  const beads=[];
  for(let j=0;j<pulses;j++){
    const bead=new THREE.Mesh(new THREE.SphereGeometry(.012,10,8),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.98}));
    setGroup.add(bead);beads.push(bead);
  }
  paths.push({curve:c,beads,offset:Math.random()*.2});
}
function addSource(x,z){
  block(setGroup,[.095,.16,.14],[x,.127,z],mat('#304b62',{metalness:.35}));
  const cone=cylinder(setGroup,.052,.050,.012,[x+.051,.133,z],mat('#69c8e4',{metalness:.2,emissive:'#12485a',emissiveIntensity:.4}));cone.rotation.z=Math.PI/2;
  const ring=cylinder(setGroup,.029,.029,.014,[x+.060,.135,z],glow('#0d3554'));ring.rotation.z=Math.PI/2;
  label(setGroup,'LAUTSPRECHER',[x,.27,z],.23,'#5ddfff');
}
function addMic(x,z){
  const mic=cylinder(setGroup,.022,.022,.077,[x,.17,z],mat('#adc5d6',{metalness:.75,roughness:.22}));mic.rotation.z=Math.PI/2;
  block(setGroup,[.008,.12,.009],[x,.083,z],mat('#64899c',{metalness:.5}));
  block(setGroup,[.09,.012,.075],[x,.042,z],mat('#577b8d',{metalness:.4}));
  label(setGroup,'MIKROFON',[x,.30,z],.18,'#66ffcf');
}
function makeWall(type,x=.13){
  const M=materials[type];
  const isGlass=type==='glass';
  const m=isGlass?new THREE.MeshPhysicalMaterial({color:'#67c8e9',transparent:true,opacity:.33,roughness:.07,metalness:.12,side:THREE.DoubleSide,depthWrite:false}):mat(M.visual,{metalness:type==='concrete'?.05:.03,roughness:type==='foam'?.96:.88});
  const wall=block(setGroup,[.045,.34,.93],[x,.21,0],m);
  if(type==='concrete'){
    for(const y of [.105,.22,.335])block(setGroup,[.048,.003,.90],[x,.0+y,0],glow('#d4e4e8',.21));
    for(const z of [-.33,-.1,.13,.34])block(setGroup,[.048,.30,.003],[x,.21,z],glow('#0c2437',.23));
  }
  if(type==='foam'){
    for(let i=0;i<11;i++)for(let j=0;j<3;j++){
      const o=new THREE.Mesh(new THREE.ConeGeometry(.023,.029,4),mat('#315367',{roughness:.98}));
      o.rotation.z=Math.PI/2;o.position.set(x-.035,.11+j*.103,-.4+i*.08);setGroup.add(o);
    }
  }
  if(type==='rough'){
    for(let i=0;i<15;i++)for(let j=0;j<3;j++){
      const zz=-.43+i*.061;const yy=.09+j*.11;
      block(setGroup,[.019+.009*(i%3),.065,.051],[x-.035-(i%3)*.003,yy,zz],mat(i%3===0?'#b4b4a7':i%3===1?'#728a8d':'#8a9b96'));
    }
  }
  if(type==='glass'){
    for(const z of [-.47,.47])block(setGroup,[.055,.35,.009],[x,.21,z],mat('#a4d6e9',{metalness:.55}));
    for(const y of [.045,.39])block(setGroup,[.055,.009,.95],[x,y,0],mat('#a4d6e9',{metalness:.55}));
  }
  label(setGroup,M.name.toUpperCase(),[x,.47,0],.19);
  return wall;
}
function makeBarrier(x=.03){
  block(setGroup,[.060,.39,.37],[x,.227,-.015],mat('#9ba7b4',{roughness:.91}));
  block(setGroup,[.08,.009,.39],[x,.428,-.015],glow('#c9e0e6',.75));
  label(setGroup,'HINDERNIS',[x,.52,-.015],.21);
  // Edge markers and a transparent schematic acoustic-shadow wedge.
  for(const z of [-.20,.17]){
    cylinder(setGroup,.013,.013,.035,[x,.435,z],glow('#b9a0ff'));
  }
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(.70,.49),glow('#080e28',.36));
  shadow.rotation.x=-Math.PI/2;shadow.position.set(.46,.033,-.03);setGroup.add(shadow);
  label(setGroup,'SCHALLSCHATTEN',[.48,.13,-.025],.20,'#baa2ff');
}
function wallAlongZ(){
  block(setGroup,[1.47,.39,.045],[0,.225,-.405],mat('#8b9ba6',{roughness:.8}));
  label(setGroup,'REFLEKTIERENDE WAND',[0,.52,-.405],.30);
}
function buildModel(){
  clearAll(setGroup);paths=[];
  const freq=freqs[s.freqIndex];const material=materials[s.material];
  waveUniforms.uMode.value=['reflection','absorption','scattering','diffraction','multipath'].indexOf(s.mode);
  waveUniforms.uWave.value= [.245,.145,.075][s.freqIndex]; // Visual spacing: not to scale.
  waveUniforms.uReflect.value=material.reflect;
  waveUniforms.uTransmit.value=material.transmit;
  waveUniforms.uDiffract.value=[1.0,.60,.27][s.freqIndex];
  waveUniforms.uScatter.value=material.reflect;
  if(s.mode==='multipath'){
    addSource(-.58,.16);addMic(.58,.16);wallAlongZ();
    makeTrack([[-.52,.10,.16],[.0,.10,.16],[.58,.10,.16]],'#63deff',.48,4);
    makeTrack([[-.52,.12,.16],[-.26,.12,-.10],[0,.12,-.381],[.28,.12,-.10],[.58,.12,.16]],'#ffad68',.65,4);
    label(setGroup,'DIREKT',[.03,.185,.22],.14,'#5cddfc');
    label(setGroup,'REFLEXION',[.06,.20,-.20],.17,'#ffad68');
  }else if(s.mode==='diffraction'){
    addSource(-.60,-.13);addMic(.64,-.12);makeBarrier(.03);
    makeTrack([[-.53,.09,-.13],[-.29,.09,-.13],[.015,.09,-.13]],'#5cddff',.4,3);
    const via=[[-.53,.11,-.13],[-.24,.11,-.25],[.03,.11,-.215],[.22,.11,-.24],[.48,.11,-.13],[.64,.11,-.12]];
    makeTrack(via,'#b6a0ff',.64,3);
  }else{
    addSource(-.60,-.13);
    addMic(s.mode==='reflection'?-.49:.60,s.mode==='reflection'?.35:-.13);
    makeWall(s.material,.13);
    if(s.mode==='absorption'){
      const absorptionMark=block(setGroup,[.052,.18,.21],[.094,.22,-.11],glow('#f5a65e',.33));
      absorptionMark.userData.absorptionMark=true;
      label(setGroup,'ABSORPTION',[.04,.50,-.17],.20,'#f5a65e');
    }
    const hit=[.104,.105,-.11];
    makeTrack([[-.54,.12,-.13],[-.23,.12,-.12],hit],'#5cddff',.42,3);
    if(s.mode==='scattering'){
      for(const z of [-.43,-.23,.0,.22,.41])makeTrack([hit,[-.12,.12,z*.45-.06],[-.50,.12,z]],'#fca46e',.35,2);
    }else{
      const reflected=material.reflect;
      if(reflected>.12)makeTrack([hit,[-.18,.12,.08],[-.49,.12,.35]],'#ffad68',Math.max(.14,reflected*.65),3);
      const transmitted=material.transmit;
      if(transmitted>.06)makeTrack([hit,[.38,.11,-.12],[.59,.11,-.13]],'#64ffc9',Math.max(.18,transmitted*.85),3);
    }
  }
  $('#metric-freq').textContent=`${fmt(freq)} Hz`;
  $('#metric-lambda').textContent=`${(343/freq*100).toLocaleString('de-DE',{maximumFractionDigits:1})} cm`;
  $('#metric-mode').textContent=modes[s.mode].short;
  $('#mode-current').textContent=modes[s.mode].name;
  $('#material-current').textContent=`${material.name} · ${fmt(freq)} Hz`;
  $('#scene-label').textContent=`${modes[s.mode].name.toUpperCase()} · SOUND PROPAGATION`;
  $('#frequency-value').textContent=`${fmt(freq)} Hz`;
  $('#frequency').value=s.freqIndex;
  $('#info-title').textContent=modes[s.mode].title;
  $('#info-text').textContent=modes[s.mode].description;
  for(const btn of document.querySelectorAll('[data-mode]'))btn.classList.toggle('active',btn.dataset.mode===s.mode);
  for(const btn of document.querySelectorAll('[data-material]'))btn.classList.toggle('active',btn.dataset.material===s.material);
  if(s.mode==='diffraction')$('#info-text').textContent+=' Nutze den Frequenzregler: Die violetten Beugungswellen werden bei 250 Hz deutlicher als bei 4.000 Hz.';
}
function syncTransform(){
  contentRoot.scale.setScalar(s.scale/100*.56);
  contentRoot.rotation.y=s.angle*Math.PI/180;
  $('#size-value').textContent=`${s.scale} %`;
  $('#rotation-value').textContent=`${s.angle}°`;
  $('#model-current').textContent=`${s.scale} % · ${s.angle}°`;
  $('#pause').textContent=s.paused?'▶ Weiter':'Ⅱ Pause';
  $('#slow').classList.toggle('active',s.slow);
}
for(const btn of document.querySelectorAll('[data-mode]'))btn.addEventListener('click',()=>{
  s.mode=btn.dataset.mode;
  // Start each phenomenon with a visually meaningful surface; material remains adjustable.
  if(s.mode==='scattering')s.material='rough';
  else if(s.mode==='absorption')s.material='foam';
  else if(s.mode==='reflection'||s.mode==='multipath')s.material='concrete';
  buildModel();
});
for(const btn of document.querySelectorAll('[data-material]'))btn.addEventListener('click',()=>{s.material=btn.dataset.material;buildModel();});
$('#frequency').addEventListener('input',e=>{s.freqIndex=Number(e.target.value);buildModel();});
$('#size').addEventListener('input',e=>{s.scale=Number(e.target.value);syncTransform();});
$('#rotation').addEventListener('input',e=>{s.angle=Number(e.target.value);syncTransform();});
$('#pause').addEventListener('click',()=>{s.paused=!s.paused;syncTransform();});
$('#slow').addEventListener('click',()=>{s.slow=!s.slow;syncTransform();});
$('#hide-info').addEventListener('click',()=>{$('#info-box').hidden=true;$('#show-info').hidden=false;});
$('#show-info').addEventListener('click',()=>{$('#info-box').hidden=false;$('#show-info').hidden=true;});

// ------ AR hit-test placement: preserve placementRoot after first placement ------
const reticle=new THREE.Mesh(new THREE.RingGeometry(.073,.09,48).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#71ffbe',side:THREE.DoubleSide,depthTest:false}));
reticle.matrixAutoUpdate=false;reticle.visible=false;scene.add(reticle);
let placed=false,hitTestSource=null,requestingHitTest=false;
const controller=renderer.xr.getController(0);scene.add(controller);
function updatePlaceUI(){
  const xr=renderer.xr.isPresenting;
  $('#place-now').hidden=!xr||placed||!reticle.visible;
  $('#place-again').hidden=!xr||!placed;
}
function resetPlacement(){placed=false;placementRoot.visible=false;reticle.visible=false;setStatus('Tisch anvisieren · grünen Kreis antippen');updatePlaceUI();}
function place(){
  if(!renderer.xr.isPresenting||placed||!reticle.visible)return;
  placementRoot.position.setFromMatrixPosition(reticle.matrix);
  placementRoot.quaternion.setFromRotationMatrix(reticle.matrix);
  placementRoot.visible=true;placed=true;reticle.visible=false;
  setStatus('Akustikmodell platziert');updatePlaceUI();
}
controller.addEventListener('select',place);
$('#place-now').addEventListener('click',e=>{e.stopPropagation();place();});
$('#place-again').addEventListener('click',e=>{e.stopPropagation();resetPlacement();});
const button=ARButton.createButton(renderer,{requiredFeatures:['hit-test'],optionalFeatures:['dom-overlay'],domOverlay:{root:$('#overlay')}});
$('#ar-launch').appendChild(button);
enablePinchScaling();
renderer.xr.addEventListener('sessionstart',()=>{
  document.body.classList.add('in-xr');scene.background=null;orbit.enabled=false;resetPlacement();
  if(!renderer.xr.getSession()?.domOverlayState)setStatus('AR aktiv · UI eventuell nicht sichtbar (DOM Overlay fehlt)');
});
renderer.xr.addEventListener('sessionend',()=>{
  hitTestSource?.cancel();hitTestSource=null;requestingHitTest=false;
  document.body.classList.remove('in-xr');scene.background=bg;orbit.enabled=true;
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
    const source=await session.requestHitTestSource({space:viewer});
    if(renderer.xr.getSession()===session)hitTestSource=source;else source.cancel();
  }catch(err){setStatus(`Tischerkennung nicht verfügbar: ${err.message}`);}
  finally{requestingHitTest=false;}
}
function reset(){
  Object.assign(s,{mode:'reflection',material:'concrete',freqIndex:1,scale:100,angle:0,paused:false,slow:false,clock:0});
  $('#size').value=100;$('#rotation').value=0;buildModel();syncTransform();
  if(renderer.xr.isPresenting)resetPlacement();
  else{placementRoot.position.set(0,0,0);placementRoot.quaternion.identity();setStatus('3D-Vorschau zurückgesetzt');}
}
$('#reset').addEventListener('click',reset);
const clock=new THREE.Clock();
renderer.setAnimationLoop((_time,frame)=>{
  const dt=Math.min(clock.getDelta(),.065);
  if(!s.paused)s.clock+=dt*(s.slow?.40:1);
  waveUniforms.uTime.value=s.clock;
  for(const o of setGroup.children){
    if(o.userData.absorptionMark)o.material.opacity=.24+.20*(.5+.5*Math.sin(s.clock*5));
  }
  for(const track of paths){
    const shift=s.clock*.20;
    for(let i=0;i<track.beads.length;i++){
      const u=(shift+i/track.beads.length+track.offset)%1;
      track.beads[i].position.copy(track.curve.getPoint(u));
      track.beads[i].material.opacity=.34+.64*Math.sin(Math.PI*u);
    }
  }
  if(renderer.xr.isPresenting&&frame&&!placed){
    const session=renderer.xr.getSession();requestHitTest(session);
    if(hitTestSource){
      const hits=frame.getHitTestResults(hitTestSource);
      const space=renderer.xr.getReferenceSpace();
      if(hits.length&&space){
        const pose=hits[0].getPose(space);
        if(pose){reticle.matrix.fromArray(pose.transform.matrix);reticle.visible=true;}else reticle.visible=false;
      }else reticle.visible=false;
    }
    updatePlaceUI();
  }
  if(!renderer.xr.isPresenting)orbit.update();
  renderer.render(scene,camera);
});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
buildModel();syncTransform();
if(!navigator.xr)setStatus('WebXR auf diesem Gerät nicht verfügbar – 3D-Vorschau nutzbar');
