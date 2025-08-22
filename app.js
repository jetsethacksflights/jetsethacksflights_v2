// app.js — Jetset Hacks v2.0 (No Code Needed)
// Fully mobile-friendly, comparison, drill-down, direct links

// Load popular routes
async function loadPopularRoutes() {
  const container = document.querySelector('#board-routes .board-body');
  if (!container) return;

  container.innerHTML = '🔍 Loading the best flight deals...';

  try {
    const url = 'https://raw.githubusercontent.com/jetsethacksflights/jetsethacksflight/main/data/live_deals.json';
    const response = await fetch(url);
    if (!response.ok) throw new Error('No data');

    const data = await response.json();
    const deals = Array.isArray(data.items) ? data.items : [];

    if (deals.length === 0) {
      container.innerHTML = '<p>No deals found.</p>';
      return;
    }

    container.innerHTML = '';

    deals.sort((a, b) => (a.aud || 99999) - (b.aud || 99999));

    deals.slice(0, 6).forEach(deal => {
      const price = deal.aud ? `$${Math.round(deal.aud)}` : 'Check Link';
      const cabin = (deal.cabin || 'economy').charAt(0).toUpperCase();

      const div = document.createElement('div');
      div.className = 'deal-item';
      div.innerHTML = `
        <div class="route"><strong>${deal.from} → ${deal.to}</strong></div>
        <div class="airline">${deal.provider}</div>
        <div class="price">${price} <small>${cabin}</small></div>
        <a href="${deal.url}" target="_blank" class="btn btn-sm">View</a>
      `;
      container.appendChild(div);
    });

    // Update timestamp
    document.getElementById('lastUpdated')?.textContent = new Date().toLocaleString();
    document.getElementById('providerHealth').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;

  } catch (error) {
    container.innerHTML = `<p style="color:#d93025">Failed to load deals</p>`;
    console.error("Load error:", error);
  }
}

// Load comparison table
async function loadComparison() {
  const container = document.getElementById('comparison-container');
  if (!container) return;

  container.innerHTML = '<p>Loading comparisons...</p>';

  try {
    const url = 'https://raw.githubusercontent.com/jetsethacksflights/jetsethacksflight/main/data/live_deals.json';
    const response = await fetch(url);
    if (!response.ok) throw new Error('No data');

    const data = await response.json();
    const deals = Array.isArray(data.items) ? data.items : [];

    const groups = { 'non-airline': [], 'major': [], 'discount': [] };

    deals.forEach(deal => {
      const provider = (deal.provider || '').toLowerCase();
      if (['going', 'kiwi', 'skyscanner', 'seat.aero'].includes(provider)) {
        groups['non-airline'].push(deal);
      } else if (['qantas', 'japan airlines', 'virgin australia', 'united', 'delta'].includes(provider)) {
        groups['major'].push(deal);
      } else if (['scoot', 'jetstar', 'rex', 'airasia', 'ryanair'].includes(provider)) {
        groups['discount'].push(deal);
      }
    });

    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => (a.aud || 99999) - (b.aud || 99999));
    });

    let html = '';
    Object.keys(groups).forEach(key => {
      const title = key === 'non-airline' ? '🔍 Non-airline sites' :
                    key === 'major' ? '✈️ Major airlines' : '💰 Discount airlines';
      html += `<div class="comparison-group"><h3>${title}</h3>`;
      groups[key].slice(0, 3).forEach(deal => {
        const price = deal.aud ? `$${Math.round(deal.aud)}` : 'Check Link';
        const flightNum = deal.flight_number || 'Not specified';
        const operatedBy = deal.operated_by || deal.provider;
        html += `
          <div class="deal-item">
            <div class="provider">${deal.provider}</div>
            <div class="details">${deal.from} → ${deal.to} • ${deal.cabin}<br>Flight ${flightNum} • Operated by ${operatedBy}</div>
            <div class="price">${price}</div>
            <a href="${deal.url}" target="_blank" class="btn btn-sm">Book</a>
          </div>
        `;
      });
      html += '</div>';
    });

    container.innerHTML = html;

  } catch (error) {
    container.innerHTML = `<p style="color:#d93025">Failed to load comparisons</p>`;
  }
}

// Show flight details
function showDetails(deal) {
  const dlg = document.getElementById('detailDlg');
  const body = document.getElementById('dlgBody');
  const title = document.getElementById('dlgTitle');

  title.textContent = `Flight Details: ${deal.from} → ${deal.to}`;
  body.innerHTML = `
    <table style="width:100%; border-collapse:collapse; margin:16px 0;">
      <tr><td><strong>From:</strong></td><td>${deal.from}</td></tr>
      <tr><td><strong>To:</strong></td><td>${deal.to}</td></tr>
      <tr><td><strong>Cabin:</strong></td><td>${deal.cabin}</td></tr>
      <tr><td><strong>Price:</strong></td><td>${deal.aud ? '$' + Math.round(deal.aud) : 'Check Link'}</td></tr>
      <tr><td><strong>Airline:</strong></td><td>${deal.provider || 'Unknown'}</td></tr>
      <tr><td><strong>Operated by:</strong></td><td>${deal.operated_by || 'Same as airline'}</td></tr>
      <tr><td><strong>Flight #:</strong></td><td>${deal.flight_number || 'Not specified'}</td></tr>
      <tr><td><strong>Link:</strong></td><td><a href="${deal.url}" target="_blank">Open in Google Flights</a></td></tr>
    </table>
    <p class="minor">Data updated daily. Not a booking service.</p>
  `;

  dlg.showModal();
  document.getElementById('dlgClose').onclick = () => dlg.close();
}

// On load
document.addEventListener('DOMContentLoaded', () => {
  loadPopularRoutes();
  loadComparison();
});



