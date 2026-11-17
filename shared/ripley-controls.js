// Einheitliche RIPLEY-Modellsteuerung: kein Eingriff in die WebXR-Tischverankerung.
// root ist ausschließlich die sichtbare Modellgruppe innerhalb des placementRoot.
const STYLE_ID='ripley-shared-controls-css';
function ensureStyles(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');style.id=STYLE_ID;
  style.textContent=`
  .ripley-height-field{margin:12px 0 2px;padding:11px 10px;border:1px solid rgba(123,235,192,.28);border-radius:11px;background:rgba(16,46,55,.65);color:#ebfff8;}
  .ripley-height-title{display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:12px;font-weight:650;margin-bottom:8px;}
  .ripley-height-title output{font-variant-numeric:tabular-nums;color:#94f1c9;white-space:nowrap;}
  .ripley-height-line{display:flex;align-items:center;gap:8px;}
  .ripley-height-line button{flex:none;min-width:46px;min-height:46px;padding:7px 8px;border-radius:10px;color:#f4fffb;background:#27515a;border:1px solid rgba(135,230,209,.38);font-size:20px;touch-action:manipulation;}
  .ripley-height-line input[type=range]{flex:1;min-width:0;width:100%;height:32px;accent-color:#70e6b6;touch-action:pan-x;}
  .ripley-height-help{font-size:10.5px;line-height:1.35;color:#bacfd2;margin:7px 0 0;}
  .ripley-back-nav{position:fixed;left:max(10px, env(safe-area-inset-left));bottom:max(70px, env(safe-area-inset-bottom) + 70px);display:flex;flex-wrap:wrap;gap:6px;max-width:calc(100vw - 22px);z-index:25;pointer-events:auto;}
  .ripley-back-nav a{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:10px 15px;border-radius:13px;background:rgba(10,29,45,.96);border:1px solid rgba(155,241,207,.55);color:#d9fff0;text-decoration:none;font:650 13px/1.2 system-ui,-apple-system,'Segoe UI',sans-serif;box-shadow:0 7px 20px #0006;backdrop-filter:blur(9px);touch-action:manipulation;}
  .ripley-back-nav a:focus-visible,.ripley-height-line button:focus-visible{outline:2px solid #8affcc;outline-offset:2px;}
  .ripley-back-nav a:hover{background:#22575a;}
  body.in-xr .ripley-back-nav{display:none;}
  body:has(#controls-panel:not([hidden]):not(.is-collapsed)) .ripley-back-nav{display:none;}
  @media(orientation:landscape) and (max-height:650px){.ripley-back-nav{bottom:max(54px, env(safe-area-inset-bottom) + 54px)}.ripley-back-nav a{min-height:44px;padding:9px 12px;font-size:12px;}}
  `;
  document.head.appendChild(style);
}
/**
 * Höhe des 3D-Modells in Zentimetern relativ zum Ausgangspunkt.
 * Der AR-Hit-Test-Anker und die Kamera bleiben unverändert.
 * @returns {{setHeight: (centimeters:number)=>void,getHeight:()=>number}}
 */
export function installModelHeight({root, mount, resetSelector='#reset'}){
  ensureStyles();
  const container=typeof mount==='string'?document.querySelector(mount):mount;
  if(!root || !container)throw new Error('RIPLEY-Höhensteuerung: Modellgruppe oder Menü fehlt');
  if(document.getElementById('ripley-height'))throw new Error('Höhensteuerung schon eingebaut');
  const field=document.createElement('div');field.className='ripley-height-field';
  field.innerHTML=`
    <label class="ripley-height-title" for="ripley-height"><span>↕ Höhe des Modells</span><output id="ripley-height-output" for="ripley-height">0 cm</output></label>
    <div class="ripley-height-line">
      <button id="ripley-height-down" type="button" aria-label="Modell fünf Zentimeter absenken" title="5 cm runter">↓</button>
      <input id="ripley-height" type="range" min="-40" max="80" value="0" step="5" aria-label="Höhe des 3D-Modells relativ zum Ausgangspunkt in Zentimetern">
      <button id="ripley-height-up" type="button" aria-label="Modell fünf Zentimeter anheben" title="5 cm hoch">↑</button>
    </div>
    <p class="ripley-height-help">−40 bis +80 cm gegenüber dem Ausgangspunkt. Funktioniert auch ohne AR; der Platzierungspunkt bleibt unverändert.</p>`;
  container.appendChild(field);
  const slider=field.querySelector('#ripley-height');
  const output=field.querySelector('#ripley-height-output');
  let heightCm=0;
  const setHeight=cm=>{
    const n=Number(cm);
    if(!Number.isFinite(n))return;
    heightCm=Math.round(Math.max(-40,Math.min(80,n))/5)*5;
    root.position.y=heightCm/100;
    slider.value=String(heightCm);
    output.textContent=(heightCm>0?'+':'')+heightCm+' cm';
  };
  slider.addEventListener('input',()=>setHeight(slider.value));
  field.querySelector('#ripley-height-down').addEventListener('click',()=>setHeight(heightCm-5));
  field.querySelector('#ripley-height-up').addEventListener('click',()=>setHeight(heightCm+5));
  document.querySelector(resetSelector)?.addEventListener('click',()=>setHeight(0));
  setHeight(0);
  return {setHeight,getHeight:()=>heightCm};
}
export function installDemoNavigation({homeHref,sectionHref}){
  ensureStyles();
  document.querySelector('#home-link')?.remove();
  document.querySelector('#demo-nav')?.remove();
  document.querySelector('.ripley-back-nav')?.remove();
  const nav=document.createElement('nav');nav.className='ripley-back-nav';nav.setAttribute('aria-label','RIPLEY-Navigation');
  const links=sectionHref?[[sectionHref,'← Akustikübersicht'],[homeHref,'⌂ Hauptmenü']]:[[homeHref,'← Hauptmenü']];
  for(const [href,label] of links){
    const a=document.createElement('a');a.href=href;a.textContent=label;nav.appendChild(a);
  }
  document.body.appendChild(nav);
}


