import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * RIPLEY / ACOUSTICS 02 — Interferenz und Schwebung.
 * Drucksignale addieren sich algebraisch: p_gesamt = p_A + p_B.
 * Die Raumskala, Wellenlängen, Teilchenauslenkungen und visuelle Zeitskala
 * sind bewusst didaktisch angepasst; keine kalibrierte Schallfeldsimulation.
 */
const $ = q => document.querySelector(q);
$('#app').innerHTML = `
<div id="stage"></div>
<div id="overlay">
  <header class="topbar">
    <div class="brand"><strong>RIPLEY</strong><small>ACOUSTICS 02 · WAVE INTERFERENCE</small></div>
    <div class="status" id="status" role="status" aria-live="polite">3D-Vorschau bereit</div>
  </header>
  <div class="scene-label" id="scene-label">ADDITION · ZWEI WELLEN → EIN SIGNAL</div>
  <div class="spacer"></div>
  <div id="menu-toggle-row"><button id="panel-toggle" type="button" aria-expanded="true" aria-controls="controls-panel">⌄ Menü ausblenden</button></div>
  <section id="controls-panel" aria-label="Akustik 2 Steuerung">
    <details class="control-menu" id="menu-drag" open>
      <summary><span>↔ Wellen selbst verschieben</span><span class="menu-current" id="drag-current">0 λ · Addition</span><span class="arrow">⌄</span></summary>
      <div class="menu-body">
        <p class="drag-instruction">Ziehe die <b style="color:#ffb56d">orange Welle B</b> mit dem Finger nach links oder rechts. Die <b style="color:#68ffc2">grüne Summe</b> reagiert sofort – auch im 3D-Modell.</p>
        <div class="wave-drag-surface">
          <canvas id="wave-drag-chart" width="760" height="312" aria-label="Interaktives Diagramm: Orange Welle B horizontal verschieben, cyan Welle A und grüne Summe beobachten"></canvas>
          <div class="drag-cue">↔ Welle B hier ziehen</div>
        </div>
        <div class="drag-state"><strong id="drag-state-title">Konstruktive Interferenz</strong><span id="drag-shift-value">Verschiebung: 0 λ</span></div>
        <div class="btn-grid quick-actions">
          <button type="button" id="snap-add">＋ Addition</button>
          <button type="button" id="snap-cancel">− Auslöschung</button>
          <button type="button" id="snap-beats">≋ Schwebung</button>
        </div>
        <div id="beat-demo" class="beat-demo" hidden>
          <div class="beat-head"><strong>Schwebung</strong><span id="beat-caption">440 + 444 Hz · 4 Schwebungen/s</span></div>
          <canvas id="beat-chart" width="760" height="175" aria-label="Animierte Summenwelle mit periodisch veränderlicher Amplitude"></canvas>
          <p class="caption">Die Hüllkurve zeigt Verstärkung und Abschwächung im Wechsel. Die Darstellung ist verlangsamt.</p>
        </div>
      </div>
    </details>
    <details class="control-menu" id="menu-effect">
      <summary><span>◈ Effekt auswählen</span><span class="menu-current" id="effect-current">Addition</span><span class="arrow">⌄</span></summary>
      <div class="menu-body">
        <div class="btn-grid">
          <button type="button" data-mode="addition">＋ Addition</button>
          <button type="button" data-mode="cancellation">− Auslöschung</button>
          <button type="button" data-mode="beats">≋ Schwebung</button>
        </div>
        <p class="caption">Die dritte, grüne Spur zeigt stets die Summe beider Wellen.</p>
      </div>
    </details>
    <details class="control-menu" id="menu-signals">
      <summary><span>〰 Wellen einstellen</span><span class="menu-current" id="signal-current">440 + 440 Hz</span><span class="arrow">⌄</span></summary>
      <div class="menu-body">
        <div class="controls-group">
          <label for="phase-slider">Phasenverschiebung Welle B <strong id="phase-value">0°</strong></label>
          <input id="phase-slider" type="range" min="0" max="360" step="5" value="0" />
        </div>
        <div class="controls-group">
          <label for="amplitude-slider">Amplitude Welle B <strong id="amplitude-value">100 %</strong></label>
          <input id="amplitude-slider" type="range" min="0" max="150" step="5" value="100" />
        </div>
        <div class="controls-group">
          <label for="delta-slider">Frequenzunterschied Δf <strong id="delta-value">0 Hz</strong></label>
          <input id="delta-slider" type="range" min="0" max="12" step="1" value="0" />
          <p class="caption">Bei Δf ≠ 0 verändert sich die Phasenlage fortlaufend: Schwebung.</p>
        </div>
      </div>
    </details>
    <details class="control-menu" id="menu-model">
      <summary><span>⤢ Modell & Animation</span><span class="menu-current" id="model-current">100 % · 0°</span><span class="arrow">⌄</span></summary>
      <div class="menu-body">
        <div class="btn-grid two">
          <button type="button" id="play-pause">Ⅱ Pause</button>
          <button type="button" id="slow-toggle">◷ Zeitlupe</button>
        </div>
        <div class="controls-group">
          <label for="size-slider">Modellgröße <strong id="size-value">100 %</strong></label>
          <input id="size-slider" type="range" min="30" max="250" step="5" value="100" />
        </div>
        <div class="controls-group">
          <label for="rotation-slider">Modell drehen <strong id="rotation-value">0°</strong></label>
          <input id="rotation-slider" type="range" min="0" max="360" step="5" value="0" />
        </div>
      </div>
    </details>
    <div class="metric-grid">
      <div class="metric"><small>Welle A</small><strong>440 Hz</strong></div>
      <div class="metric"><small>Welle B</small><strong id="metric-frequency-b">440 Hz</strong></div>
      <div class="metric highlight"><small>Schwebung |Δf|</small><strong id="metric-beat">0 Hz</strong></div>
    </div>
    <div class="chart-card">
      <div class="chart-head"><strong>Schalldruck · Überlagerung</strong><span>schematisch / Zeitlupe</span></div>
      <canvas id="signal-chart" aria-label="Diagramm: Schalldruck A, Schalldruck B, Summe" width="760" height="240"></canvas>
      <div class="chart-key"><span><i class="key-a"></i> Welle A</span><span><i class="key-b"></i> Welle B</span><span><i class="key-sum"></i> Summe</span></div>
    </div>
    <div class="info-box"><button type="button" id="info-close" aria-label="Beschreibung schließen">×</button><strong id="info-title">Konstruktive Interferenz</strong><div id="info-text"></div></div>
    <div class="actions"><button type="button" id="info-show" hidden>ⓘ Erklärung</button><button type="button" id="reset">↺ Reset</button></div>
    <p class="disclaimer">Drei perspektivisch getrennte Wellenfelder veranschaulichen die mathematische Überlagerung. Teilchenbewegung und Animationsgeschwindigkeit sind stark vergrößert bzw. verlangsamt.</p>
  </section>
  <div id="ar-place-actions"><button type="button" id="place-now" hidden>◎ Modell hier platzieren</button><button type="button" id="place-again" hidden>↺ Neu platzieren</button></div>
  <div id="ar-launch"></div>
</div>
<a id="home-link" href="../">← Akustik-Menü</a>
`;

