import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// RIPLEY FIRE PHYSICS — qualitative, not a calibrated CFD/thermal or emissions model.
// Source: thesis chapter 2.1, combustion, pyrolysis, heat transfer, fire plumes and smoke.
const app = document.querySelector('#app');
app.innerHTML = `
<div id="stage"></div>
<div id="overlay">
  <header class="topbar"><div class="brand"><strong>RIPLEY</strong><small>FIRE PHYSICS · AR DEMONSTRATOR</small></div><div id="status" role="status" aria-live="polite">3D-Vorschau bereit</div></header>
  <div id="gesture-pad" aria-label="Modell mit einem Finger drehen und mit zwei Fingern skalieren"></div>
  <div class="grow"></div>
  <div id="panel-dock"><span id="scene-pill" aria-live="off">Wood Fire · Combustion</span><button id="panel-toggle" type="button" aria-controls="controls-panel" aria-expanded="true">☰ Menü schließen</button></div>
  <section id="controls-panel" aria-label="Fire Physics Steuerung">
    <details class="control-menu" id="menu-fuel"><summary><span>🔥 Brandquelle</span><span class="current" id="fuel-current">Wood Fire</span><span class="arrow">⌄</span></summary><div class="menu-body"><div class="split"><button id="fuel-wood" class="active" type="button">Wood Fire</button><button id="fuel-gas" type="button">Gas Fire</button></div><p class="tiny">Zwei Brandarten aus den Versuchen der Masterarbeit. Die Darstellung ist schematisch.</p></div></details>
    <details class="control-menu" id="menu-steps"><summary><span>♨ Physikalischer Vorgang</span><span class="current" id="step-current">Combustion</span><span class="arrow">⌄</span></summary><div class="menu-body"><div class="grid" id="steps"></div><div class="row" style="justify-content:space-between;margin-top:8px"><button id="prev" type="button">‹ Zurück</button><span id="step-count" style="font-size:11px;color:#a7cabb">2 / 6</span><button id="next" type="button">Weiter ›</button></div></div></details>
    <details class="control-menu" id="menu-view"><summary><span>◉ Ansicht</span><span class="current" id="view-current">Normal</span><span class="arrow">⌄</span></summary><div class="menu-body"><div class="split"><button id="view-normal" class="active" type="button">Normal</button><button id="view-thermal" type="button">Thermal</button></div><div id="thermal-bar" hidden><strong>Qualitative Thermal View · keine Temperaturmessung</strong><div class="gradient"></div><div class="ticks"><span>kühl</span><span>wärmer</span><span>heiß</span></div><p class="tiny" style="margin-bottom:0">Die Gase im Plume sind schematisch visualisiert; eine echte Thermografiekamera misst sie nicht direkt.</p></div></div></details>
    <details class="control-menu" id="menu-transform"><summary><span>⤢ Modellsteuerung</span><span class="current">Größe · Drehung</span><span class="arrow">⌄</span></summary><div class="menu-body"><div class="control"><label for="size"><span>Größe</span><strong id="size-value">100 %</strong></label><input id="size" type="range" min="30" max="250" value="100" step="5"></div><div class="control"><label for="rotation"><span>Drehung</span><strong id="rotation-value">0°</strong></label><input id="rotation" type="range" min="0" max="360" value="0" step="5"></div><p class="hint">Android: Start AR → Tisch anvisieren → grünen Kreis antippen. Danach: mit einem Finger drehen, mit zwei Fingern Größe verändern.</p></div></details>
    <div id="note" role="status"><button id="close-note" type="button" title="Beschreibung ausblenden">×</button><strong id="note-title">Combustion</strong><div id="note-text"></div></div>
    <div class="panel-actions"><button id="show-note" type="button" hidden>ⓘ Erklärung</button><button id="reset" type="button">↺ Reset</button></div>
  </section>
  <div id="ar-place-actions"><button id="place-now" type="button" hidden>◎ Brandquelle hier platzieren</button><button id="place-again" type="button" hidden>↺ Neu platzieren</button></div>
  <div id="ar-launch"></div>
</div>
<a id="demo-nav" href="../index.html">← RIPLEY-Übersicht</a>`;

