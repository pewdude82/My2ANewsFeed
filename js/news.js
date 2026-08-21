(function () {
  "use strict";

  const CATEGORY_ORDER = ["All", "Court Case", "Legislation", "Regulatory", "News", "Video"];
  const CATEGORY_LABELS = {
    "Court Case": "Court Cases",
    Legislation: "Legislation",
    Regulatory: "Regulatory",
    News: "News",
    Video: "Videos",
  };
  const feedPath = (document.documentElement.dataset.base || "") + "data/data.json";

  const listEl = document.getElementById("briefing-list");
  if (!listEl) return;

  const emptyMsg = document.getElementById("empty-msg");
  const searchInput = document.getElementById("search-input");
  const updatedLine = document.getElementById("updated-line");
  const leadEl = document.getElementById("lead");
  const template = document.getElementById("item-template");
  const leadTemplate = document.getElementById("lead-template");
  const briefingContext = document.getElementById("briefing-context");
  const pageHeading = document.getElementById("page-heading");

  let allItems = [];
  let activeCategory = "All";
  let searchTerm = "";

  const catParam = new URLSearchParams(window.location.search).get("cat");
  if (catParam && CATEGORY_ORDER.includes(catParam)) {
    activeCategory = catParam;
  }

  function faviconUrl(link) {
    try {
      const u = new URL(link);
      return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
    } catch (e) {
      return "";
    }
  }

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

  function applyVideoThumb(node, item) {
    const thumbLink = node.querySelector("[data-thumb-link]");
    const thumbImg = node.querySelector("[data-thumb]");
    const listItem = node.querySelector(".briefing-item");
    if (!thumbLink || !thumbImg || !listItem) return;

    const vid = item.source_type === "youtube" ? youtubeId(item.link) : null;
    if (item.category === "Video" && vid) {
      thumbImg.src = `https://img.youtube.com/vi/${vid}/mqdefault.jpg`;
      thumbImg.alt = item.title;
      thumbLink.href = item.link || "#";
      thumbLink.hidden = false;
      listItem.classList.add("briefing-item--video");
    } else {
      thumbLink.hidden = true;
      listItem.classList.remove("briefing-item--video");
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

  function updateCategoryUI() {
    const filtered = activeCategory !== "All";
    if (briefingContext) briefingContext.hidden = !filtered;
    if (pageHeading && filtered) {
      pageHeading.textContent = CATEGORY_LABELS[activeCategory] || activeCategory;
    }
    if (filtered) {
      document.title = `${CATEGORY_LABELS[activeCategory] || activeCategory} — The 2A Ledger`;
    }
  }

  function matchesFilters(item) {
    const catOk = activeCategory === "All" || item.category === activeCategory;
    if (!catOk) return false;
    if (!searchTerm) return true;
    const haystack = `${item.title} ${item.tldr} ${item.source_name}`.toLowerCase();
    return haystack.includes(searchTerm);
  }

  function fillItem(node, item) {
    const tag = node.querySelector("[data-tag]");
    const favicon = node.querySelector("[data-favicon]");
    const source = node.querySelector("[data-source]");
    const date = node.querySelector("[data-date]");
    const titleLink = node.querySelector("[data-title-link]");
    const tldr = node.querySelector("[data-tldr]");
    const link = node.querySelector("[data-link]");

    tag.textContent = item.category;
    tag.setAttribute("data-cat", item.category);
    favicon.src = faviconUrl(item.link);
    source.textContent = item.source_name;
    date.textContent = fmtDate(item.published);
    date.setAttribute("datetime", item.published || "");
    titleLink.textContent = item.title;
    titleLink.href = item.link || "#";
    tldr.textContent = item.tldr;
    if (link) link.href = item.link || "#";

    const listItem = node.querySelector(".briefing-item");
    if (listItem) listItem.setAttribute("data-cat", item.category);
    applyVideoThumb(node, item);
  }

  function renderLead(item) {
    if (!leadEl || !leadTemplate) return;
    if (!item) {
      leadEl.hidden = true;
      leadEl.innerHTML = "";
      return;
    }
    leadEl.innerHTML = "";
    const node = leadTemplate.content.cloneNode(true);
    fillItem(node, item);
    leadEl.appendChild(node);
    leadEl.hidden = false;
  }

  function pickLead() {
    const substantive = allItems
      .filter((i) => i.category === "Court Case" || i.category === "Legislation")
      .sort((a, b) => new Date(b.published) - new Date(a.published));
    return substantive[0] || allItems[0] || null;
  }

  function render() {
    const showLead = activeCategory === "All" && !searchTerm;
    const lead = showLead ? pickLead() : null;
    renderLead(lead);

    const filtered = allItems
      .filter(matchesFilters)
      .filter((i) => !lead || i.id !== lead.id)
      .sort((a, b) => new Date(b.published) - new Date(a.published));

    listEl.innerHTML = "";

    if (filtered.length === 0) {
      if (emptyMsg) emptyMsg.hidden = false;
      return;
    }
    if (emptyMsg) emptyMsg.hidden = true;

    const frag = document.createDocumentFragment();
    filtered.forEach((item) => {
      const node = template.content.cloneNode(true);
      fillItem(node, item);
      frag.appendChild(node);
    });
    listEl.appendChild(frag);
  }

  function init(data) {
    allItems = data.items || [];
    const rel = fmtRelativeUpdated(data.generated_at);
    if (updatedLine) {
      updatedLine.innerHTML = `<span class="live-dot"></span>${allItems.length} items tracked${rel ? " · " + rel : ""}`;
    }
    updateCategoryUI();
    render();
  }

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchTerm = e.target.value.trim().toLowerCase();
      render();
    });
  }

  fetch(feedPath, { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(init)
    .catch((err) => {
      listEl.innerHTML = "<li class=\"briefing-empty\">Couldn't load the briefing. Check that data/data.json exists and the Action has run at least once.</li>";
      if (updatedLine) updatedLine.textContent = "";
      console.error(err);
    });
})();