const Modes = {
  addition: {
    name:'Addition', phase:0, amplitude:1, delta:0, tone:'#65f0bc',
    title:'Konstruktive Interferenz',
    description:'Treffen gleichfrequente Wellen mit gleicher Phase aufeinander, addieren sich ihre momentanen Schalldrücke. Bei gleichen Amplituden ist die resultierende Schalldruckamplitude doppelt so groß.'
  },
  cancellation: {
    name:'Auslöschung', phase:180, amplitude:1, delta:0, tone:'#ffc57a',
    title:'Destruktive Interferenz',
    description:'Bei gleicher Frequenz, gleicher Amplitude und 180° Phasenverschiebung heben sich die Schalldrücke an diesem Ort idealisiert vollständig auf. Die beiden einzelnen Wellen sind weiterhin vorhanden.'
  },
  beats: {
    name:'Schwebung', phase:0, amplitude:1, delta:4, tone:'#b29aff',
    title:'Schwebung zweier nahe beieinanderliegender Frequenzen',
    description:'Zwei fast gleichfrequente Signale verstärken und schwächen sich abwechselnd. Die Schwebungsfrequenz ergibt sich aus |f₂ − f₁|; hier zunächst 4 Hz. Die sichtbare Animation ist absichtlich stärker verlangsamt.'
  }
};
const st = {mode:'addition',phase:0,shiftCycles:0,amplitude:1,delta:0,scale:1,rotation:0,paused:false,slow:false,t:0,info:true};
const fmt = v => v.toLocaleString('de-DE');
const setStatus = t => $('#status').textContent = t;

