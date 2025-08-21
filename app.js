/* === JetsetHacks v4 App === */

// DOM ready helper
document.addEventListener("DOMContentLoaded", () => {
  initDateChips();
  initBoardTabs();
  initShareButtons();
  initProviderHealth();
  registerServiceWorker();
});

/* ---------------- Date Quick-Pick Chips ---------------- */
function initDateChips() {
  const chipContainer = document.querySelector(".chips");
  if (!chipContainer) return;

  const today = new Date();
  const opts = [3, 7, 14, 30]; // days ahead
  opts.forEach(days => {
    const d = new Date();
    d.setDate(today.getDate() + days);
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.textContent = `${d.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
    })}`;
    btn.addEventListener("click", () => {
      document.querySelector("#depart").value = d.toISOString().slice(0, 10);
    });
    chipContainer.appendChild(btn);
  });
}

/* ---------------- Popular Destinations Tabs ---------------- */
function initBoardTabs() {
  const tabs = document.querySelectorAll(".board-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      // Could filter results by tab.dataset.dest later
      console.log("Selected popular tab:", tab.textContent);
    });
  });
}

/* ---------------- Share Buttons ---------------- */
function initShareButtons() {
  document.body.addEventListener("click", e => {
    if (e.target.classList.contains("share")) {
      const row = e.target.closest("tr");
      const flightInfo = row ? row.innerText : "Check this flight deal!";
      if (navigator.share) {
        navigator
          .share({
            title: "JetsetHacks Flight Deal",
            text: flightInfo,
            url: window.location.href,
          })
          .catch(err => console.warn("Share cancelled", err));
      } else {
        navigator.clipboard.writeText(flightInfo);
        alert("Copied flight info to clipboard!");
      }
    }
  });
}

/* ---------------- Provider Health Badge ---------------- */
function initProviderHealth() {
  const badge = document.querySelector(".provider-health");
  if (!badge) return;

  // Fake check (replace with API ping)
  badge.textContent = "Providers: Checking...";
  setTimeout(() => {
    badge.textContent = "Providers: ✅ Online";
    badge.style.color = "#0f0";
  }, 1000);
}

/* ---------------- Service Worker ---------------- */
function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => console.log("ServiceWorker registered"))
      .catch(err => console.error("SW fail", err));
  }
}
