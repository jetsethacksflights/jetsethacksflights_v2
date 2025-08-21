/* Jetset Hacks v4.1 – app */

const els = {
  form: document.getElementById('searchForm'),
  date: document.getElementById('date'),
  tbody: document.querySelector('#resultsTable tbody'),
  status: document.getElementById('status'),
  provider: document.getElementById('providerHealth'),
  airportsList: document.getElementById('airportsList'),
  popularChipsWrap: document.getElementById('popularChipsWrap'),
  tripType: document.getElementById('tripType'),
  dlg: document.getElementById('detailDlg'),
  dlgTitle: document.getElementById('dlgTitle'),
  dlgBody: document.getElementById('dlgBody'),
  dlgClose: document.getElementById('dlgClose'),
};

let FX={}, FLIGHTS=[], AIRPORTS=[], LAST_ROWS=[];

const q = (sel, root=document)=>root.querySelector(sel);
const $$ = (sel, root=document)=>[...root.querySelectorAll(sel)];
const fmt = n => (n==null ? '' : Number(n).toLocaleString('en-AU'));

async function fetchJSON(path, fallback) {
  try { const r = await fetch(path, {cache:'no-store'}); if(!r.ok) throw 0; return await r.json(); }
  catch { return fallback; }
}

/* ---------- initial loads ---------- */
(async function boot(){
  // airports list (array shape)
  AIRPORTS = await fetchJSON('/data/airports.json', [
    {code:'SYD',city:'Sydney',country:'Australia'},
    {code:'MEL',city:'Melbourne',country:'Australia'},
    {code:'LAX',city:'Los Angeles',country:'USA'},
  ]);
  els.airportsList.innerHTML = AIRPORTS.map(a=>`<option value="${a.code}">${a.city} — ${a.country}</option>`).join('');

  // flights (array)
  FLIGHTS = await fetchJSON('/data/flights.json', []);
  renderBoards(FLIGHTS);

  // providers badge (array)
  refreshProviders();
  setInterval(refreshProviders, 180000);

  // fx (object)
  FX = await fetchJSON('/data/fx.json', {AUD:1});

  wireUI();
})();

/* ---------- providers ---------- */
async function refreshProviders(){
  const list = await fetchJSON('/data/providers.json', []);
  if(!list.length){ els.provider.textContent='Providers: unavailable'; els.provider.style.color='#ffb'; return; }
  const ok = list.filter(p=>String(p.status).toLowerCase().includes('healthy')).length;
  const all = list.length;
  els.provider.textContent = `Providers: ${ok}/${all} OK`;
  els.provider.style.color = ok===all ? '#9f9' : (ok? '#ffb' : '#f99');
}

/* ---------- UI wiring ---------- */
function wireUI(){
  // uppercase IATA
  ['from','to'].forEach(id=>{
    const el = document.getElementById(id);
    el.addEventListener('input', e=> e.target.value = e.target.value.toUpperCase());
  });

  // date quick chips Tue/Wed/Sat + rolling dates
  $$('.chip[data-day]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const map={tue:2,wed:3,sat:6};
      const d = new Date();
      const target = map[btn.dataset.day];
      const delta = (target - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate()+delta);
      els.date.value = d.toISOString().slice(0,10);
    });
  });
  // extra rolling chips (shown in HTML) already work—no code needed

  // search
  els.form.addEventListener('submit', (e)=>{ e.preventDefault(); runSearch(); });

  // currency change re‑render
  document.getElementById('curr').addEventListener('change', ()=> render(LAST_ROWS));

  // board tabs
  $$('.board-tab').forEach(b=>{
    b.onclick=()=>{
      $$('.board-tab').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      const key=b.dataset.board;
      q('#board-routes').hidden = key!=='routes';
      q('#board-destinations').hidden = key!=='destinations';
      q('#board-compare').hidden = key!=='compare';
    };
  });

  // details dialog
  els.dlgClose?.addEventListener('click', ()=> els.dlg.close());
}

/* ---------- search/filter ---------- */
function runSearch(){
  const from = (q('#from').value||'').trim().toUpperCase();
  const to   = (q('#to').value||'').trim().toUpperCase();
  const date = els.date.value || '';

  let rows = FLIGHTS.slice();
  if(from) rows = rows.filter(r=>(r.from||'')===from);
  if(to)   rows = rows.filter(r=>(r.to||'')===to);
  if(date) rows = rows.filter(r=>(r.date||'')===date);

  render(rows);
}