// Entire panel can be hidden. The AR launch, hit-test reticle and placement
// controls are independent of the panel and stay accessible.
const panel=$('#controls-panel');
const panelBtn=$('#panel-toggle');
function expandPanel(open){
  panel.hidden=!open;
  panelBtn.textContent=open?'⌄ Menü ausblenden':'☰ Menü öffnen';
  panelBtn.setAttribute('aria-expanded',String(open));
}
panelBtn.addEventListener('click', e=>{e.stopPropagation();expandPanel(panel.hidden);});
expandPanel(!matchMedia('(max-width:760px), (max-height:540px)').matches);
for(const el of document.querySelectorAll('details.control-menu')){
  el.addEventListener('toggle',()=>{
    if(el.open)for(const other of document.querySelectorAll('details.control-menu'))if(other!==el)other.open=false;
  });
}
$('#overlay').addEventListener('beforexrselect',event=>{
  if(event.target.closest('button, summary, input, #controls-panel, #ar-launch'))event.preventDefault();
});

const scene = new THREE.Scene();
const bg = new THREE.Color('#14263a');
scene.background=bg;
scene.add(new THREE.HemisphereLight('#e4fcff','#385063',2.25));
const sun=new THREE.DirectionalLight('#f1ffff',2.4);sun.position.set(.8,2.2,1.3);scene.add(sun);
const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,.01,30);
camera.position.set(1.04,.94,1.55);camera.lookAt(0,.19,0);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.xr.enabled=true;
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
$('#stage').append(renderer.domElement);
const orbit=new OrbitControls(camera,renderer.domElement);
orbit.enableDamping=true;orbit.target.set(0,.19,0);orbit.minDistance=.6;orbit.maxDistance=4;

const placementRoot=new THREE.Group();scene.add(placementRoot);
const contentRoot=new THREE.Group();placementRoot.add(contentRoot);
const structure=new THREE.Group();contentRoot.add(structure);
const particleRoot=new THREE.Group();contentRoot.add(particleRoot);
const curveRoot=new THREE.Group();contentRoot.add(curveRoot);
const labelRoot=new THREE.Group();contentRoot.add(labelRoot);
const particleGeom=new THREE.SphereGeometry(1,9,6);
const dummy=new THREE.Object3D();
const color=new THREE.Color();
const lowColor=new THREE.Color();const highColor=new THREE.Color();
const basic=(hex,opacity=1)=>new THREE.MeshBasicMaterial({color:hex,transparent:opacity<1,opacity,depthWrite:opacity===1,side:THREE.DoubleSide});
const metallic=(hex)=>new THREE.MeshStandardMaterial({color:hex,roughness:.38,metalness:.62});
function box(parent,shape,xyz,mat){let m=new THREE.Mesh(new THREE.BoxGeometry(...shape),mat);m.position.set(...xyz);parent.add(m);return m;}
function tube(parent,radius,height,xyz,material,segments=24){const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,segments),material);m.position.set(...xyz);parent.add(m);return m;}

// Three lanes for two incident waves and their algebraic sum, all propagating along +X.
const lanes=[
 {id:'a',name:'WELLE A',z:-.18,accent:'#65dfff',base:'#2d8bae'},
 {id:'b',name:'WELLE B',z:0,accent:'#ffb56d',base:'#ad6642'},
 {id:'sum',name:'SUMME A+B',z:.18,accent:'#68ffc2',base:'#309476'}
];
box(structure,[1.41,.022,.59],[0,.011,0],metallic('#183348'));
box(structure,[1.37,.003,.55],[0,.025,0],basic('#1d5364',.6));
for(const l of lanes){
  box(structure,[1.24,.006,.16],[0,.045,l.z],basic('#26475a',.55));
  for (const dz of [-.078,.078])box(structure,[1.24,.009,.004],[0,.049,l.z+dz],basic(l.accent,.42));
  // Source transducer on each lane.
  box(structure,[.08,.145,.115],[-.615,.135,l.z],metallic('#263a4c'));
  const front=tube(structure,.044,.009,[-.567,.148,l.z],basic(l.accent,.9),32);
  front.rotation.z=Math.PI/2;
  const mic=tube(structure,.020,.066,[.612,.157,l.z],metallic('#b9cbd8'));
  mic.rotation.z=Math.PI/2;
  box(structure,[.006,.12,.006],[.61,.096,l.z],metallic('#8ba6b1'));
  box(structure,[.07,.009,.065],[.61,.035,l.z],metallic('#4f7082'));
}

