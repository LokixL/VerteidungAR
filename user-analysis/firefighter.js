import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {ARButton} from 'three/addons/webxr/ARButton.js';

/**
 * Original procedural, stylized firefighter for an EDUCATIONAL user scenario.
 * The graphic is not a scanned person, certified PPE design or measured heat/smoke field.
 */
export function createFirefighterScene({stage,launchSlot,overlay,onXRStart,onXREnd}) {
  const scene=new THREE.Scene();
  const background=new THREE.Color('#0e2233'); scene.background=background;
  const camera=new THREE.PerspectiveCamera(49,1,.01,100);
  camera.position.set(1.7,1.05,2.5);
  camera.lookAt(0,.68,0);
  scene.add(new THREE.HemisphereLight('#d0f7ff','#283342',2.0));
  const light=new THREE.DirectionalLight('#fff7de',2.65);light.position.set(-1.5,4,3);scene.add(light);
  const side=new THREE.PointLight('#40c1cd',14,4);side.position.set(1.1,.9,-1.2);scene.add(side);

  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.xr.enabled=true;
  stage.append(renderer.domElement);
  stage.dataset.ready='true';
  const orbit=new OrbitControls(camera,renderer.domElement);
  orbit.enableDamping=true;orbit.target.set(0,.68,0);orbit.minDistance=1.65;orbit.maxDistance=4.1;orbit.maxPolarAngle=1.93;

  const placementRoot=new THREE.Group();scene.add(placementRoot);
  const modelRoot=new THREE.Group();placementRoot.add(modelRoot);
  let modelScale=1,rotDeg=0;
  const materials={
    dark:new THREE.MeshStandardMaterial({color:'#1d303f',metalness:.24,roughness:.6}),
    coat:new THREE.MeshStandardMaterial({color:'#263e4b',metalness:.1,roughness:.79}),
    rubber:new THREE.MeshStandardMaterial({color:'#15232a',roughness:.9}),
    steel:new THREE.MeshStandardMaterial({color:'#7ca4a8',metalness:.58,roughness:.4}),
    golden:new THREE.MeshStandardMaterial({color:'#d2b65b',metalness:.32,roughness:.46}),
    tape:new THREE.MeshStandardMaterial({color:'#e5dfac',emissive:'#d3e9c0',emissiveIntensity:.26,roughness:.5}),
    visor:new THREE.MeshPhysicalMaterial({color:'#8cdaf0',transparent:true,opacity:.48,metalness:.16,roughness:.09,side:THREE.DoubleSide,depthWrite:false}),
    mask:new THREE.MeshStandardMaterial({color:'#667f87',metalness:.25,roughness:.52}),
    straps:new THREE.MeshStandardMaterial({color:'#a6ae9b',roughness:.77}),
  };
  const parts={};
  const shape=(geometry,material,parent=modelRoot,x=0,y=0,z=0)=>{
    const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);parent.add(m);return m;
  };
  const block=(size,material,x,y,z)=>shape(new THREE.BoxGeometry(...size),material,modelRoot,x,y,z);
  const cyl=(r1,r2,len,material,x,y,z,seg=14)=>shape(new THREE.CylinderGeometry(r1,r2,len,seg),material,modelRoot,x,y,z);
  // A compact low-poly miniature mounted on a display base.
  shape(new THREE.CylinderGeometry(.47,.5,.045,52),new THREE.MeshStandardMaterial({color:'#133c4c',metalness:.31,roughness:.61}),modelRoot,0,.012,0);
  shape(new THREE.RingGeometry(.37,.39,56).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#6ddac3',transparent:true,opacity:.68,side:THREE.DoubleSide}),modelRoot,0,.036,0);
  for(let i=0;i<24;i++) {
    const a=i*Math.PI*2/24;
    const tick=block([.012,.003,.03],new THREE.MeshBasicMaterial({color:'#5d9ea9',transparent:true,opacity:.7}),Math.sin(a)*.36,.038,Math.cos(a)*.36);
    tick.rotation.y=a;
  }

  // Legs, boots and yellow/reflective PPE striping.
  [-1,1].forEach(side=>{
    const x=side*.12;
    cyl(.082,.071,.33,materials.coat,x,.30,0);
    cyl(.085,.08,.062,materials.golden,x,.145,.005);
    const boot=block([.20,.12,.28],materials.rubber,x,.09,.065);boot.rotation.y=side*.07;
    block([.19,.026,.22],materials.tape,x,.166,.028);
  });
  // Central coat, collar and shoulder profiles.
  const torso=block([.43,.48,.29],materials.coat,0,.72,0);
  torso.geometry.translate(0,-.01,0);
  block([.47,.07,.30],materials.golden,0,.59,0);
  block([.48,.023,.31],materials.tape,0,.612,0);
  block([.47,.023,.31],materials.tape,0,.80,0);
  const seam=block([.018,.43,.012],materials.steel,0,.716,.154);
  [-1,1].forEach(side=>{
    const x=side*.29;
    const shoulder=shape(new THREE.SphereGeometry(.113,14,10),materials.coat,modelRoot,side*.242,.915,0);
    const arm=cyl(.095,.081,.33,materials.coat,x,.73,0);arm.rotation.z=side*.14;
    const cuff=cyl(.085,.08,.055,materials.tape,x+side*.02,.55,0);
    const glove=shape(new THREE.SphereGeometry(.098,12,9),materials.golden.clone(),modelRoot,x+side*.024,.482,.025);
    glove.scale.set(.89,1.08,.9);
    if(side===1)parts.gloveRight=glove;else parts.gloveLeft=glove;
  });
  // Shoulder straps and a compressed-air cylinder on the back (SCBA).
  const tank=cyl(.125,.12,.43,materials.steel,0,.79,-.257);parts.tank=tank;
  cyl(.091,.103,.045,materials.rubber,0,1.00,-.257);
  cyl(.086,.09,.046,materials.rubber,0,.568,-.257);
  for(const s of [-1,1]){
    const strap=block([.055,.41,.052],materials.straps,s*.164,.76,.145);
    strap.rotation.z=-s*.08;
  }
  const hosePoints=[new THREE.Vector3(.075,1.075,-.27),new THREE.Vector3(.18,1.01,-.22),new THREE.Vector3(.19,1.04,.02),new THREE.Vector3(.135,1.073,.23)];
  const hose=shape(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hosePoints),32,.026,8,false),materials.rubber,modelRoot);
  // Neck, face mask, visor, firefighter helmet and reflective helmet rim.
  cyl(.092,.089,.14,materials.rubber,0,1.020,.003);
  const head=shape(new THREE.SphereGeometry(.14,18,14),materials.dark,modelRoot,0,1.15,.035);
  head.scale.set(1,.97,.82);
  const visor=shape(new THREE.SphereGeometry(.134,20,12,0,Math.PI*2,0,Math.PI*.56),materials.visor,modelRoot,0,1.162,.090);
  visor.scale.set(1.04,.95,.60);visor.rotation.x=-.12;
  const mask=shape(new THREE.CylinderGeometry(.066,.079,.097,14),materials.mask,modelRoot,0,1.106,.158);
  mask.rotation.x=Math.PI/2;
  const filter=shape(new THREE.CylinderGeometry(.042,.05,.053,14),materials.rubber,modelRoot,0,1.104,.219);
  filter.rotation.x=Math.PI/2;
  const helmet=shape(new THREE.SphereGeometry(.161,24,15,0,Math.PI*2,0,Math.PI*.61),materials.golden,modelRoot,0,1.205,.018);
  helmet.scale.set(1.18,1.0,1.10);
  const brim=shape(new THREE.CylinderGeometry(.195,.20,.036,25),materials.golden,modelRoot,0,1.223,.015);
  const badge=block([.078,.088,.012],materials.tape,0,1.288,.167);
  badge.rotation.x=-.30;
  // Gently lit nameplate and display podium.
  const tag=block([.25,.052,.008],new THREE.MeshBasicMaterial({color:'#66ccab'}),0,.82,.164);
  const atlas=document.createElement('canvas');atlas.width=420;atlas.height=105;
  const ctx=atlas.getContext('2d');ctx.clearRect(0,0,atlas.width,atlas.height);ctx.textAlign='center';ctx.font='bold 43px system-ui';ctx.fillStyle='#e7fff7';ctx.fillText('FIREFIGHTER',210,65);
  const texture=new THREE.CanvasTexture(atlas);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false}));sprite.position.set(0,.10,.46);sprite.scale.set(.47,.12,1);modelRoot.add(sprite);

  // Spider web in 3D: 8 abstract stations / constraints.
  const webNodePositions=[];const webNodes=[];
  const webMats=[];
  const palette=['#72c7ed','#ff9d60','#a6b1ff','#8bf1c8','#f7d589','#ffb5a0','#daaaff','#8ab9d2'];
  for(let i=0;i<8;i++){
    const a=i*2*Math.PI/8;
    const x=.78*Math.sin(a),y=.66+.46*Math.cos(a),z=-.20+.18*Math.sin(a*2);
    const position=new THREE.Vector3(x,y,z);webNodePositions.push(position);
    const material=new THREE.MeshBasicMaterial({color:palette[i],transparent:true,opacity:.62});webMats.push(material);
    const marker=shape(new THREE.SphereGeometry(.032,12,8),material,modelRoot,x,y,z);
    webNodes.push(marker);
    const curve=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,.74,0),position]);
    modelRoot.add(new THREE.Line(curve,new THREE.LineBasicMaterial({color:'#579caa',transparent:true,opacity:.20})));
  }
  const ringGrid=new THREE.Group();modelRoot.add(ringGrid);
  [0.59,.75,.95].forEach((r,i)=>{
    const geo=new THREE.RingGeometry(r,r+.003,72).rotateX(-Math.PI/2);
    const ring=shape(geo,new THREE.MeshBasicMaterial({color:'#5bc4c5',transparent:true,opacity:.14-i*.025,side:THREE.DoubleSide,depthWrite:false}),ringGrid,0,.048+i*.003,0);
  });
  for(let i=0;i<12;i++){
    const ang=i*Math.PI/6;const line=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,.048,0),new THREE.Vector3(Math.sin(ang),.048,Math.cos(ang))]);
    ringGrid.add(new THREE.Line(line,new THREE.LineBasicMaterial({color:'#4c8b92',transparent:true,opacity:.095})));
  }

  // Schematic ambient effects, not measured physical data.
  const smoke=[];
  const smokeMaterial=new THREE.MeshBasicMaterial({color:'#a6b7bd',transparent:true,opacity:0,depthWrite:false});
  for(let i=0;i<38;i++){
    const m=shape(new THREE.SphereGeometry(.033+(i%5)*.012,7,6),smokeMaterial.clone(),modelRoot,
      -1.05+(i*77%100)/100*2.1,.18+(i*39%100)/100*1.1,-.7+(i*17%100)/100*1.5);
    m.userData={offset:(i*19%100)/100,drift:i*.35};smoke.push(m);
  }
  const temperatureGlow=shape(new THREE.CylinderGeometry(.43,.29,1.1,20,1,true),
    new THREE.MeshBasicMaterial({color:'#f77a3b',side:THREE.DoubleSide,transparent:true,opacity:0,depthWrite:false}),modelRoot,0,.65,-.13);
  // Animated rings radiating from the head for symbolic noise / mask load.
  const pulses=[];
  for(let i=0;i<3;i++){
    const p=shape(new THREE.TorusGeometry(.17,.006,5,38),new THREE.MeshBasicMaterial({color:'#bac4ff',transparent:true,opacity:0,depthWrite:false}),modelRoot,0,1.07,.25);
    pulses.push(p);
  }
  const previewFloor=shape(new THREE.CircleGeometry(2,80).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#102a39',transparent:true,opacity:.25,side:THREE.DoubleSide}),modelRoot,0,-.011,0);

  let currentConstraint='visibility';
  const idToIndex={visibility:0,heat:1,noise:2,gloves:3,air:4,time:5,cognition:6,equipment:7};
  function setConstraint(id){currentConstraint=id;
    const idx=idToIndex[id]??0;
    for(let i=0;i<8;i++){webNodes[i].scale.setScalar(i===idx?1.85:1);webMats[i].opacity=i===idx?1:.45;}
    materials.golden.emissive?.set('#000000');
    materials.tape.emissiveIntensity=id==='gloves'?.65:.26;
    tank.material.emissive=new THREE.Color(id==='equipment'||id==='air'?'#164b58':'#000000');
    tank.material.emissiveIntensity=.8;
  }
  function setScale(s){modelScale=s;modelRoot.scale.setScalar(s);}
  function setRotation(deg){rotDeg=deg;modelRoot.rotation.y=deg*Math.PI/180;}

  const reticle=new THREE.Mesh(new THREE.RingGeometry(.07,.09,40).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#6affac',side:THREE.DoubleSide}));
  reticle.matrixAutoUpdate=false;reticle.visible=false;scene.add(reticle);
  let hitTestSource=null,hitTestRequested=false,placed=false;
  const controller=renderer.xr.getController(0);scene.add(controller);
  let placeButton=null,replaceButton=null;
  function updateButtons(){
    if(!placeButton||!replaceButton)return;
    const inXR=renderer.xr.isPresenting;
    placeButton.hidden=!inXR||placed||!reticle.visible;
    replaceButton.hidden=!inXR||!placed;
  }
  function place(){
    if(!renderer.xr.isPresenting||placed||!reticle.visible)return;
    placementRoot.position.setFromMatrixPosition(reticle.matrix);
    placementRoot.quaternion.setFromRotationMatrix(reticle.matrix);
    placementRoot.scale.setScalar(.65);
    placementRoot.visible=true;placed=true;reticle.visible=false;updateButtons();
  }
  function resetPlacement(){
    placed=false;placementRoot.visible=false;reticle.visible=false;updateButtons();
  }
  controller.addEventListener('select',place);
  const arButton=ARButton.createButton(renderer,{requiredFeatures:['hit-test'],optionalFeatures:['dom-overlay'],domOverlay:{root:overlay}});
  arButton.textContent=arButton.textContent==='START AR'?'START AR':arButton.textContent;
  launchSlot.appendChild(arButton);
  renderer.xr.addEventListener('sessionstart',()=>{
    scene.background=null;orbit.enabled=false;
    placementRoot.visible=false;placed=false;reticle.visible=false;
    onXRStart?.();updateButtons();
  });
  renderer.xr.addEventListener('sessionend',()=>{
    scene.background=background;orbit.enabled=true;
    if(hitTestSource){hitTestSource.cancel();hitTestSource=null;}hitTestRequested=false;
    placementRoot.visible=true;placementRoot.position.set(0,0,0);placementRoot.quaternion.identity();placementRoot.scale.setScalar(1);
    placed=false;reticle.visible=false;onXREnd?.();updateButtons();
  });
  async function requestHitTestSource(session){
    if(hitTestRequested||hitTestSource)return;
    hitTestRequested=true;
    try{
      const refSpace=await session.requestReferenceSpace('viewer');
      const source=await session.requestHitTestSource({space:refSpace});
      if(session===renderer.xr.getSession())hitTestSource=source;else source.cancel();
    }catch(e){console.warn('AR hit-test unavailable',e);hitTestRequested=false;}
  }
  let enabled=true,elapsed=0,lastFrame=performance.now();
  function resize(){
    const w=stage.clientWidth||innerWidth,h=stage.clientHeight||innerHeight;
    if(w&&h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  }
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);resize();
  renderer.setAnimationLoop((_,frame)=>{
    const now=performance.now(),dt=Math.min((now-lastFrame)/1000,.07);lastFrame=now;elapsed+=dt;
    if(!renderer.xr.isPresenting&&!enabled)return;
    const active=idToIndex[currentConstraint]??0;
    for(let i=0;i<webNodes.length;i++){
      if(i===active){webNodes[i].scale.setScalar(1.75+.25*Math.sin(elapsed*3));}
    }
    const hasSmoke=currentConstraint==='visibility';
    for(const s of smoke){
      s.material.opacity=hasSmoke ? (.10+.11*Math.sin(elapsed*.8+s.userData.drift)**2) : .006;
      s.position.y=.2+((s.userData.offset+elapsed*.07)%1)*1.18;
      s.position.x+=Math.sin(elapsed*.5+s.userData.drift)*dt*.01;
    }
    temperatureGlow.material.opacity=currentConstraint==='heat'?.065+.026*Math.sin(elapsed*1.7):0;
    pulses.forEach((pulse,i)=>{
      const v=(elapsed*.68+i/3)%1;
      pulse.scale.setScalar(1+v*4.5);
      pulse.material.opacity=(currentConstraint==='noise'||currentConstraint==='air')?.30*(1-v):0;
      pulse.material.color.set(currentConstraint==='air'?'#c7f8be':'#b4b8ff');
    });
    if(currentConstraint==='gloves'){
      parts.gloveLeft.material.emissive=new THREE.Color('#314a19');
      parts.gloveLeft.material.emissiveIntensity=.6+.28*Math.sin(elapsed*3);
    }else{parts.gloveLeft.material.emissive=new THREE.Color('#000000');}
    if(!renderer.xr.isPresenting){
      orbit.update();
      ringGrid.rotation.y=elapsed*.023;
    }
    if(renderer.xr.isPresenting&&frame&&!placed){
      const session=renderer.xr.getSession();requestHitTestSource(session);
      const hits=hitTestSource?frame.getHitTestResults(hitTestSource):[];
      if(hits.length){
        const pose=hits[0].getPose(renderer.xr.getReferenceSpace());
        if(pose){reticle.matrix.fromArray(pose.transform.matrix);reticle.visible=true;}
      }else reticle.visible=false;
      updateButtons();
    }
    renderer.render(scene,camera);
  });
  const onResize=()=>resize();window.addEventListener('resize',onResize);
  function setEnabled(v){enabled=v; if(v)resize();}
  async function endXR(){try{await renderer.xr.getSession()?.end();}catch(e){console.warn(e);}}
  function setARButtons(a,b){placeButton=a;replaceButton=b;updateButtons();}
  return {setConstraint,setScale,setRotation,setEnabled,resize,place,resetPlacement,endXR,setARButtons};
}