/**
 * Touch-Gesten für die identische sichtbare Modellgruppe in der 3D-Vorschau und
 * nach der Platzierung in WebXR. Bei fehlendem DOM-Overlay bleiben Slider nutzbar.
 * Die Gesten greifen NICHT auf die Hit-Test-Position, Referenzräume oder Kamera zu.
 */
export function installModelGestures({renderer,controller,isPlaced,getScale,setScale,getAngle,setAngle,minScale,maxScale}){
  const overlay=document.querySelector('#overlay');
  if(!overlay)throw new Error('WebXR Overlay nicht gefunden');
  let pad=document.querySelector('#ripley-gesture-pad');
  if(!pad){
    pad=document.createElement('div');
    pad.id='ripley-gesture-pad';pad.setAttribute('aria-hidden','true');
    overlay.insertBefore(pad,overlay.firstChild);
  }
  const styles=document.createElement('style');
  styles.id='ripley-model-gestures-style';
  styles.textContent=`
    #ripley-gesture-pad{position:absolute;inset:0;z-index:0;pointer-events:none;touch-action:none;background:transparent;}
    #overlay > :not(#ripley-gesture-pad){position:relative;z-index:1;}
    #stage canvas{touch-action:none;}
    body.in-xr #ripley-gesture-pad{z-index:0;}
  `;
  document.head.appendChild(styles);
  const points=new Map();
  let pinch=null;
  const length=()=>{
    const [a,b]=[...points.values()];
    return Math.hypot(a.x-b.x,a.y-b.y);
  };
  const clear=()=>{points.clear();pinch=null;};
  const update=()=>{
    const enabled=renderer.xr.isPresenting&&Boolean(isPlaced());
    pad.style.pointerEvents=enabled?'auto':'none';
    if(!enabled)clear();
  };
  const down=e=>{
    if(e.pointerType!=='touch')return;
    const fromPad=e.currentTarget===pad;
    if(fromPad && (!renderer.xr.isPresenting || !isPlaced()))return;
    if(!fromPad && renderer.xr.isPresenting)return;
    e.preventDefault();e.stopImmediatePropagation();
    points.set(e.pointerId,{x:e.clientX,y:e.clientY});
    try{e.currentTarget.setPointerCapture(e.pointerId);}catch(_){}
    if(points.size>=2)pinch={distance:Math.max(10,length()),scale:getScale()};
  };
  const move=e=>{
    if(!points.has(e.pointerId))return;
    e.preventDefault();e.stopImmediatePropagation();
    const last=points.get(e.pointerId);
    points.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(points.size>=2){
      if(!pinch)pinch={distance:Math.max(10,length()),scale:getScale()};
      const proposed=pinch.scale*length()/pinch.distance;
      setScale(Math.max(minScale,Math.min(maxScale,proposed)));
    }else{
      setAngle(((getAngle()+(e.clientX-last.x)*.65)%360+360)%360);
    }
  };
  const end=e=>{
    if(!points.has(e.pointerId))return;
    e.preventDefault();e.stopImmediatePropagation();
    points.delete(e.pointerId);
    pinch=null;
  };
  for(const surface of [renderer.domElement,pad]){
    surface.addEventListener('pointerdown',down,{capture:true});
    surface.addEventListener('pointermove',move,{capture:true});
    surface.addEventListener('pointerup',end,{capture:true});
    surface.addEventListener('pointercancel',end,{capture:true});
    surface.addEventListener('lostpointercapture',e=>{points.delete(e.pointerId);if(points.size<2)pinch=null;},{capture:true});
  }
  const afterAction=()=>queueMicrotask(update);
  renderer.xr.addEventListener('sessionstart',afterAction);
  renderer.xr.addEventListener('sessionend',afterAction);
  controller?.addEventListener('select',afterAction);
  document.querySelector('#place-now')?.addEventListener('click',afterAction);
  document.querySelector('#place-again')?.addEventListener('click',afterAction);
  document.querySelector('#reset')?.addEventListener('click',afterAction);
  update();
  return {update};
}