function makeText(text,at,w=.23){
  const canvas=document.createElement('canvas');canvas.width=720;canvas.height=120;
  const cx=canvas.getContext('2d');
  cx.fillStyle='rgba(11,28,43,.88)';cx.beginPath();cx.roundRect(4,5,712,110,19);cx.fill();
  cx.strokeStyle='rgba(143,243,211,.8)';cx.lineWidth=3;cx.stroke();
  cx.fillStyle='#edfff9';cx.textAlign='center';cx.textBaseline='middle';cx.font='bold 41px system-ui';cx.fillText(text,360,60,680);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false});
  const sp=new THREE.Sprite(m);sp.position.set(...at);sp.scale.set(w,w/6,1);labelRoot.add(sp);
}
for(const l of lanes)makeText(l.name,[-.10,.325,l.z],.27);
makeText('QUELLE',[-.604,.29,-.18],.155);makeText('MIKROFON',[.61,.285,.18],.175);

const xMin=-.49,xMax=.49,xSpan=xMax-xMin;
const Nx=62,Ny=3,Nz=2;
const meta=[];
for(let i=0;i<Nx;i++)for(let j=0;j<Ny;j++)for(let k=0;k<Nz;k++)meta.push({u:i/(Nx-1),y:.109+j*.049,z:(k-.5)*.063});
const visualN=meta.length;
for(const l of lanes){
  l.instanced=new THREE.InstancedMesh(particleGeom,new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.28,metalness:.10}),visualN);
  l.instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);l.instanced.frustumCulled=false;
  particleRoot.add(l.instanced);
  l.geometry=new THREE.BufferGeometry();
  l.position=new Float32Array(Nx*3);
  l.geometry.setAttribute('position',new THREE.BufferAttribute(l.position,3));
  l.curve=new THREE.Line(l.geometry,new THREE.LineBasicMaterial({color:l.accent,transparent:true,opacity:.94}));
  l.curve.frustumCulled=false;curveRoot.add(l.curve);
}
// Dashed guide lines make the propagation direction clear.
for(const l of lanes){
  box(structure,[1.08,.002,.003],[0,.066,l.z],basic('#b8dbec',.23));
  for(let i=0;i<10;i++){
    const x=-.49+i*.105;
    box(structure,[.002,.003,.027],[x,.038,l.z],basic(l.accent,.28));
  }
}
const leadingMarkers=[];
for(const l of lanes){
 const m=new THREE.Mesh(new THREE.TorusGeometry(.075,.0023,5,48),basic(l.accent,.32));
 m.rotation.y=Math.PI/2;m.scale.y=.8;curveRoot.add(m);leadingMarkers.push(m);
}

function physics(x,t){
  // Readable slow-time and simplified wavelength: not real propagation metres or speed.
  const visualF=2.0;
  const df=(st.delta)*.095;
  const spatialA=3.2;
  const spatialB=spatialA*(440+st.delta)/440;
  const thA=2*Math.PI*(spatialA*x-visualF*t);
  const thB=2*Math.PI*(spatialB*x-(visualF+df)*t)+st.phase*Math.PI/180;
  const uA=Math.sin(thA),uB=st.amplitude*Math.sin(thB);
  const pA=-Math.cos(thA),pB=-st.amplitude*Math.cos(thB);
  return {uA,uB,uSum:uA+uB,pA,pB,pSum:pA+pB};
}
function animate3d(){
  for(let li=0;li<lanes.length;li++){
    const l=lanes[li],inst=l.instanced;
    lowColor.set(l.base);highColor.set(l.accent);
    for(let i=0;i<visualN;i++){
      const m=meta[i],p=physics(m.u,st.t);
      const u=li===0?p.uA:li===1?p.uB:p.uSum;
      const pressure=li===0?p.pA:li===1?p.pB:p.pSum;
      dummy.position.set(xMin+m.u*xSpan+.012*u,.105+m.y-.109,l.z+m.z);
      dummy.scale.setScalar((li===2?.0072:.0064)*(1+.12*Math.max(0,pressure)));
      dummy.rotation.set(0,0,0);dummy.updateMatrix();
      inst.setMatrixAt(i,dummy.matrix);
      const strength=Math.min(1,Math.max(0,pressure/2+.28));
      color.copy(lowColor).lerp(highColor,strength);
      inst.setColorAt(i,color);
    }
    inst.instanceMatrix.needsUpdate=true;
    if(inst.instanceColor)inst.instanceColor.needsUpdate=true;
    for(let i=0;i<Nx;i++){
      const u=i/(Nx-1),p=physics(u,st.t);
      const pressure=li===0?p.pA:li===1?p.pB:p.pSum;
      l.position[3*i]=xMin+u*xSpan;
      l.position[3*i+1]=.279+.024*pressure;
      l.position[3*i+2]=l.z;
    }
    l.geometry.attributes.position.needsUpdate=true;
    const marker=leadingMarkers[li];
    marker.position.set(xMin+(st.t*.19%1)*xSpan,.19,l.z);
    marker.material.opacity=.19+.12*(1+Math.sin(st.t*3+li));
  }
}

