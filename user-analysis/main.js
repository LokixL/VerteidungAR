import {MAP, CONSTRAINTS} from './data.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const state = {view:'persona',constraint:0,area:0,mode:'all',zoomIndex:2,original:false,overview:false,auto:null};
const zoomLevels=[.78,.9,1,1.15,1.3];
let sceneAPI=null;

function esc(text) {
  return String(text).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function updateHash() { try { history.replaceState(null,'',location.pathname+location.search+'#'+state.view); } catch(error) { /* Embedded preview or restricted browser: URL updates are optional. */ } }

// --- USER ANALYSIS, Figure 22 and chapter 5 ---
function buildConstraints() {
  $('#constraint-pills').innerHTML=CONSTRAINTS.map((c,i)=>
    `<button type="button" class="constraint-pill" data-constraint="${i}" aria-pressed="false"><span class="pill-symbol">${esc(c.icon)}</span>${esc(c.short)}</button>`).join('');
  $('#web-nodes').innerHTML=CONSTRAINTS.map((c,i)=>
    `<button type="button" class="web-node" data-constraint="${i}" title="${esc(c.label)}" aria-label="Belastung: ${esc(c.label)}"><span class="node-number">${String(i+1).padStart(2,'0')}</span>${esc(c.label)}</button>`).join('');
  $$('[data-constraint]').forEach(btn=>btn.addEventListener('click',()=>selectConstraint(Number(btn.dataset.constraint))));
}
const WEB_POINTS=[[500,75],[820,155],[925,350],[805,560],[500,638],[190,560],[75,350],[180,155]];
function selectConstraint(index) {
  state.constraint=(index+CONSTRAINTS.length)%CONSTRAINTS.length;
  const c=CONSTRAINTS[state.constraint];
  $('#constraint-index').textContent=String(state.constraint+1).padStart(2,'0')+' / 08';
  $('#constraint-title').textContent=c.label;
  $('#constraint-explanation').textContent=c.detail;
  $('#constraint-implication').textContent=c.implication;
  $('#constraint-area').textContent=c.area;
  $$('[data-constraint]').forEach(btn=>{
    let active=Number(btn.dataset.constraint)===state.constraint;
    btn.classList.toggle('active',active);
    btn.setAttribute('aria-pressed',String(active));
  });
  const [x,y]=WEB_POINTS[state.constraint];
  $('#highlight-ray').setAttribute('x2',x);
  $('#highlight-ray').setAttribute('y2',y);
  $('#highlight-ray').setAttribute('stroke',c.color);
  $('#constraint-detail').style.borderColor=c.color+'99';
  sceneAPI?.setConstraint(c.id);
}
function pauseAuto() {
  if(state.auto){clearInterval(state.auto);state.auto=null;}
  $('#play-constraints').textContent='▶ Auto';
  $('#play-constraints').classList.remove('active');
}
function toggleAuto(){
  if(state.auto){pauseAuto();return;}
  $('#play-constraints').textContent='Ⅱ Pause';$('#play-constraints').classList.add('active');
  state.auto=setInterval(()=>selectConstraint(state.constraint+1),4200);
}
$('#next-constraint').addEventListener('click',()=>selectConstraint(state.constraint+1));
$('#previous-constraint').addEventListener('click',()=>selectConstraint(state.constraint-1));
$('#play-constraints').addEventListener('click',toggleAuto);
buildConstraints();
selectConstraint(0);


// --- FULL ORIGINAL USER STORY MAP, chapter 6.8 / Table 7 ---
function listHtml(items) {return '<ul>'+items.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>';}
function mapCell(row, items) {
  const label={tasks:'TASKS',first:'FIRST',second:'SECOND'}[row];
  return `<div class="map-cell ${row}" data-row="${row}"><span class="row-heading">${label}</span>${listHtml(items)}</div>`;
}
function buildMap() {
  $('#board').innerHTML=MAP.map((a,i)=>`<article class="map-column" data-area="${i}">
      <button type="button" class="map-col-head" data-area-button="${i}" aria-label="Bereich ${esc(a.title)} auswählen">
        <span class="index">AREA ${String(i+1).padStart(2,'0')} / 09</span>
        <strong>${esc(a.title)}</strong>
        <small>${esc(a.icon)} · USER STORY MAP</small>
      </button>
      ${mapCell('tasks',a.tasks)}
      ${mapCell('first',a.first)}
      ${mapCell('second',a.second)}
    </article>`).join('');
  $('#area-picker').innerHTML=MAP.map((a,i)=>
    `<button type="button" class="area-chip" data-area-pick="${i}">${String(i+1).padStart(2,'0')} ${esc(a.short)}</button>`).join('');
  $$('[data-area-button],[data-area-pick]').forEach(btn=>btn.addEventListener('click',()=>selectArea(Number(btn.dataset.areaButton??btn.dataset.areaPick))));
}
function selectArea(index,scroll=true){
  if(state.overview && scroll){setOverview(false);state.original=false;$('#board').hidden=false;$('#source-figure').hidden=true;$('#original-toggle').classList.remove('active');$('#original-toggle').textContent='Originaltabelle';}
  state.area=(index+MAP.length)%MAP.length;
  const a=MAP[state.area];
  $('#inspector-position').textContent=String(state.area+1).padStart(2,'0')+' / 09';
  $('#inspector-title').textContent=a.title;
  $('#inspector-need').textContent=a.link.need;
  $('#inspector-realization').textContent=a.link.realization;
  $('#inspector-note').textContent=a.link.note;
  $$('.map-column').forEach(col=>{
    col.classList.toggle('selected',Number(col.dataset.area)===state.area);
    col.classList.toggle('deemphasized',Number(col.dataset.area)!==state.area);
  });
  $$('[data-area-pick]').forEach(btn=>{
    let active=Number(btn.dataset.areaPick)===state.area;
    btn.classList.toggle('active',active);
    btn.setAttribute('aria-pressed',String(active));
  });
  if(scroll&&!state.original){
    const viewport=$('#board-viewport'); const selected=$(`.map-column[data-area="${state.area}"]`);
    const target=Math.max(0,selected.offsetLeft-(viewport.clientWidth-selected.clientWidth)/2);
    viewport.scrollTo({left:target,behavior:'smooth'});
  }
  if(scroll){
    const chip=$(`[data-area-pick="${state.area}"]`);
    chip?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
  }
}
function setMapMode(mode){
  state.mode=mode;
  $('#board').classList.remove('focus-tasks','focus-first','focus-second');
  if(mode!=='all')$('#board').classList.add('focus-'+mode);
  $$('.map-mode').forEach(btn=>btn.classList.toggle('active',btn.dataset.mode===mode));
}
function updateZoom(){
  const zoom=zoomLevels[state.zoomIndex];
  $('#board').style.setProperty('--zoom',zoom);
  $('#board').style.setProperty('--col',`calc(200px * ${zoom})`);
  $('#board').style.setProperty('--font',`calc(12px * ${zoom})`);
  $('#source-figure').style.setProperty('--col',`calc(200px * ${zoom})`);
  $('#zoom-value').textContent=Math.round(zoom*100)+' %';
  $('#zoom-in').disabled=state.zoomIndex===zoomLevels.length-1;
  $('#zoom-out').disabled=state.zoomIndex===0;
}
function toggleOriginal(){
  if(state.overview)setOverview(false);
  state.original=!state.original;
  $('#board').hidden=state.original;
  $('#source-figure').hidden=!state.original;
  $('#original-toggle').classList.toggle('active',state.original);
  $('#original-toggle').textContent=state.original?'Interaktives Board':'Originaltabelle';
  $('#board-viewport').scrollTo({left:0,top:0});
}
function setOverview(active){
  state.overview=active;
  $('#screen-map').classList.toggle('map-overview',active);
  $('#overview-toggle').classList.toggle('active',active);
  $('#overview-toggle').textContent=active?'← Detailansicht':'⊞ Gesamtansicht';
  $('#board').hidden=active||state.original;
  $('#source-figure').hidden=!active&&!state.original;
  $('#board-viewport').scrollTo({left:0,top:0});
}
$('#overview-toggle').addEventListener('click',()=>setOverview(!state.overview));
$('#inspector-previous').addEventListener('click',()=>selectArea(state.area-1));
$('#inspector-next').addEventListener('click',()=>selectArea(state.area+1));
$$('.map-mode').forEach(btn=>btn.addEventListener('click',()=>setMapMode(btn.dataset.mode)));
$('#zoom-in').addEventListener('click',()=>{state.zoomIndex=Math.min(zoomLevels.length-1,state.zoomIndex+1);updateZoom();});
$('#zoom-out').addEventListener('click',()=>{state.zoomIndex=Math.max(0,state.zoomIndex-1);updateZoom();});
$('#original-toggle').addEventListener('click',toggleOriginal);
buildMap();setMapMode('all');updateZoom();selectArea(0,false);

// Use Case: independent, scrollable full-table presentation view.
// The enlarged version clones the original HTML table; no content is removed.
const ucTableDialog = $('#uc-table-dialog');
const ucDialogContent = $('#uc-dialog-content');
$('#uc-full-table').addEventListener('click', () => {
  if (!ucDialogContent.firstElementChild) {
    const full = $('.uc-source-table').cloneNode(true);
    full.removeAttribute('aria-label');
    full.setAttribute('aria-label', 'Vollständige Tabelle 8');
    ucDialogContent.appendChild(full);
  }
  ucTableDialog.showModal();
  ucDialogContent.scrollTop = 0;
});
$('#uc-dialog-close').addEventListener('click', () => ucTableDialog.close());
ucTableDialog.addEventListener('click', e => {
  if (e.target === ucTableDialog) ucTableDialog.close();
});

// --- NAVIGATION / PRESENTATION ---
async function openView(view){
  if(!['persona','usecase','map'].includes(view))return;
  state.view=view;
  $('#screen-persona').hidden=view!=='persona';
  $('#screen-usecase').hidden=view!=='usecase';
  $('#screen-map').hidden=view!=='map';
  $$('.nav-tab').forEach(btn=>{
    const active=btn.dataset.view===view;
    btn.classList.toggle('active',active);
    if(active)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current');
  });
  if(view!=='persona')pauseAuto();
  sceneAPI?.setEnabled(view==='persona');
  if(view==='persona')sceneAPI?.resize();
  updateHash();window.scrollTo({top:0,behavior:'instant'});
}
$$('[data-view]').forEach(btn=>btn.addEventListener('click',()=>openView(btn.dataset.view)));
$('#to-usecase').addEventListener('click',()=>openView('usecase'));
$('#case-to-map').addEventListener('click',()=>openView('map'));
$('#fullscreen').addEventListener('click',async()=>{
  try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();}catch(e){console.warn('Fullscreen unavailable',e);}
});
window.addEventListener('keydown',e=>{
  if (ucTableDialog.open) return; // Dialog handles Escape; no slide shortcuts during table review.
  const el=document.activeElement;
  if(el&&['INPUT','TEXTAREA','SELECT'].includes(el.tagName))return;
  if(e.key==='1'){e.preventDefault();openView('persona');}
  if(e.key==='2'){e.preventDefault();openView('usecase');}
  if(e.key==='3'){e.preventDefault();openView('map');}
  if(e.key==='ArrowRight'){e.preventDefault();if(state.view==='persona')selectConstraint(state.constraint+1);else selectArea(state.area+1);}
  if(e.key==='ArrowLeft'){e.preventDefault();if(state.view==='persona')selectConstraint(state.constraint-1);else selectArea(state.area-1);}
  if(e.key===' '&&state.view==='persona'){e.preventDefault();toggleAuto();}
  if(e.key.toLowerCase()==='f'&&!e.repeat)$('#fullscreen').click();
});

// Three.js is optional for the text/board view: if the CDN cannot load, original
// artwork remains visible and every User Story Map feature keeps working.
try {
  const module=await import('./firefighter.js');
  sceneAPI=module.createFirefighterScene({stage:$('#three-stage')});
  sceneAPI.setConstraint(CONSTRAINTS[state.constraint].id);
  sceneAPI.setEnabled(state.view==='persona');
  $('#model-size').addEventListener('input',e=>{
    $('#size-value').textContent=e.target.value+' %';sceneAPI?.setScale(Number(e.target.value)/100);
  });
  $('#model-rotate').addEventListener('input',e=>{
    $('#rotation-value').textContent=e.target.value+'°';sceneAPI?.setRotation(Number(e.target.value));
  });

} catch(error) {
  console.warn('3D not loaded; interactive 2D fall-back remains available.',error);
  $('.stage-subtitle').textContent='3D optional · Interactive storyboard available offline';
  $('.model-options').hidden=true;
}
if(location.hash==='#map')openView('map');
else if(location.hash==='#usecase')openView('usecase');
