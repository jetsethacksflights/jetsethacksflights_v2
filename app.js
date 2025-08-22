// app.js — Load flight deals from scraper repo

async function loadPopularRoutes() {
  const container = document.querySelector('#board-routes .board-body');
  const health = document.getElementById('providerHealth');
  if (!container) return;

  container.innerHTML = '🔍 Loading the best flight deals...';

  try {
    const url = 'https://raw.githubusercontent.com/jetsethacksflights/jetsethacksflight/main/data/live_deals.json';

    const response = await fetch(url);
    if (!response.ok) throw new Error('No data');

    const data = await response.json();
    const deals = Array.isArray(data.items) ? data.items : [];

    if (deals.length === 0) {
      container.innerHTML = '<p>No deals found. Check back soon!</p>';
      return;
    }

    container.innerHTML = '';

    // Sort by price (null prices go last)
    deals.sort((a, b) => {
      if (a.aud !== null && b.aud !== null) return a.aud - b.aud;
      if (a.aud === null) return 1;
      if (b.aud === null) return -1;
      return 0;
    });

    // Show top 6 deals
    deals.slice(0, 6).forEach(deal => {
      const price = deal.aud ? `$${Math.round(deal.aud)}` : 'Check Link';
      const cabin = (deal.cabin || 'economy').charAt(0).toUpperCase();

      const div = document.createElement('div');
      div.className = 'deal-item';
      div.innerHTML = `
        <div class="route"><strong>${deal.from} → ${deal.to}</strong></div>
        <div class="airline">${deal.provider}</div>
        <div class="price">${price} <small>${cabin}</small></div>
        <a href="${deal.url}" target="_blank" class="btn btn-primary btn-sm">View</a>
      `;
      container.appendChild(div);
    });

    health.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;

  } catch (error) {
    container.innerHTML = `<p style="color:#d93025">Failed to load deals</p>`;
    console.error("Error:", error);
  }
}

document.addEventListener('DOMContentLoaded', loadPopularRoutes);



