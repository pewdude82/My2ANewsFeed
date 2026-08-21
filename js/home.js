(function () {
  "use strict";

  const listEl = document.getElementById("latest-list");
  if (!listEl) return;

  const feedPath = (document.documentElement.dataset.base || "") + "data/data.json";

  function fmtDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function renderLatest(items) {
    const latest = items
      .slice()
      .sort((a, b) => new Date(b.published) - new Date(a.published))
      .slice(0, 4);

    if (latest.length === 0) {
      listEl.innerHTML = '<li class="latest-empty">No headlines yet — check back after the feed updates.</li>';
      return;
    }

    listEl.innerHTML = latest
      .map(
        (item) => `
      <li>
        <a class="latest-item" href="${item.link || "#"}" target="_blank" rel="noopener noreferrer">
          <span class="tag" data-cat="${item.category}">${item.category}</span>
          <span class="latest-title">${item.title}</span>
          <span class="latest-meta">${item.source_name}${fmtDate(item.published) ? " · " + fmtDate(item.published) : ""}</span>
        </a>
      </li>`
      )
      .join("");
  }

  fetch(feedPath, { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => renderLatest(data.items || []))
    .catch(() => {
      listEl.innerHTML = '<li class="latest-empty">Headlines unavailable — open the full briefing to browse.</li>';
    });
})();
