(function () {
  "use strict";

  const guide = document.querySelector("[data-state-guide]");
  if (!guide) return;

  const searchInput = document.getElementById("guide-search");
  const tocLinks = guide.querySelectorAll(".guide-toc a");
  const sections = guide.querySelectorAll("[data-guide-section]");
  const noResults = document.getElementById("guide-no-results");
  const tocToggle = document.getElementById("guide-toc-toggle");
  const tocPanel = document.getElementById("guide-toc");

  function normalize(text) {
    return text.toLowerCase().trim();
  }

  function sectionMatches(section, query) {
    if (!query) return true;
    const haystack = normalize(section.textContent);
    return haystack.includes(query);
  }

  function applySearch() {
    const query = searchInput ? normalize(searchInput.value) : "";
    let visibleCount = 0;

    sections.forEach((section) => {
      const match = sectionMatches(section, query);
      section.hidden = !match;
      if (match) visibleCount += 1;
    });

    if (noResults) noResults.hidden = visibleCount > 0 || !query;

    tocLinks.forEach((link) => {
      const id = link.getAttribute("href")?.slice(1);
      const section = id ? document.getElementById(id)?.closest("[data-guide-section]") : null;
      link.parentElement.hidden = section ? section.hidden : false;
    });
  }

  function setActiveToc(id) {
    tocLinks.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === `#${id}`);
    });
  }

  function initScrollSpy() {
    const headings = guide.querySelectorAll("[data-guide-section] [id]");
    if (!headings.length || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target?.id) setActiveToc(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );

    headings.forEach((el) => observer.observe(el));
  }

  if (searchInput) {
    searchInput.addEventListener("input", applySearch);
  }

  if (tocToggle && tocPanel) {
    tocToggle.addEventListener("click", () => {
      const open = tocPanel.classList.toggle("is-open");
      tocToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  applySearch();
  initScrollSpy();
})();
