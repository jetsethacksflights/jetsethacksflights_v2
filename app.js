// app.js - Loads flight deals and shows them on your site

async function loadPopularRoutes() {
  const container = document.querySelector('#board-routes .board-body');
  if (!container) return;

  container.innerHTML = '🔍 Loading the best flight deals...';

  try {
    // 🔗 REPLACE THESE TWO LINES:
    const USERNAME = 'your-github-username';   // ← Change this
    const REPO     = 'your-repo-name';         // ← Change this

    const response = await fetch(`https://raw.githubusercontent.com/${USERNAME}/${REPO}/main/data/live_deals.json`);
    
    if (!response.ok) throw new Error('File not found');

    const data = await response.json();
    const deals = data.items || [];

    container.innerHTML = ''; // Clear loading

    if (deals.length === 0) {
      container.innerHTML = '<p>No deals found yet.</p>';
      return;
    }

    // Show each deal
    deals.forEach(deal => {
      const price = deal.aud ? `$${Math.round(deal.aud)}` : 'Check Link';
      const cabin = deal.cabin.charAt(0).toUpperCase();
      const airline = deal.operated_by || deal.provider;

      const div = document.createElement('div');
      div.className = 'deal-item';
      div.innerHTML = `
        <div class="route"><strong>${deal.from} → ${deal.to}</strong></div>
        <div class="airline">${airline}</div>
        <div class="price">${price} <small>${cabin}</small></div>
        <a href="${deal.url}" target="_blank" class="btn btn-sm">View</a>
      `;
      container.appendChild(div);
    });

    // Optional: update header
    document.getElementById('providerHealth').textContent = 
      `Last updated: ${new Date().toLocaleTimeString()} — ${deals.length} deals`;

  } catch (error) {
    container.innerHTML = `
      <p style="color:#d93025">
        🚨 Can't load deals. Check your GitHub settings.
      </p>
    `;
    console.error("Load failed:", error);
  }
}

// Run when page loads
document.addEventListener('DOMContentLoaded', loadPopularRoutes);



