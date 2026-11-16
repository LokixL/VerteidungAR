/* Interactive annotations on the original chapter-12 plots. No libraries, no server calls. */
(() => {
  'use strict';
  const charts = window.RIPLEY_RESULTS;
  const $ = id => document.getElementById(id);
  let chartIndex = 0;
  let pointIndex = 0;
  let showingConclusions = false;
  const escapeHTML = input => String(input).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const nav = $('figureNavigation');
  charts.forEach((chart, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fig-tab';
    button.dataset.figure = chart.id;
    button.innerHTML = `<span class="number">${chart.figure}</span><span><span class="tab-title">${escapeHTML(chart.title)}</span><span class="tab-category">${escapeHTML(chart.category)}</span></span>`;
    button.addEventListener('click', () => selectFigure(index));
    nav.append(button);
  });

  function selected() { return charts[chartIndex]; }
  function makeStage(chart) {
    const wrapper = document.createElement('div');
    wrapper.className = 'plot-content';
    const img = document.createElement('img');
    img.className = 'plot-image';
    img.src = chart.image;
    img.alt = `Originalabbildung ${chart.figure}: ${chart.caption}`;
    img.draggable = false;
    img.decoding = 'async';
    wrapper.append(img);
    // Anchors use percentages of the extracted source image and remain aligned on resize.
    const point = chart.points[pointIndex];
    const area = document.createElement('div');
    area.className = 'selection-box';
    area.style.left = `${point.box[0]}%`;
    area.style.top = `${point.box[1]}%`;
    area.style.width = `${point.box[2]}%`;
    area.style.height = `${point.box[3]}%`;
    wrapper.append(area);
    chart.points.forEach((hotspot, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `hotspot${i === pointIndex ? ' active' : ''}`;
      btn.textContent = `${i + 1}`;
      btn.style.left = `${hotspot.x}%`;
      btn.style.top = `${hotspot.y}%`;
      btn.title = hotspot.title;
      btn.setAttribute('aria-label', `Erklärpunkt ${i + 1}: ${hotspot.title}`);
      btn.setAttribute('aria-pressed', String(i === pointIndex));
      btn.addEventListener('click', event => { event.preventDefault(); selectPoint(i); });
      wrapper.append(btn);
    });
    return wrapper;
  }

  function showPoint() {
    const chart = selected();
    const point = chart.points[pointIndex];
    $('pointCount').textContent = `${pointIndex + 1} / ${chart.points.length}`;
    $('plotStage').replaceChildren(makeStage(chart));
    const items = $('pointList');
    items.replaceChildren();
    chart.points.forEach((p, i) => {
      const btn = document.createElement('button');
      btn.className = `point-item${i === pointIndex ? ' selected' : ''}`;
      btn.type = 'button';
      btn.innerHTML = `<span class="point-index">${i + 1}</span><span>${escapeHTML(p.title.replace(/^\d+ · /,''))}</span>`;
      btn.setAttribute('aria-pressed', String(i === pointIndex));
      btn.addEventListener('click', () => selectPoint(i));
      items.append(btn);
    });
    $('noteCard').innerHTML = `<h3>${escapeHTML(point.title)}</h3>
      <div class="fact"><span class="fact-label">WAS IST ZU SEHEN?</span><p>${escapeHTML(point.look)}</p></div>
      <div class="fact"><span class="fact-label">INTERPRETATION</span><p>${escapeHTML(point.meaning)}</p></div>
      <div class="fact limit"><span class="fact-label">WICHTIGE EINSCHRÄNKUNG</span><p>${escapeHTML(point.limit)}</p></div>
      <div class="speech-box"><span class="fact-label">SPRECHTEXT</span><p>“${escapeHTML(point.speech)}”</p></div>`;
    const dialog = $('zoomDialog');
    if (dialog.open) updateZoom();
  }

  function selectPoint(index) {
    if (showingConclusions) return;
    const points = selected().points;
    pointIndex = (index + points.length) % points.length;
    showPoint();
  }

  function renderFigure() {
    const chart = selected();
    $('figureCategory').textContent = chart.category;
    $('figureHeading').textContent = chart.title;
    $('figureSubtitle').textContent = chart.subtitle;
    $('figureCaption').textContent = `ABBILDUNG ${chart.figure} · SEITE ${chart.page} DER ARBEIT  —  ${chart.caption}`;
    const guide = $('plotReadingGuide');
    if (chart.readingGuide) {
      // The guidance text is local static data; escape each segment before emphasizing it.
      guide.innerHTML = chart.readingGuide.split('**').map((part,i) => i % 2 ? `<strong>${escapeHTML(part)}</strong>` : escapeHTML(part)).join('');
      guide.hidden = false;
    } else {
      guide.textContent = '';
      guide.hidden = true;
    }
    $('keyMessage').textContent = chart.key;
    Array.from(nav.children).forEach((tab,i)=>{
      const active = i === chartIndex;
      tab.classList.toggle('selected', active);
      tab.setAttribute('aria-current',active?'true':'false');
    });
    $('prevFig').disabled = chartIndex === 0;
    $('nextFig').textContent = chartIndex === charts.length - 1 ? 'Fazit →' : 'Nächste Grafik →';
    showPoint();
  }

  function updateHash(value) {
    if (location.hash.substring(1) !== value) history.replaceState(null,'',`#${value}`);
  }

  function selectFigure(index, doHash=true) {
    if (index < 0 || index >= charts.length) return;
    chartIndex = index;
    pointIndex = 0;
    showingConclusions = false;
    $('figureView').hidden = false;
    $('conclusionView').hidden = true;
    $('intro').hidden = false;
    $('overviewBtn').classList.add('active');
    $('conclusionBtn').classList.remove('active');
    renderFigure();
    if (doHash) updateHash(selected().id);
    // On small screens, ensure the chosen chapter is visible in the scrollable navigation.
    const tab = nav.children[index];
    if (tab && typeof tab.scrollIntoView === 'function') tab.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});
  }
  function showConclusions(doHash=true) {
    showingConclusions = true;
    $('figureView').hidden = true;
    $('conclusionView').hidden = false;
    $('intro').hidden = true;
    $('overviewBtn').classList.remove('active');
    $('conclusionBtn').classList.add('active');
    if (doHash) updateHash('conclusions');
  }

  function updateZoom() {
    const chart = selected();
    $('zoomTitle').textContent = `Abbildung ${chart.figure} — ${chart.title}`;
    $('zoomStage').replaceChildren(makeStage(chart));
    const point=chart.points[pointIndex];
    $('zoomNote').innerHTML = `<strong>${escapeHTML(point.title)}.</strong> ${escapeHTML(point.meaning)}`;
  }
  function zoom() { updateZoom(); $('zoomDialog').showModal(); }

  $('prevFig').addEventListener('click',()=>selectFigure(chartIndex-1));
  $('nextFig').addEventListener('click',()=>chartIndex+1<charts.length?selectFigure(chartIndex+1):showConclusions());
  $('overviewBtn').addEventListener('click',()=>selectFigure(chartIndex));
  $('conclusionBtn').addEventListener('click',()=>showConclusions());
  $('backToFigures').addEventListener('click',()=>selectFigure(charts.length-1));
  $('zoomBtn').addEventListener('click',zoom);
  $('closeZoom').addEventListener('click',()=>$('zoomDialog').close());
  $('zoomDialog').addEventListener('click',e=>{if(e.target===$('zoomDialog'))$('zoomDialog').close()});
  $('fullscreenBtn').addEventListener('click',()=>{
    if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
    else $('app').requestFullscreen?.().catch(()=>{});
  });
  document.addEventListener('fullscreenchange',()=>{$('fullscreenBtn').innerHTML=document.fullscreenElement?'⛶ <span class="desktop-label">Vollbild verlassen</span>':'⛶ <span class="desktop-label">Vollbild</span>'});
  document.addEventListener('keydown',e=>{
    if(e.altKey||e.ctrlKey||e.metaKey||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) return;
    if(e.key==='f'||e.key==='F') {if($('zoomDialog').open)return; e.preventDefault(); $('fullscreenBtn').click();return}
    if($('zoomDialog').open && e.key==='Escape')return;
    if(e.key==='ArrowLeft'&&!showingConclusions){e.preventDefault();selectFigure(Math.max(0,chartIndex-1))}
    if(e.key==='ArrowRight'){e.preventDefault();if(showingConclusions)return;chartIndex===charts.length-1?showConclusions():selectFigure(chartIndex+1)}
    if(e.key==='ArrowDown'&&!showingConclusions){e.preventDefault();selectPoint(pointIndex+1)}
    if(e.key==='ArrowUp'&&!showingConclusions){e.preventDefault();selectPoint(pointIndex-1)}
  });
  window.addEventListener('hashchange',()=>{
    const key=location.hash.substring(1);
    if(key==='conclusions')showConclusions(false);
    else {const index=charts.findIndex(c=>c.id===key);if(index>=0)selectFigure(index,false)}
  });
  const key=location.hash.substring(1);
  if(key==='conclusions')showConclusions(false);
  else {const initial=charts.findIndex(c=>c.id===key);selectFigure(Math.max(0,initial),false);}
})();
