(function () {
  "use strict";

  const CATEGORY_ORDER = ["All", "Court Case", "Legislation", "Regulatory", "News", "Video"];

  const feedEl = document.getElementById("feed");
  const loadingMsg = document.getElementById("loading-msg");
  const emptyMsg = document.getElementById("empty-msg");
  const filterRow = document.getElementById("filter-row");
  const searchInput = document.getElementById("search-input");
  const updatedLine = document.getElementById("updated-line");
  const template = document.getElementById("card-template");

  let allItems = [];
  let activeCategory = "All";
  let searchTerm = "";

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

  function render() {
    const filtered = allItems.filter(matchesFilters);
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
      const source = node.querySelector("[data-source]");
      const date = node.querySelector("[data-date]");
      const title = node.querySelector("[data-title]");
      const tldr = node.querySelector("[data-tldr]");
      const link = node.querySelector("[data-link]");
      const ref = node.querySelector("[data-ref]");

      tag.textContent = item.category;
      tag.setAttribute("data-cat", item.category);
      stripe.style.background = getComputedStyle(tag).backgroundColor;
      source.textContent = item.source_name;
      date.textContent = fmtDate(item.published);
      title.textContent = item.title;
      tldr.textContent = item.tldr;
      link.href = item.link || "#";
      ref.textContent = `REF: ${item.id}`;

      frag.appendChild(node);
    });
    feedEl.appendChild(frag);
  }

  function init(data) {
    allItems = data.items || [];
    loadingMsg.hidden = true;
    const rel = fmtRelativeUpdated(data.generated_at);
    updatedLine.innerHTML = `<span class="live-dot"></span>${allItems.length} items tracked${rel ? " · " + rel : ""}`;
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
      loadingMsg.textContent = "Couldn't load the briefing data. Check that data/data.json exists and the Action has run at least once.";
      updatedLine.textContent = "";
      console.error(err);
    });
})();
