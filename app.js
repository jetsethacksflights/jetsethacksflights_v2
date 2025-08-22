/* Jetset Hacks v4.3 – smarter search (±3 days, fallback) + return date */

const els = {
  form: document.getElementById('searchForm'),
  date: document.getElementById('date'),
  flexDays: document.getElementById('flexDays'),
  retLabel: document.getElementById('returnLabel'),
  retDate: document.getElementById('returnDate'),
  tripType: document.getElementById('tripType'),
  airportsList: document.getElementById('airportsList'),
  status: document.getElementById('status'),
  tbody: document.querySelector('#resultsTable tbody'),
  provider: document.getElementById('providerHealth'),
  boards: {
    routes: document.querySelector('#board-routes .board-body'),
    dests: document.querySelector('#board-destinations .board-body'),
    compare: document.querySelector('#board-compare .board-body')
  },
  chipsWrap: document.getElementById('popularChipsWrap'),
  dlg: document.getElementById('detailDlg'),
  dlgTitle: document.getElementById('dlgTitle'),
  dlgBody: document.getElementById('dlgBody'),
  dlgClose: document.getElementById('dlgClose')
};

let FX={}, FLIGHTS=[], AIRPORTS=[], LAST_ROWS=[];

const q = (s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const fmt = n => (n==null ? '' : Number(n).toLocaleString('en-AU'));
async function getJSON(path, fallback){ try{ const r=await fetch(path,{cache:'no-store'}); if(!r.ok) throw 0; return await r.json(); }catch{ return fallback; }}

/* ---------- boot ---------- */
(async function(){
  AIRPORTS = await getJSON('/data/airports.json', [
    {code:'SYD',city:'Sydney',country:'Australia'},
    {code:'MEL',city:'Melbourne',country:'Australia'},
    {code:'LAX',city:'Los Angeles',country:'USA'}
  ]);
  els.airportsList.innerHTML = AIRPORTS.map(a=>`<option value="${a.code}">${a.city} — ${a.country}</option>`).join('');

  FLIGHTS = await getJSON('/data/flights.json', []);
  FX = await getJSON('/data/fx.json', {AUD:1});
  renderBoards(FLIGHTS);

  refreshProviders(); setInterval(refreshProviders,180000);
  wireUI();
})();

/* ---------- provider badge ---------- */
async function refreshProviders(){
  const list = await getJSON('/data/providers.json', []);
  if(!list.length){ els.provider.textContent='Providers: unavailable'; els.provider.style.color='#ffb'; return; }
  const ok=list.filter(p=>String(p.status).toLowerCase().includes('healthy')).length;
  els.provider.textContent = `Providers: ${ok}/${list.length} OK`;
  els.provider.style.color = ok===list.length ? '#0f0' : (ok? '#ffb' : '#f66');
}

/* ---------- UI ---------- */
function wireUI(){
  // uppercase IATA
  ['from','to'].forEach(id=>document.getElementById(id).addEventListener('input',e=>e.target.value=e.target.value.toUpperCase()));

  // return show/hide
  const toggleReturn=()=>{ const on=els.tripType.value==='return'; els.retLabel.hidden=!on; if(!on) els.retDate.value=''; };
  toggleReturn(); els.tripType.addEventListener('change',toggleReturn);

  // weekday quick chips
  $$('.chip[data-day]').forEach(btn=>{
    btn.onclick=()=>{
      const map={tue:2,wed:3,sat:6};
      const d=new Date(); const delta=(map[btn.dataset.day]-d.getDay()+7)%7||7;
      d.setDate(d.getDate()+delta);
      els.date.value=d.toISOString().slice(0,10);
    };
  });

  // currency change
  document.getElementById('curr').addEventListener('change',()=>render(LAST_ROWS));

  // submit
  els.form.addEventListener('submit', e=>{ e.preventDefault(); runSearch(); });

  // board tabs
  $$('.board-tab').forEach(b=>{
    b.onclick=()=>{
      $$('.board-tab').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      const key=b.dataset.board;
      document.getElementById('board-routes').hidden=(key!=='routes');
      document.getElementById('board-destinations').hidden=(key!=='destinations');
      document.getElementById('board-compare').hidden=(key!=='compare');
    };
  });

  els.dlgClose?.addEventListener('click',()=>els.dlg.close());
}

/* ---------- search ---------- */
function runSearch(){
  const params={
    from:(q('#from').value||'').toUpperCase(),
    to:(q('#to').value||'').toUpperCase(),
    date:els.date.value||'',
    returnDate:els.retDate.value||'',
    trip:els.tripType.value,
    flex:!!els.flexDays?.checked
  };
  let rows = FLIGHTS.slice();

  if(params.from) rows = rows.filter(r=>(r.from||'')===params.from);
  if(params.to)   rows = rows.filter(r=>(r.to||'')===params.to);

  // date filter with optional ±3 days window
  if(params.date){
    if(params.flex){
      const base=new Date(params.date);
      const inRange = d => {
        if(!d) return true;
        const x=new Date(d);
        const diff = Math.abs((x-base)/(1000*60*60*24));
        return diff<=3;
      };
      rows = rows.filter(r=>inRange(r.date));
    }else{
      rows = rows.filter(r=>!r.date || r.date===params.date);
    }
  }

  // Return filter (only when trip=return and returnDate chosen)
  if(params.trip==='return' && params.returnDate){
    if(params.flex){
      const base=new Date(params.returnDate);
      const inRange = d => {
        if(!d) return true;
        const x=new Date(d);
        const diff = Math.abs((x-base)/(1000*60*60*24));
        return diff<=3;
      };
      rows = rows.filter(r=>inRange(r.returnDate));
    }else{
      rows = rows.filter(r=>!r.returnDate || r.returnDate===params.returnDate).map(r=>({...r, rt:true}));
    }
  } else if(params.trip==='return'){
    rows = rows.map(r=>({...r, rt:true}));
  }

  // If still empty and we had a date filter → fallback to route‑only
  if(!rows.length && params.from && params.to){
    rows = FLIGHTS.filter(r=>r.from===params.from && r.to===params.to);
  }

  render(rows);
}

/* ---------- render helpers ---------- */
function toAUD(row){
  const curr=(row.currency||'AUD').toUpperCase();
  if(curr==='AUD') return row.price||0;
  const rate=FX[curr]; if(!rate) return row.price||0;
  return Math.round((row.price||0)/rate);
}
function cpp(aud,pts){ if(!aud||!pts) return ''; return ((aud*100)/pts).toFixed(2); }
function gfLink(r){
  const c=(r.cabin||'').toLowerCase();
  const cabin = c.includes('business')?'c=B':c.includes('premium')?'c=W':c.includes('first')?'c=F':'c=E';
  if(r.rt && r.returnDate) return `https://www.google.com/travel/flights?q=Flights%20from%20${r.from}%20to%20${r.to}%20on%20${r.date}%20return%20${r.returnDate}&${cabin}`;
  return `https://www.google.com/travel/flights?q=Flights%20from%20${r.from}%20to%20${r.to}%20on%20${r.date}&${cabin}`;
}
function rowHTML(r){
  const aud=toAUD(r), link=r.book_url||gfLink(r);
  const orig=(r.currency&&r.currency!=='AUD')?` <span class="orig">(${fmt(r.price)} ${r.currency})</span>`:'';
  const flt=[r.flightNumber,r.marketing_flight].filter(Boolean).join(' • ');
  return `<tr>
    <td>${r.date||''}${r.rt&&r.returnDate?`<div class="small">↩ ${r.returnDate}</div>`:''}</td>
    <td>${r.from||''}</td>
    <td>${r.to||''}</td>
    <td>${r.airline||''}${flt?` • ${flt}`:''}${r.alliance?` <span class="pill">${r.alliance}</span>`:''}</td>
    <td>${r.cabin||''}${r.rt?' • Return':''}</td>
    <td>$${fmt(aud)} AUD${orig}</td>
    <td>${fmt(r.points||'')}</td>
    <td>${cpp(aud,r.points)}</td>
    <td><a target="_blank" rel="noopener" href="${link}">Book</a></td>
    <td><button class="share-btn">Share</button></td>
  </tr>`;
}
function render(rows){
  LAST_ROWS = rows||[];
  els.tbody.innerHTML = LAST_ROWS.map(rowHTML).join('');
  els.status.textContent = LAST_ROWS.length ? `Results updated • ${new Date().toLocaleTimeString()}` : 'No results. Try different dates or nearby airports.';

  // share
  $$('.share-btn', q('#resultsTable')).forEach((b,i)=>{
    const r=LAST_ROWS[i], text=`${r.from}→${r.to} ${r.airline||''} ${r.cabin||''} • $${fmt(toAUD(r))} AUD`;
    b.onclick=async()=>{ if(navigator.share){try{await navigator.share({text,url:location.href});return;}catch{}}
      await navigator.clipboard.writeText(text); b.textContent='Copied!'; setTimeout(()=>b.textContent='Share',1000); };
  });

  // details dialog
  $$('#resultsTable tbody tr').forEach((tr,i)=>{
    tr.style.cursor='pointer';
    tr.onclick=()=>{
      const r=LAST_ROWS[i];
      els.dlgTitle.textContent=`${r.from} → ${r.to} (${r.cabin||''})`;
      els.dlgBody.innerHTML=`
        <ul>
          <li><strong>Airline:</strong> ${r.airline||''}</li>
          <li><strong>Flight:</strong> ${r.flightNumber||r.marketing_flight||''}</li>
          <li><strong>Alliance:</strong> ${r.alliance||'—'}</li>
          <li><strong>Price:</strong> $${fmt(toAUD(r))} AUD ${(r.currency&&r.currency!=='AUD')?`<span class="orig">(orig ${fmt(r.price)} ${r.currency})</span>`:''}</li>
          <li><strong>Points:</strong> ${fmt(r.points||'')}</li>
          <li><strong>Date:</strong> ${r.date||''}${r.rt&&r.returnDate?` (return ${r.returnDate})`:''}</li>
          <li><strong>Book:</strong> <a target="_blank" rel="noopener" href="${r.book_url||gfLink(r)}">Open</a></li>
        </ul>`;
      els.dlg.showModal();
    };
  });
}

/* ---------- boards ---------- */
function topN(arr,n,key){const m=new Map();arr.forEach(r=>{const k=key(r);m.set(k,(m.get(k)||0)+1)});return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,n);}
function renderBoards(all){
  els.boards.routes.innerHTML = topN(all,8,r=>`${r.from}-${r.to}`).map(([k,c])=>{
    const [f,t]=k.split('-'); return `<div class="item"><span>${f} → ${t}</span><span class="minor">${c} deals</span></div>`;
  }).join('') || '<div class="minor">No data</div>';

  const dests = topN(all,8,r=>r.to);
  els.boards.dests.innerHTML = dests.map(([to,c])=>`<div class="item"><span>${to}</span><span class="minor">${c} deals</span></div>`).join('') || '<div class="minor">No data</div>';
  els.chipsWrap.innerHTML = dests.slice(0,6).map(([to])=>`<button class="chip" data-popto="${to}">${to}</button>`).join('');
  $$('[data-popto]').forEach(b=>{
    b.onclick=()=>{ const from=q('#from'); const to=q('#to'); if(!from.value){ from.value=all.find(r=>r.to===b.dataset.popto)?.from||'SYD'; } to.value=b.dataset.popto; els.form.requestSubmit(); };
  });

  const MAJOR=new Set(['Qantas','Qatar','Singapore Airlines','United','American Airlines','JAL','ANA','Emirates','Cathay Pacific','Virgin Australia']);
  const buckets={major:0,budget:0}; const alliances={oneworld:0,skyteam:0,star:0,none:0};
  all.forEach(r=>{
    buckets[ MAJOR.has(r.airline)?'major':'budget' ]++;
    const a=(r.alliance||'').toLowerCase();
    if(a.includes('oneworld')) alliances.oneworld++; else if(a.includes('sky')) alliances.skyteam++; else if(a.includes('star')) alliances.star++; else alliances.none++;
  });
  els.boards.compare.innerHTML = `
    <div class="item"><span>Full‑service (major)</span><span class="minor">${buckets.major}</span></div>
    <div class="item"><span>Low‑cost (budget)</span><span class="minor">${buckets.budget}</span></div>
    <div class="item"><span>oneworld</span><span class="minor">${alliances.oneworld}</span></div>
    <div class="item"><span>SkyTeam</span><span class="minor">${alliances.skyteam}</span></div>
    <div class="item"><span>Star Alliance</span><span class="minor">${alliances.star}</span></div>
    <div class="item"><span>No alliance</span><span class="minor">${alliances.none}</span></div>`;
}