/* ---------- render ---------- */
function centsPerPoint(aud, pts){
  if(!aud || !pts) return '';
  return ((aud*100)/pts).toFixed(2);
}
function toAUD(row){
  // row.price in row.currency; show AUD using FX map (relative to AUD)
  const curr = (row.currency||'AUD').toUpperCase();
  if(curr==='AUD') return row.price||0;
  const rate = FX[curr]; // e.g. USD:1.55 means 1 AUD = 1.55 USD → AUD = price / rate
  if(!rate) return row.price||0;
  return Math.round((row.price||0)/rate);
}
function gfLink(row){
  const c = (row.cabin||'').toLowerCase();
  const cabin = c.includes('business') ? 'c=B' : c.includes('premium') ? 'c=W' : c.includes('first') ? 'c=F' : 'c=E';
  return `https://www.google.com/travel/flights?q=Flights%20from%20${row.from}%20to%20${row.to}%20on%20${row.date}&${cabin}`;
}
function rowHTML(r){
  const aud = toAUD(r);
  const cpp = centsPerPoint(aud, r.points);
  const link = r.book_url || gfLink(r);
  const flights = [r.flightNumber, r.marketing_flight].filter(Boolean).join(' • ');
  return `<tr class="r">
    <td>${r.date||''}</td>
    <td>${r.from||''}</td>
    <td>${r.to||''}</td>
    <td>${(r.airline||'')}${flights?` • ${flights}`:''}${r.alliance?` <span class="pill">${r.alliance}</span>`:''}</td>
    <td>${r.cabin||''}</td>
    <td>$${fmt(aud)} AUD${(r.currency&&r.currency!=='AUD')?` <span class="orig">(${fmt(r.price)} ${r.currency})</span>`:''}</td>
    <td>${fmt(r.points||'')}</td>
    <td>${cpp}</td>
    <td><a target="_blank" rel="noopener" href="${link}">Book</a></td>
    <td><button class="share-btn">Share</button></td>
  </tr>`;
}
function render(rows){
  LAST_ROWS = rows||[];
  els.tbody.innerHTML = LAST_ROWS.map(rowHTML).join('');
  els.status.textContent = LAST_ROWS.length ? `Results updated • ${new Date().toLocaleTimeString()}` : 'No results. Try different dates or nearby airports.';

  // Share + details
  $$('.share-btn', q('#resultsTable')).forEach((btn,i)=>{
    const r = LAST_ROWS[i];
    btn.onclick = async ()=>{
      const text = `${r.from}→${r.to} ${r.airline||''} ${r.cabin||''} • $${fmt(toAUD(r))} AUD`;
      if(navigator.share){ try{ await navigator.share({text,url:location.href}); return;}catch{} }
      await navigator.clipboard.writeText(text);
      btn.textContent='Copied!';
      setTimeout(()=>btn.textContent='Share',1000);
    };
  });
  // row click details
  $$('#resultsTable tbody tr').forEach((tr,i)=>{
    tr.style.cursor='pointer';
    tr.onclick=()=>{
      const r=LAST_ROWS[i];
      els.dlgTitle.textContent = `${r.from} → ${r.to} (${r.cabin||''})`;
      els.dlgBody.innerHTML = `
        <ul>
          <li><strong>Airline:</strong> ${r.airline||''}</li>
          <li><strong>Flight:</strong> ${r.flightNumber||r.marketing_flight||''}</li>
          <li><strong>Alliance:</strong> ${r.alliance||'—'}</li>
          <li><strong>Price:</strong> $${fmt(toAUD(r))} AUD ${(r.currency&&r.currency!=='AUD')?`<span class="orig">(orig ${fmt(r.price)} ${r.currency})</span>`:''}</li>
          <li><strong>Points:</strong> ${fmt(r.points||'')}</li>
          <li><strong>Date:</strong> ${r.date||''}</li>
          <li><strong>Book:</strong> <a target="_blank" rel="noopener" href="${r.book_url||gfLink(r)}">Open</a></li>
        </ul>`;
      els.dlg.showModal();
    };
  });
}

/* ---------- boards / chips ---------- */
function topN(arr, n, key){
  const m=new Map();
  arr.forEach(r=>{ const k=key(r); m.set(k,(m.get(k)||0)+1); });
  return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,n);
}
function renderBoards(all){
  // routes
  q('#board-routes .board-body').innerHTML =
    topN(all,8,r=>`${r.from}-${r.to}`).map(([k,c])=>{
      const [f,t]=k.split('-'); return `<div class="item"><span>${f} → ${t}</span><span class="minor">${c} deals</span></div>`;
    }).join('') || '<div class="minor">No data</div>';

  // destinations
  const dests = topN(all,8,r=>r.to);
  q('#board-destinations .board-body').innerHTML =
    dests.map(([to,c])=>`<div class="item"><span>${to}</span><span class="minor">${c} deals</span></div>`).join('') || '<div class="minor">No data</div>';

  // compare
  const MAJOR=new Set(['Qantas','Qatar','Singapore Airlines','United','American Airlines','JAL','ANA','Emirates','Cathay Pacific','Virgin Australia']);
  const buckets={major:0,budget:0};
  const alliances={oneworld:0,skyteam:0,star:0,none:0};
  all.forEach(r=>{
    buckets[ MAJOR.has(r.airline)?'major':'budget' ]++;
    const a=(r.alliance||'').toLowerCase();
    if(a.includes('oneworld')) alliances.oneworld++; else if(a.includes('sky')) alliances.skyteam++; else if(a.includes('star')) alliances.star++; else alliances.none++;
  });
  q('#board-compare .board-body').innerHTML = `
    <div class="item"><span>Full‑service (major)</span><span class="minor">${buckets.major}</span></div>
    <div class="item"><span>Low‑cost (budget)</span><span class="minor">${buckets.budget}</span></div>
    <div class="item"><span>oneworld</span><span class="minor">${alliances.oneworld}</span></div>
    <div class="item"><span>SkyTeam</span><span class="minor">${alliances.skyteam}</span></div>
    <div class="item"><span>Star Alliance</span><span class="minor">${alliances.star}</span></div>
    <div class="item"><span>No alliance</span><span class="minor">${alliances.none}</span></div>
  `;

  // popular chips
  els.popularChipsWrap.innerHTML = dests.slice(0,6).map(([to])=>`<button class="chip" data-popto="${to}">${to}</button>`).join('');
  $$('[data-popto]').forEach(b=>{
    b.onclick=()=>{
      const from = q('#from'); const to = q('#to');
      if(!from.value) from.value = all.find(r=>r.to===b.dataset.popto)?.from || 'SYD';
      to.value = b.dataset.popto;
      els.form.requestSubmit();
      window.scrollTo({top:q('.search').offsetTop-12,behavior:'smooth'});
    };
  });
}

