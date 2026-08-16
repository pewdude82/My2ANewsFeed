(function () {
  "use strict";

  const CATEGORY_ORDER = ["All", "Court Case", "Legislation", "Regulatory", "News", "Video"];

  const feedEl = document.getElementById("feed");
  const skeletonGrid = document.getElementById("skeleton-grid");
  const emptyMsg = document.getElementById("empty-msg");
  const filterRow = document.getElementById("filter-row");
  const searchInput = document.getElementById("search-input");
  const updatedLine = document.getElementById("updated-line");
  const statTickerInner = document.getElementById("stat-ticker-inner");
  const leadEl = document.getElementById("lead");
  const template = document.getElementById("card-template");
  const leadTemplate = document.getElementById("lead-template");

  let allItems = [];
  let activeCategory = "All";
  let searchTerm = "";

  function youtubeId(url) {
    if (!url) return null;
    try {
      const u = new URL(url);
      if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      return null;
    } catch (e) {
      return null;
    }
  }

  function faviconUrl(link) {
    try {
      const u = new URL(link);
      return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
    } catch (e) {
      return "";
    }
  }

  function applyThumb(node, item) {
    const thumbLink = node.querySelector("[data-thumb-link]");
    const thumbImg = node.querySelector("[data-thumb]");
    const playBadge = node.querySelector("[data-play-badge]");
    const vid = item.source_type === "youtube" ? youtubeId(item.link) : null;
    if (vid) {
      thumbImg.src = `https://img.youtube.com/vi/${vid}/mqdefault.jpg`;
      thumbImg.alt = item.title;
      thumbLink.href = item.link || "#";
      thumbLink.hidden = false;
      playBadge.hidden = false;
    } else {
      thumbLink.hidden = true;
    }
  }

  function fmtDate(iso) {
    if (!iso) return "Undated";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Undated";
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function fmtRelativeUpdated(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const diffMs = Date.now() - d.getTime();
    const diffHrs = Math.floor(diffMs / 36e5);
    if (diffHrs < 1) return "updated moments ago";
    if (diffHrs === 1) return "updated 1 hour ago";
    if (diffHrs < 24) return `updated ${diffHrs} hours ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `updated ${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }

  function buildFilterButtons() {
    filterRow.innerHTML = "";
    CATEGORY_ORDER.forEach((cat) => {
      const btn = document.createElement("button");
      btn.className = "filter-btn" + (cat === activeCategory ? " active" : "");
      btn.type = "button";
      btn.setAttribute("role", "tab");
      btn.dataset.cat = cat;
      btn.textContent = cat;
      btn.addEventListener("click", () => {
        activeCategory = cat;
        buildFilterButtons();
        render();
      });
      filterRow.appendChild(btn);
    });
  }

  function matchesFilters(item) {
    const catOk = activeCategory === "All" || item.category === activeCategory;
    if (!catOk) return false;
    if (!searchTerm) return true;
    const haystack = `${item.title} ${item.tldr} ${item.source_name}`.toLowerCase();
    return haystack.includes(searchTerm);
  }

  function fillCommon(node, item) {
    const tag = node.querySelector("[data-tag]");
    const favicon = node.querySelector("[data-favicon]");
    const source = node.querySelector("[data-source]");
    const date = node.querySelector("[data-date]");
    const title = node.querySelector("[data-title]");
    const tldr = node.querySelector("[data-tldr]");
    const link = node.querySelector("[data-link]");

    tag.textContent = item.category;
    tag.setAttribute("data-cat", item.category);
    favicon.src = faviconUrl(item.link);
    source.textContent = item.source_name;
    date.textContent = fmtDate(item.published);
    title.textContent = item.title;
    tldr.textContent = item.tldr;
    link.href = item.link || "#";
    applyThumb(node, item);
  }

  function renderLead(item) {
    if (!item) {
      leadEl.hidden = true;
      leadEl.innerHTML = "";
      return;
    }
    leadEl.innerHTML = "";
    const node = leadTemplate.content.cloneNode(true);
    fillCommon(node, item);
    const isVideo = item.source_type === "youtube" && youtubeId(item.link);
    node.querySelector(".lead-card").classList.toggle("no-thumb", !isVideo);
    leadEl.appendChild(node);
    leadEl.hidden = false;
  }

  function pickLead() {
    // Prefer the most recent Court Case or Legislation item as the lead —
    // gives the page editorial weight instead of just surfacing whatever's newest.
    const substantive = allItems
      .filter((i) => i.category === "Court Case" || i.category === "Legislation")
      .sort((a, b) => new Date(b.published) - new Date(a.published));
    return substantive[0] || allItems[0] || null;
  }

  function render() {
    const lead = activeCategory === "All" && !searchTerm ? pickLead() : null;
    renderLead(lead);

    const filtered = allItems.filter(matchesFilters).filter((i) => !lead || i.id !== lead.id);
    feedEl.innerHTML = "";

    if (filtered.length === 0) {
      emptyMsg.hidden = false;
      return;
    }
    emptyMsg.hidden = true;

    const frag = document.createDocumentFragment();
    filtered.forEach((item) => {
      const node = template.content.cloneNode(true);
      const stripe = node.querySelector("[data-stripe]");
      const tag = node.querySelector("[data-tag]");
      const ref = node.querySelector("[data-ref]");
      fillCommon(node, item);
      stripe.style.background = getComputedStyle(tag).backgroundColor;
      ref.textContent = `REF: ${item.id}`;
      frag.appendChild(node);
    });
    feedEl.appendChild(frag);
  }

  function buildStatTicker() {
    const counts = allItems.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {});
    const parts = [
      counts["Court Case"] ? `<span class="stat-item"><strong>${counts["Court Case"]}</strong> court filings tracked</span>` : "",
      counts["Legislation"] ? `<span class="stat-item"><strong>${counts["Legislation"]}</strong> bills in motion</span>` : "",
      counts["Video"] ? `<span class="stat-item"><strong>${counts["Video"]}</strong> briefing videos</span>` : "",
      counts["News"] ? `<span class="stat-item"><strong>${counts["News"]}</strong> news items</span>` : "",
    ].filter(Boolean);
    statTickerInner.innerHTML = parts.join("");
  }

  function init(data) {
    allItems = data.items || [];
    skeletonGrid.remove();
    const rel = fmtRelativeUpdated(data.generated_at);
    updatedLine.innerHTML = `<span class="live-dot"></span>${allItems.length} items tracked${rel ? " · " + rel : ""}`;
    buildStatTicker();
    buildFilterButtons();
    render();
  }

  searchInput.addEventListener("input", (e) => {
    searchTerm = e.target.value.trim().toLowerCase();
    render();
  });

  fetch("data/data.json", { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(init)
    .catch((err) => {
      skeletonGrid.innerHTML = '<p class="empty-msg" style="grid-column:1/-1;">Couldn\'t load the briefing data. Check that data/data.json exists and the Action has run at least once.</p>';
      updatedLine.textContent = "";
      console.error(err);
    });
})();