// Canvas chart displays pressure signals at one fixed observation point over time.
const chart=$('#signal-chart'),ctx=chart.getContext('2d');
function drawChart(){
  if(panel.hidden)return;
  const W=chart.width,H=chart.height;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#0b1d2e';ctx.fillRect(0,0,W,H);
  const centers=[47,118,193];
  for(const y of centers){
    ctx.strokeStyle='rgba(180,211,226,.15)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();
  }
  const lines=[['#65dfff',0],['#ffb56d',1],['#68ffc2',2]];
  for(const [c,index] of lines){
    ctx.beginPath();ctx.strokeStyle=c;ctx.lineWidth=index===2?3:2.3;
    for(let i=0;i<W;i++){
      const x=i/(W-1),time=st.t-4.7*(1-x);
      const phi=st.phase*Math.PI/180;
      const A=Math.sin(2*Math.PI*2*time);
      const B=st.amplitude*Math.sin(2*Math.PI*(2+st.delta*.095)*time+phi);
      const v=index===0?A:index===1?B:A+B;
      const px=i,py=centers[index]-v*(index===2?23:25);
      if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
    }
    ctx.stroke();
  }
  ctx.fillStyle='rgba(210,235,245,.65)';ctx.font='bold 21px sans-serif';
  for(const [s,y] of [['A',23],['B',96],['A+B',168]])ctx.fillText(s,13,y);
}
// Interactive wave alignment: wave B is displaced in wavelength fractions.
// Changing the alignment changes the phase of signal B everywhere (3D + charts).
const dragCanvas=$('#wave-drag-chart');
const dragCtx=dragCanvas.getContext('2d');
const beatCanvas=$('#beat-chart');
const beatCtx=beatCanvas.getContext('2d');
const waveN=3.0; // exactly three schematic wavelengths across the chart
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function setWaveShift(cycles){
  st.shiftCycles=clamp(cycles,-.5,.5);
  st.phase=((Math.round(-st.shiftCycles*360)%360)+360)%360;
  $('#phase-slider').value=st.phase;
  updateUI();
  drawDragChart();
}
function updateDragStatus(){
  const phaseRad=st.phase*Math.PI/180;
  let description;
  if(st.delta>0){
    description=`Schwebung: ${st.delta} Verstärkungsmaxima pro Sekunde (in Echtzeit)`;
  }else if(Math.abs(st.amplitude-1)<.015 && Math.abs(Math.cos(phaseRad)+1)<.03){
    description='Destruktive Interferenz · vollständige Auslöschung';
  }else if(Math.abs(st.amplitude-1)<.015 && Math.cos(phaseRad)>.97){
    description='Konstruktive Interferenz · maximale Addition';
  }else{
    description='Teilweise Verstärkung oder Abschwächung';
  }
  $('#drag-state-title').textContent=description;
  const shift=st.shiftCycles;
  $('#drag-shift-value').textContent=`Verschiebung: ${shift>0?'+':''}${shift.toFixed(2).replace('.',',')} λ · Phase ${st.phase}°`;
  $('#drag-current').textContent=st.delta>0?'Schwebung':`${Math.abs(shift).toFixed(2).replace('.',',')} λ`;
  $('#beat-demo').hidden=st.delta<=0;
  $('#beat-caption').textContent=`440 + ${440+st.delta} Hz · ${st.delta} Schwebungen/s`;
}
let dragState=null;
function startWaveDrag(e){
  if(e.button!==undefined && e.button!==0)return;
  e.preventDefault();e.stopPropagation();
  const rect=dragCanvas.getBoundingClientRect();
  dragState={id:e.pointerId,x:e.clientX,shift:st.shiftCycles,width:rect.width};
  dragCanvas.setPointerCapture(e.pointerId);
  dragCanvas.classList.add('dragging');
}
function moveWaveDrag(e){
  if(!dragState || e.pointerId!==dragState.id)return;
  e.preventDefault();e.stopPropagation();
  // One on-screen wavelength is width/3; sliding B half a wavelength is width/6.
  const dx=e.clientX-dragState.x;
  setWaveShift(dragState.shift+dx/dragState.width*waveN);
}
function endWaveDrag(e){
  if(!dragState || e.pointerId!==dragState.id)return;
  dragState=null;dragCanvas.classList.remove('dragging');
}
dragCanvas.addEventListener('pointerdown',startWaveDrag);
dragCanvas.addEventListener('pointermove',moveWaveDrag);
dragCanvas.addEventListener('pointerup',endWaveDrag);
dragCanvas.addEventListener('pointercancel',endWaveDrag);
dragCanvas.addEventListener('lostpointercapture',()=>{dragState=null;dragCanvas.classList.remove('dragging');});
$('#snap-add').addEventListener('click',()=>{st.delta=0;st.amplitude=1;$('#delta-slider').value=0;$('#amplitude-slider').value=100;setWaveShift(0);});
$('#snap-cancel').addEventListener('click',()=>{st.delta=0;st.amplitude=1;$('#delta-slider').value=0;$('#amplitude-slider').value=100;setWaveShift(.5);});
$('#snap-beats').addEventListener('click',()=>{setMode('beats');drawBeatChart();});
function drawDragChart(){
  if(panel.hidden || !$('#menu-drag').open)return;
  const w=dragCanvas.width,h=dragCanvas.height;
  const g=dragCtx;
  g.clearRect(0,0,w,h);g.fillStyle='#081c2b';g.fillRect(0,0,w,h);
  const left=26,right=w-20,span=right-left;
  const topY=98,bottomY=245;
  g.font='600 18px system-ui';g.fillStyle='#cce7ee';
  g.fillText('Wellen A + B · aufeinandergelegt',left,23);
  g.fillText('Resultierende Druckwelle A + B',left,182);
  for(const y of [topY,bottomY]){
    g.strokeStyle='#8caebc45';g.lineWidth=2;g.beginPath();g.moveTo(left,y);g.lineTo(right,y);g.stroke();
  }
  // Vertical dotted guides make translation of peaks apparent.
  g.setLineDash([4,7]);g.strokeStyle='#7ca3b233';g.lineWidth=1;
  for(let i=0;i<=waveN*2;i++){
    let x=left+(i/(waveN*2))*span;
    g.beginPath();g.moveTo(x,30);g.lineTo(x,h-10);g.stroke();
  }
  g.setLineDash([]);
  const offset=st.shiftCycles;
  const phi=-2*Math.PI*offset;
  const amp=Math.min(1.5,st.amplitude);
  const carrierMove=st.paused?0:st.t*.12;
  const beatPhase=-2*Math.PI*(st.delta*.095)*st.t;
  function trace(col,y,mag,func,width=4){
    g.strokeStyle=col;g.lineWidth=width;g.lineCap='round';g.beginPath();
    for(let i=0;i<=720;i++){
      const x=left+i/720*span;
      const u=i/720;
      const v=func(u);
      if(i===0)g.moveTo(x,y-v*mag);else g.lineTo(x,y-v*mag);
    }
    g.stroke();
  }
  const calcA=u=>Math.sin(2*Math.PI*waveN*(u-carrierMove));
  const calcB=u=>amp*Math.sin(2*Math.PI*(waveN*(440+st.delta)/440)*(u-carrierMove)+phi+beatPhase);
  trace('#60dfff',topY,43,calcA,4.5);
  trace('#ffb56d',topY,43,calcB,4.5);
  trace('#67ffc1',bottomY,31,u=>calcA(u)+calcB(u),5);
  // Legend integrated into canvas (mobile friendly).
  g.fillStyle='#60dfff';g.fillRect(right-178,13,15,4);
  g.fillStyle='#d3e6ed';g.font='15px system-ui';g.fillText('A',right-158,19);
  g.fillStyle='#ffb56d';g.fillRect(right-115,13,15,4);
  g.fillStyle='#d3e6ed';g.fillText('B ↔',right-95,19);
  g.font='14px system-ui';g.fillStyle='#b6d4df';g.fillText('← ziehen →',right-120,153);
}
function drawBeatChart(){
  if(panel.hidden || $('#beat-demo').hidden || !$('#menu-drag').open)return;
  const g=beatCtx,w=beatCanvas.width,h=beatCanvas.height;
  g.clearRect(0,0,w,h);g.fillStyle='#081c2b';g.fillRect(0,0,w,h);
  const center=h/2;
  g.strokeStyle='#9bb3bf44';g.lineWidth=1;g.beginPath();g.moveTo(0,center);g.lineTo(w,center);g.stroke();
  // Didactic slow-time version of the analytic two-tone amplitude envelope.
  // Abs-value envelope maxima occur at the beat frequency Δf.
  const slowDelta=st.delta*.14;
  const carrier=16;
  function env(x){
    const relative=2*Math.PI*slowDelta*(x*3.4+st.t);
    return Math.sqrt(1+st.amplitude**2+2*st.amplitude*Math.cos(relative));
  }
  g.fillStyle='rgba(94,226,186,.13)';g.beginPath();
  for(let i=0;i<=w;i++){let e=env(i/w)*32; if(i===0)g.moveTo(i,center-e);else g.lineTo(i,center-e);}
  for(let i=w;i>=0;i--){let e=env(i/w)*32;g.lineTo(i,center+e);}
  g.closePath();g.fill();
  for(const side of [-1,1]){
    g.strokeStyle='#9e85ff';g.lineWidth=2.5;g.beginPath();
    for(let i=0;i<=w;i++){
      const x=i/w,amplitude=env(x)*32;
      const y=center+side*amplitude;
      if(i===0)g.moveTo(i,y);else g.lineTo(i,y);
    }
    g.stroke();
  }
  g.strokeStyle='#6affe0';g.lineWidth=2.6;g.beginPath();
  for(let i=0;i<=w;i++){
    const x=i/w;
    const theta=2*Math.PI*carrier*(x*3.4+st.t*.38);
    const sum=Math.sin(theta)+st.amplitude*Math.sin(theta+2*Math.PI*slowDelta*(x*3.4+st.t));
    const y=center-32*sum;
    if(i===0)g.moveTo(i,y);else g.lineTo(i,y);
  }
  g.stroke();
}
function setMode(mode){
  if(!Modes[mode])return;
  st.mode=mode;
  const d=Modes[mode];st.phase=d.phase;st.amplitude=d.amplitude;st.delta=d.delta;st.t=0;
  // Presets set a consistent visible shift; manual dragging may use +/- 1/2 λ.
  st.shiftCycles = st.phase === 180 ? .5 : 0;
  $('#phase-slider').value=st.phase;
  $('#amplitude-slider').value=Math.round(st.amplitude*100);
  $('#delta-slider').value=st.delta;
  updateUI();
}
function updateUI(){
  const m=Modes[st.mode];
  const custom = st.phase !== m.phase || Math.abs(st.amplitude-m.amplitude)>0.001 || st.delta !== m.delta;
  $('#phase-value').textContent=`${st.phase}°`;
  $('#amplitude-value').textContent=`${Math.round(st.amplitude*100)} %`;
  $('#delta-value').textContent=`${st.delta} Hz`;
  $('#effect-current').textContent=st.delta>0?'Schwebung':(custom?'Eigene Einstellung':m.name);
  $('#signal-current').textContent=`440 + ${440+st.delta} Hz`;
  $('#metric-frequency-b').textContent=`${fmt(440+st.delta)} Hz`;
  $('#metric-beat').textContent=`${st.delta} Hz`;
  $('#model-current').textContent=`${Math.round(st.scale*100)} % · ${st.rotation}°`;
  $('#size-value').textContent=`${Math.round(st.scale*100)} %`;
  $('#rotation-value').textContent=`${st.rotation}°`;
  $('#play-pause').textContent=st.paused?'▶ Weiter':'Ⅱ Pause';
  $('#slow-toggle').classList.toggle('active',st.slow);
  $('#info-title').textContent=custom?'Freie Wellenüberlagerung':m.title;
  $('#info-text').textContent=custom
    ? `Beide Schalldrücke addieren sich zu jedem Zeitpunkt. Welle A hat 440 Hz, Welle B ${440+st.delta} Hz. Die Phasenverschiebung beträgt ${st.phase}°, die Amplitude B ${Math.round(st.amplitude*100)} %. ${st.delta?'Die relativen Phasen ändern sich wegen des Frequenzunterschieds fortlaufend.':'Bei gleichen Frequenzen ist die Phasendifferenz konstant.'}`
    : m.description;
  $('#scene-label').textContent=`${st.delta>0?'SCHWEBUNG':custom?'INTERFERENZ':m.name.toUpperCase()} · WELLE A + WELLE B`;
  updateDragStatus();
  for(const btn of document.querySelectorAll('[data-mode]'))btn.classList.toggle('active',!custom&&btn.dataset.mode===st.mode);
  contentRoot.scale.setScalar(st.scale);
  contentRoot.rotation.y=st.rotation*Math.PI/180;
  // The free sliders can depart from the selected preset; the label is still a preset reference.
}
for(const btn of document.querySelectorAll('[data-mode]'))btn.addEventListener('click',()=>setMode(btn.dataset.mode));
$('#phase-slider').addEventListener('input',e=>{
  st.phase=Number(e.target.value);
  // Same physical phase for +/- half a wavelength; use the shorter displacement.
  st.shiftCycles=st.phase<=180?-st.phase/360:(360-st.phase)/360;
  updateUI();
});
$('#amplitude-slider').addEventListener('input',e=>{st.amplitude=Number(e.target.value)/100;updateUI();});
$('#delta-slider').addEventListener('input',e=>{st.delta=Number(e.target.value);updateUI();drawBeatChart();});
$('#size-slider').addEventListener('input',e=>{st.scale=Number(e.target.value)/100;updateUI();});
$('#rotation-slider').addEventListener('input',e=>{st.rotation=Number(e.target.value);updateUI();});
$('#play-pause').addEventListener('click',()=>{st.paused=!st.paused;updateUI();});
$('#slow-toggle').addEventListener('click',()=>{st.slow=!st.slow;updateUI();});
$('#info-close').addEventListener('click',()=>{$('.info-box').hidden=true;$('#info-show').hidden=false;});
$('#info-show').addEventListener('click',()=>{$('.info-box').hidden=false;$('#info-show').hidden=true;});