const $=s=>document.querySelector(s);
const setStatus=s=>{$('#status').textContent=s;};
// Vollständig einklappbares Steuerpanel; auf Touch-Geräten startet es platzsparend.
let panelOpen = !window.matchMedia('(pointer: coarse)').matches;
function setPanelOpen(open){
  panelOpen=Boolean(open);
  $('#controls-panel').hidden=!panelOpen;
  $('#panel-toggle').setAttribute('aria-expanded',String(panelOpen));
  $('#panel-toggle').textContent=panelOpen?'✕ Menü schließen':'☰ Menü';
  $('#scene-pill').hidden=panelOpen;
}
$('#panel-toggle').addEventListener('click',()=>setPanelOpen(!panelOpen));
setPanelOpen(panelOpen);
for(const menu of document.querySelectorAll('details.control-menu'))menu.addEventListener('toggle',()=>{if(menu.open)for(const other of document.querySelectorAll('details.control-menu'))if(other!==menu)other.open=false;});
const states=[
  {id:'initial',name:'Ausgangszustand',wood:'Holz ohne Flamme: Ausgangstemperatur und unveränderte Struktur.',gas:'Gasbrenner vor Zündung: Noch keine Flamme oder aufsteigender Heißgasstrom.'},
  {id:'combustion',name:'Combustion',wood:'Flüchtige Pyrolysegase mischen sich mit Sauerstoff und verbrennen oberhalb des Holzes.',gas:'Gasförmiger Brennstoff reagiert mit Sauerstoff. Die Flamme zeigt die exotherme Gasphasenreaktion.'},
  {id:'pyrolysis',name:'Pyrolysis',wood:'Das erhitzte Holz zersetzt sich: Flüchtige Gase steigen auf und eine verkohlte Schicht entsteht. Pyrolyse ist nicht gleich Flammenverbrennung.',gas:'Für bereits gasförmig zugeführten Brennstoff ist keine Pyrolyse eines festen Brennstoffs nötig. Es wird deshalb keine Holzpyrolyse simuliert.'},
  {id:'heat',name:'Heat Transfer',wood:'Wärmestrahlung, Konvektion und Wärmeleitung wirken zusammen. Der Wärmerückfluss auf das Holz unterstützt weitere Pyrolyse.',gas:'Strahlung der Flamme, aufsteigende Heißgase und Wärmeleitung in der Brennerstruktur transportieren Energie.'},
  {id:'plume',name:'Fire Plume',wood:'Auftrieb lässt die heißen Verbrennungsgase steigen. Seitlich strömt kühlere Umgebungsluft ein (Entrainment).',gas:'Die aufsteigenden heißen Gase bilden einen Plume. Eingemischte Umgebungsluft führt zu räumlich variierender Temperatur und Strömung.'},
  {id:'smoke',name:'Smoke',wood:'Partikel und gasförmige Produkte aus Pyrolyse und Verbrennung werden im Plume transportiert. Die Rauchmenge hängt von den Bedingungen ab.',gas:'Bei gut durchmischter, sauberer Gasverbrennung ist wenig sichtbarer Rußrauch zu erwarten. Es entstehen trotzdem gasförmige Verbrennungsprodukte.'}
];
const state={fuel:'wood',step:'combustion',view:'normal',scale:1,angle:0};
const scene=new THREE.Scene();scene.background=new THREE.Color('#172637');
scene.add(new THREE.HemisphereLight(0xe1f3ff,0x536478,2.0));
const sun=new THREE.DirectionalLight(0xffffff,2.4);sun.position.set(1,2.5,1.5);scene.add(sun);
const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,0.01,30);
camera.position.set(0.8,0.57,0.95);camera.lookAt(0,0.16,0);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.xr.enabled=true;renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;$('#stage').appendChild(renderer.domElement);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.target.set(0,0.17,0);orbit.enableDamping=true;
// Move placementRoot ONLY when a verified hit-test pose is selected. Never parent it to XR camera.
const placementRoot=new THREE.Group();scene.add(placementRoot);
const contentRoot=new THREE.Group();placementRoot.add(contentRoot);
const modelRoot=new THREE.Group();contentRoot.add(modelRoot);
const effects=new THREE.Group();contentRoot.add(effects);
const labelRoot=new THREE.Group();contentRoot.add(labelRoot);
const woodRoot=new THREE.Group();modelRoot.add(woodRoot);
const gasRoot=new THREE.Group();modelRoot.add(gasRoot);
const thermalMat={};const thermalPalette={base:'#25368b',platform:'#2947ad',metal:'#3b6fba',fuel:'#3484bd',char:'#8f3bb2',hot:'#fff4b8',warm:'#ff7c24',plume:'#f6a62d'};
for(const [k,v] of Object.entries(thermalPalette))thermalMat[k]=new THREE.MeshBasicMaterial({color:v,side:THREE.DoubleSide});
const material=(color,opts={})=>new THREE.MeshStandardMaterial({color,roughness:.76,...opts});
const basic=(color,opacity=1)=>new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:false,side:THREE.DoubleSide});
function mesh(parent,geometry,mat,pos,zone='base'){const object=new THREE.Mesh(geometry,mat);object.position.set(...pos);object.userData.normalMaterial=mat;object.userData.zone=zone;parent.add(object);return object;}
const box=(p,d,pos,m,zone)=>mesh(p,new THREE.BoxGeometry(...d),m,pos,zone);
const cyl=(p,r1,r2,h,pos,m,zone)=>mesh(p,new THREE.CylinderGeometry(r1,r2,h,24),m,pos,zone);
// Static presentation base, 55 cm footprint. A floor reference helps user perceive scale.
cyl(modelRoot,.265,.275,.022,[0,.011,0],material('#273746',{metalness:.45}),'platform');
cyl(modelRoot,.247,.247,.004,[0,.024,0],material('#8a98a8',{metalness:.35}),'metal');
// Wood as three tilted cylinders, with a charred region and embers.
const woodNormal=material('#98633d');
const logA=cyl(woodRoot,.055,.059,.27,[-.035,.08,0],woodNormal,'fuel');logA.rotation.z=Math.PI/2.3;
const logB=cyl(woodRoot,.05,.055,.29,[.015,.08,.018],woodNormal,'fuel');logB.rotation.z=-Math.PI/2.45;logB.rotation.y=.5;
const logC=cyl(woodRoot,.046,.05,.22,[0,.076,-.055],material('#68462e'),'fuel');logC.rotation.x=.45;logC.rotation.z=Math.PI/2.3;
for(let i=0;i<6;i++){const ember=mesh(woodRoot,new THREE.SphereGeometry(.012,10,8),basic('#f9631e'),[(i-2.5)*.037,.055,-.032+(i%2)*.047],'hot');ember.userData.ember=true;}
const charLayer=cyl(woodRoot,.047,.049,.23,[-.035,.089,.005],material('#1d171b'),'char');charLayer.rotation.copy(logA.rotation);
// Gas burner: a stable metallic base and a perforated circular burner head.
cyl(gasRoot,.085,.1,.055,[0,.057,0],material('#7e8c99',{metalness:.7,roughness:.34}),'metal');
cyl(gasRoot,.064,.064,.012,[0,.094,0],material('#2b323a',{metalness:.6}),'metal');
for(let i=0;i<12;i++){const phi=i*2*Math.PI/12;mesh(gasRoot,new THREE.SphereGeometry(.0045,7,6),material('#a4b5c4'),[.048*Math.cos(phi),.102,.048*Math.sin(phi)],'metal');}
const flameRoot=new THREE.Group();effects.add(flameRoot);
const smokeRoot=new THREE.Group();effects.add(smokeRoot);
const plumeRoot=new THREE.Group();effects.add(plumeRoot);
const heatRoot=new THREE.Group();effects.add(heatRoot);
const pyroRoot=new THREE.Group();effects.add(pyroRoot);
const glow=new THREE.PointLight('#ff682c',0.9,.55);glow.position.set(0,.18,0);effects.add(glow);
// Shapes are illustrative: fluid turbulence, combustion chemistry and temperatures are NOT simulated.
const particleMaterials=[];
function particle(parent,x,y,z,size,color,opacity,type,index){const m=basic(color,opacity);particleMaterials.push(m);const obj=mesh(parent,new THREE.SphereGeometry(size,10,8),m,[x,y,z],'hot');obj.userData={effect:type,index,normalMaterial:m,zone:'hot',baseOpacity:opacity};return obj;}
const flames=[];
for(let i=0;i<12;i++){
 const a=i*2.39996,r=.01+.026*(i%4)/3;
 const flame=mesh(flameRoot,new THREE.ConeGeometry(.022+(i%3)*.003,.12+(i%5)*.024,10),basic('#ff9c29',.62),[Math.cos(a)*r,.17+(.018*(i%3)),Math.sin(a)*r],'hot');flame.userData.effect='flame';flame.userData.index=i;flames.push(flame);
}
const woodSmoke=[];
for(let i=0;i<24;i++)woodSmoke.push(particle(smokeRoot,0,.15,0,.018+(i%4)*.003,'#92979b',.22,'smoke',i));
const pyro=[];
for(let i=0;i<18;i++)pyro.push(particle(pyroRoot,0,.09,0,.006+(i%4)*.0015,'#c8e8e3',.65,'pyro',i));
const plumeParticles=[];
for(let i=0;i<40;i++)plumeParticles.push(particle(plumeRoot,0,.16,0,.009+(i%5)*.002,'#ffb347',.29,'plume',i));
const arrows=[];
for(let i=0;i<12;i++){
 const m=basic('#65cfe9',.82);const ar=new THREE.Group();
 const shaft=mesh(ar,new THREE.CylinderGeometry(.0025,.0025,.052,7),m,[0,0,0],'hot');shaft.userData.effect='decoration';
 const tip=mesh(ar,new THREE.ConeGeometry(.010,.022,9),m,[0,.037,0],'hot');tip.userData.effect='decoration';
 ar.userData.index=i;plumeRoot.add(ar);arrows.push(ar);
}
const radiation=[];
for(let i=0;i<5;i++){
 const ring=mesh(heatRoot,new THREE.TorusGeometry(.085+i*.044,.0028,6,70,Math.PI*1.8),basic('#f7bd5d',.67),[0,.175,0],'warm');ring.rotation.x=Math.PI/2;ring.userData.effect='radiation';ring.userData.index=i;radiation.push(ring);
}
const conduct=[];
for(let i=0;i<10;i++)conduct.push(particle(heatRoot,0,.06,0,.007,'#ff4f2d',.89,'conduction',i));
const labelGroups=[];
function label(text,pos,color='#e6f6ff'){
 const canvas=document.createElement('canvas');canvas.width=448;canvas.height=88;const ctx=canvas.getContext('2d');ctx.fillStyle='rgba(10,25,37,.91)';ctx.beginPath();ctx.roundRect(4,4,440,80,16);ctx.fill();ctx.strokeStyle='#76f3b0';ctx.lineWidth=3;ctx.stroke();ctx.font='bold 30px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,224,46);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,transparent:true}));sprite.scale.set(.24,.047,1);sprite.position.set(...pos);labelRoot.add(sprite);labelGroups.push(sprite);return sprite;
}
const mainLabel=label('GAS-PHASE COMBUSTION',[0,.46,.01]);
const noteLabel=label('PYROLYSIS ZONE',[-.12,.16,.025]);
const plumeLabel=label('HOT GASES / PLUME',[.07,.49,0]);
const airLabel=label('AMBIENT AIR ENTRAINMENT',[-.13,.31,0]);
const heatLabel=label('RADIATION · CONVECTION · CONDUCTION',[0,.43,0]);
const smokeLabel=label('SMOKE TRANSPORT',[0,.52,.01]);
// The normal and thermal material passes never replace or reparent the model.
const thermalOriginal=new WeakMap();
function colorize(){
  modelRoot.traverse(obj=>{if(!obj.isMesh)return;if(!thermalOriginal.has(obj))thermalOriginal.set(obj,obj.material);
    if(state.view==='normal'){obj.material=thermalOriginal.get(obj);return;}
    const zone=obj.userData.zone||'base';
    let thermalZone=zone;
    if(zone==='fuel')thermalZone=state.fuel==='wood'&&state.step==='pyrolysis'?'warm':'fuel';
    if(zone==='char')thermalZone=state.fuel==='wood'&&state.step!=='initial'?'warm':'char';
    if(zone==='metal')thermalZone=state.fuel==='gas'&&state.step==='heat'?'warm':'metal';
    obj.material=thermalMat[thermalZone]||thermalMat.base;
  });
  for(const flame of flames){flame.material.color.set(state.view==='thermal'?'#fff1bc':(state.fuel==='gas'?'#3b9fff':'#ff9928'));}
  for(const p of plumeParticles)p.material.color.set(state.view==='thermal'?'#fdd153':'#f7a947');
}
function updateLabels(){mainLabel.visible=state.step==='combustion';noteLabel.visible=state.step==='pyrolysis'&&state.fuel==='wood';plumeLabel.visible=state.step==='plume';airLabel.visible=state.step==='plume';heatLabel.visible=state.step==='heat';smokeLabel.visible=state.step==='smoke';}
function updateScene(){
 const stage=states.find(x=>x.id===state.step),initial=state.step==='initial';
 woodRoot.visible=state.fuel==='wood';gasRoot.visible=state.fuel==='gas';
 flameRoot.visible=['combustion','heat','plume','smoke'].includes(state.step);
 smokeRoot.visible=state.step==='smoke'&&state.fuel==='wood';
 pyroRoot.visible=state.step==='pyrolysis'&&state.fuel==='wood';
 plumeRoot.visible=state.step==='plume'||state.step==='smoke';
 heatRoot.visible=state.step==='heat';
 glow.intensity=initial?0:state.fuel==='gas'?.45:.85;
 $('#fuel-current').textContent=state.fuel==='wood'?'Wood Fire':'Gas Fire';$('#step-current').textContent=stage.name;$('#view-current').textContent=state.view==='thermal'?'Thermal':'Normal';
  $('#scene-pill').textContent=`${state.fuel==='wood'?'Wood Fire':'Gas Fire'} · ${stage.name}`;
 $('#fuel-wood').classList.toggle('active',state.fuel==='wood');$('#fuel-gas').classList.toggle('active',state.fuel==='gas');
 $('#view-normal').classList.toggle('active',state.view==='normal');$('#view-thermal').classList.toggle('active',state.view==='thermal');
 $('#thermal-bar').hidden=state.view!=='thermal';
 for(const b of $('#steps').children)b.classList.toggle('active',b.dataset.step===state.step);
 const idx=states.findIndex(x=>x.id===state.step);$('#step-count').textContent=`${idx+1} / ${states.length}`;$('#prev').disabled=idx===0;$('#next').disabled=idx===states.length-1;
 $('#note-title').textContent=stage.name;$('#note-text').textContent=state.fuel==='gas'?stage.gas:stage.wood;
 $('#note').hidden=false;$('#show-note').hidden=true;
 updateLabels();colorize();
}
for(const [id,v] of [['fuel-wood','wood'],['fuel-gas','gas']])$('#'+id).addEventListener('click',()=>{state.fuel=v;updateScene();});
for(const [id,v] of [['view-normal','normal'],['view-thermal','thermal']])$('#'+id).addEventListener('click',()=>{state.view=v;updateScene();});
for(const s of states){const b=document.createElement('button');b.type='button';b.dataset.step=s.id;b.textContent=s.name;b.addEventListener('click',()=>{state.step=s.id;updateScene();});$('#steps').appendChild(b);}
$('#prev').addEventListener('click',()=>{const i=states.findIndex(s=>s.id===state.step);state.step=states[Math.max(0,i-1)].id;updateScene();});
$('#next').addEventListener('click',()=>{const i=states.findIndex(s=>s.id===state.step);state.step=states[Math.min(states.length-1,i+1)].id;updateScene();});
$('#close-note').addEventListener('click',()=>{$('#note').hidden=true;$('#show-note').hidden=false;});
$('#show-note').addEventListener('click',()=>{$('#note').hidden=false;$('#show-note').hidden=true;});
function updateTransform(){contentRoot.scale.setScalar(state.scale);contentRoot.rotation.y=state.angle*Math.PI/180;$('#size-value').textContent=Math.round(state.scale*100)+' %';$('#rotation-value').textContent=Math.round(state.angle)+'°';$('#size').value=Math.round(state.scale*100);$('#rotation').value=state.angle;}
$('#size').addEventListener('input',e=>{state.scale=Number(e.target.value)/100;updateTransform();});
$('#rotation').addEventListener('input',e=>{state.angle=Number(e.target.value);updateTransform();});