// WebXR hit-test placement uses the same proven structure as Acoustic Physics 01.
const reticle=new THREE.Mesh(new THREE.RingGeometry(.075,.094,52).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#65ffc2',side:THREE.DoubleSide,depthTest:false}));
reticle.matrixAutoUpdate=false;reticle.visible=false;scene.add(reticle);
let placed=false,hitTestSource=null,requestingHitTest=false;
const controller=renderer.xr.getController(0);scene.add(controller);
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
  setStatus('Wellenmodell platziert');updatePlaceUI();
}
controller.addEventListener('select',place);
$('#place-now').addEventListener('click',e=>{e.stopPropagation();place();});
$('#place-again').addEventListener('click',e=>{e.stopPropagation();resetPlacement();});
const arButton=ARButton.createButton(renderer,{requiredFeatures:['hit-test'],optionalFeatures:['dom-overlay'],domOverlay:{root:$('#overlay')}});
$('#ar-launch').appendChild(arButton);
renderer.xr.addEventListener('sessionstart',()=>{
  document.body.classList.add('in-xr');scene.background=null;orbit.enabled=false;resetPlacement();
  if(!renderer.xr.getSession()?.domOverlayState)setStatus('AR aktiv – Bedienung in dieser Sitzung eventuell ausgeblendet');
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
  }catch(e){setStatus(`Tischerkennung nicht verfügbar: ${e.message}`);}
  finally{requestingHitTest=false;}
}
function reset(){
  st.paused=false;st.slow=false;st.scale=1;st.rotation=0;
  $('#size-slider').value=100;$('#rotation-slider').value=0;
  setMode('addition');
  if(renderer.xr.isPresenting)resetPlacement();
  else{placementRoot.position.set(0,0,0);placementRoot.quaternion.identity();}
  setStatus(renderer.xr.isPresenting?'Tisch anvisieren · grünen Kreis antippen':'3D-Vorschau zurückgesetzt');
}
$('#reset').addEventListener('click',reset);

const clock=new THREE.Clock();
let chartFrames=0;
renderer.setAnimationLoop((_time,frame)=>{
  const dt=Math.min(clock.getDelta(),.05);
  if(!st.paused)st.t+=dt*(st.slow?.35:1);
  animate3d();
  if((++chartFrames)%3===0){drawChart();drawDragChart();drawBeatChart();}
  if(renderer.xr.isPresenting&&frame&&!placed){
    const session=renderer.xr.getSession();if(session)requestHitTest(session);
    if(hitTestSource){
      const hits=frame.getHitTestResults(hitTestSource);
      const rs=renderer.xr.getReferenceSpace();
      if(hits.length&&rs){
        const pose=hits[0].getPose(rs);
        if(pose){reticle.matrix.fromArray(pose.transform.matrix);reticle.visible=true;}else reticle.visible=false;
      }else reticle.visible=false;
    }
    updatePlaceUI();
  }
  if(!renderer.xr.isPresenting)orbit.update();
  renderer.render(scene,camera);
});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);drawChart();drawDragChart();drawBeatChart();});
updateUI();animate3d();drawChart();drawDragChart();drawBeatChart();
if(!navigator.xr)setStatus('WebXR nicht verfügbar · 3D-Vorschau nutzbar');