// Touch-Gesten für dasselbe 3D-Modell: ein Finger dreht, zwei Finger skalieren.
// In der 3D-Vorschau nehmen wir Touch-Ereignisse VOR OrbitControls entgegen;
// Mausbedienung/OrbitControls bleiben damit erhalten. Im AR-Modus verwendet
// das platzierte Modell das transparente WebXR-DOM-Overlay-Gestenfeld.
const activeTouches=new Map();
let pinchReference=null;
function clearGesture(){activeTouches.clear();pinchReference=null;}
const distanceBetweenTouches=()=>{
  const [a,b]=[...activeTouches.values()];
  return Math.hypot(a.x-b.x,a.y-b.y);
};
function gesturePointerDown(e){
  if(e.pointerType!=='touch')return;
  if(e.currentTarget===renderer.domElement&&renderer.xr.isPresenting)return;
  if(e.currentTarget===$('#gesture-pad')&&(!renderer.xr.isPresenting||!placed))return;
  e.preventDefault();e.stopImmediatePropagation();
  activeTouches.set(e.pointerId,{x:e.clientX,y:e.clientY});
  try{e.currentTarget.setPointerCapture(e.pointerId);}catch(_){}
  if(activeTouches.size>=2){
    pinchReference={distance:Math.max(distanceBetweenTouches(),10),scale:state.scale};
  }
}
function gesturePointerMove(e){
  if(!activeTouches.has(e.pointerId))return;
  e.preventDefault();e.stopImmediatePropagation();
  const old=activeTouches.get(e.pointerId);
  activeTouches.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(activeTouches.size>=2){
    if(!pinchReference)pinchReference={distance:Math.max(distanceBetweenTouches(),10),scale:state.scale};
    const factor=distanceBetweenTouches()/pinchReference.distance;
    state.scale=THREE.MathUtils.clamp(pinchReference.scale*factor,.3,2.5);
    updateTransform();
  }else{
    state.angle=(state.angle+(e.clientX-old.x)*.55+360)%360;
    updateTransform();
  }
}
function gesturePointerEnd(e){
  if(!activeTouches.has(e.pointerId))return;
  e.preventDefault();e.stopImmediatePropagation();
  activeTouches.delete(e.pointerId);
  if(activeTouches.size<2)pinchReference=null;
  if(activeTouches.size===2)pinchReference={distance:Math.max(distanceBetweenTouches(),10),scale:state.scale};
  try{e.currentTarget.releasePointerCapture(e.pointerId);}catch(_){}
}
for(const touchSurface of [renderer.domElement,$('#gesture-pad')]){
  touchSurface.addEventListener('pointerdown',gesturePointerDown,{capture:true});
  touchSurface.addEventListener('pointermove',gesturePointerMove,{capture:true});
  touchSurface.addEventListener('pointerup',gesturePointerEnd,{capture:true});
  touchSurface.addEventListener('pointercancel',gesturePointerEnd,{capture:true});
  touchSurface.addEventListener('lostpointercapture',e=>{activeTouches.delete(e.pointerId);if(activeTouches.size<2)pinchReference=null;},{capture:true});
}
function reset(){state.fuel='wood';state.step='combustion';state.view='normal';state.scale=1;state.angle=0;updateTransform();updateScene();if(renderer.xr.isPresenting)resetPlacement();else{placementRoot.position.set(0,0,0);placementRoot.quaternion.identity();setStatus('3D-Vorschau zurückgesetzt');}}
$('#reset').addEventListener('click',reset);
updateTransform();updateScene();
// WebXR hit-test: placement remains independent from the selected step, fuel and view.
const reticle=new THREE.Mesh(new THREE.RingGeometry(.065,.085,48).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#62ffb9',side:THREE.DoubleSide}));reticle.matrixAutoUpdate=false;reticle.visible=false;scene.add(reticle);
let placed=false,hitTestSource=null,requestingHitTest=false;
// Transparentes Touch-Feld ausschließlich NACH der AR-Platzierung aktivieren:
// davor muss ein normaler Tap weiterhin den grünen Platzierungskreis auswählen können.
function updateGesturePad(){
  const session=renderer.xr.getSession();
  const enabled=renderer.xr.isPresenting&&placed&&Boolean(session?.domOverlayState);
  const pad=$('#gesture-pad');
  const next=enabled?'auto':'none';
  if(pad.style.pointerEvents!==next){pad.style.pointerEvents=next;if(!enabled)clearGesture();}
}
const controller=renderer.xr.getController(0);scene.add(controller);
function updatePlaceButtons(){const ar=renderer.xr.isPresenting;$('#place-now').hidden=!ar||placed||!reticle.visible;$('#place-again').hidden=!ar||!placed;updateGesturePad();}
function resetPlacement(){placed=false;placementRoot.visible=false;reticle.visible=false;setStatus('Tisch anvisieren – grüner Kreis erscheint');updatePlaceButtons();}
function place(){if(!renderer.xr.isPresenting||placed||!reticle.visible)return;placementRoot.position.setFromMatrixPosition(reticle.matrix);placementRoot.quaternion.setFromRotationMatrix(reticle.matrix);placementRoot.visible=true;placed=true;reticle.visible=false;setStatus('Brandquelle platziert');updatePlaceButtons();}
controller.addEventListener('select',place);
$('#place-now').addEventListener('click',e=>{e.stopPropagation();place();});
$('#place-again').addEventListener('click',e=>{e.stopPropagation();resetPlacement();});
$('#overlay').addEventListener('beforexrselect',e=>{if(e.target.closest('button,summary,details,#controls-panel,#panel-dock,#ar-launch,#ar-place-actions,#gesture-pad'))e.preventDefault();});
const arButton=ARButton.createButton(renderer,{requiredFeatures:['hit-test'],optionalFeatures:['dom-overlay'],domOverlay:{root:$('#overlay')}});$('#ar-launch').appendChild(arButton);
renderer.xr.addEventListener('sessionstart',()=>{document.body.classList.add('in-xr');scene.background=null;orbit.enabled=false;setPanelOpen(false);resetPlacement();if(!renderer.xr.getSession()?.domOverlayState)setStatus('AR aktiv; DOM Overlay nicht verfügbar (Steuerung evtl. unsichtbar)');});
renderer.xr.addEventListener('sessionend',()=>{hitTestSource?.cancel();hitTestSource=null;requestingHitTest=false;document.body.classList.remove('in-xr');scene.background=new THREE.Color('#172637');orbit.enabled=true;placed=false;reticle.visible=false;placementRoot.visible=true;placementRoot.position.set(0,0,0);placementRoot.quaternion.identity();updatePlaceButtons();setStatus('3D-Vorschau bereit');});
async function requestHitTest(session){if(hitTestSource||requestingHitTest)return;requestingHitTest=true;try{const viewer=await session.requestReferenceSpace('viewer');if(renderer.xr.getSession()!==session)return;const source=await session.requestHitTestSource({space:viewer});if(renderer.xr.getSession()===session)hitTestSource=source;else source.cancel();}catch(e){setStatus('Flächenerkennung nicht verfügbar: '+e.message);}finally{requestingHitTest=false;}}
const clock=new THREE.Clock();
renderer.setAnimationLoop((_timestamp,frame)=>{
 const delta=Math.min(clock.getDelta(),.05),t=clock.elapsedTime;
 if(renderer.xr.isPresenting&&frame&&!placed){const session=renderer.xr.getSession();if(session)requestHitTest(session);if(hitTestSource){const hits=frame.getHitTestResults(hitTestSource),space=renderer.xr.getReferenceSpace();if(hits.length&&space){const pose=hits[0].getPose(space);if(pose){reticle.matrix.fromArray(pose.transform.matrix);reticle.visible=true;}else reticle.visible=false;}else reticle.visible=false;}updatePlaceButtons();}
 const isWood=state.fuel==='wood';
 for(const flame of flames){const i=flame.userData.index;flame.scale.set(1+Math.sin(t*6+i)*.19,.76+Math.sin(t*8+i*1.3)*.17,1+Math.cos(t*5+i)*.12);flame.position.y=.17+.015*Math.sin(t*8+i);flame.material.color.set(state.view==='thermal'?'#fff1bc':isWood?'#ff9c2d':'#398ffb');}
 for(const ember of woodRoot.children)if(ember.userData.ember)ember.scale.setScalar(.8+Math.sin(t*7+ember.position.x*30)*.22);
 for(const p of pyro){const i=p.userData.index,phase=(t*.26+i/pyro.length)%1,a=i*2.3999;p.position.set(Math.cos(a)*(.04+.02*phase),.11+phase*.2,Math.sin(a)*(.04+.02*phase));p.material.opacity=.65*(1-phase);p.scale.setScalar(.7+phase);}
 for(const p of woodSmoke){const i=p.userData.index,phase=(t*.11+i/woodSmoke.length)%1,a=i*2.3999;p.position.set(Math.cos(a+t*.18)*(.02+phase*.14),.17+phase*.43,Math.sin(a+t*.18)*(.02+phase*.13));p.material.opacity=(.08+.24*(1-phase))*(isWood?1:.05);p.scale.setScalar(.6+phase*1.9);}
 for(const p of plumeParticles){const i=p.userData.index,phase=(t*.14+i/plumeParticles.length)%1,a=i*2.3999,r=.025+phase*.16;p.position.set(Math.cos(a+t*.4)*r,.12+.54*phase,Math.sin(a+t*.3)*r);p.scale.setScalar(.7+phase*1.8);p.material.opacity=.21*(1-phase);}
 for(const a of arrows){const i=a.userData.index,phase=(t*.35+i/arrows.length)%1,az=i*2*Math.PI/arrows.length,r=.14+.02*Math.sin(t+i);a.position.set(r*Math.cos(az)*(1-phase*.6),.09+.36*phase,r*Math.sin(az)*(1-phase*.6));a.rotation.set(0,0,i%2?Math.PI/4:-Math.PI/4);a.scale.setScalar(.8+phase*.2);}
 for(const r of radiation){const i=r.userData.index;r.material.opacity=.25+.45*(1-((t*.4+i/5)%1));}
 for(const p of conduct){const i=p.userData.index,phase=(t*.38+i/conduct.length)%1,a=i*2*Math.PI/conduct.length;p.position.set(.06*Math.cos(a)*phase,.035+.025*(1-phase),.06*Math.sin(a)*phase);p.material.opacity=.7*(1-phase);}
 if(!renderer.xr.isPresenting)orbit.update();renderer.render(scene,camera);
});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
if(!navigator.xr)setStatus('WebXR hier nicht verfügbar – 3D-Vorschau nutzbar');
