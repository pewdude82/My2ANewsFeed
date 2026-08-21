(function () {
  "use strict";

  const html = document.documentElement;
  const base = html.dataset.base || "";

  function resolveLink(path) {
    return base + path;
  }

  function fixSiteLinks(container) {
    container.querySelectorAll("[data-site-link]").forEach((el) => {
      el.href = resolveLink(el.dataset.siteLink);
    });
  }

  function setActiveNav() {
    const page = html.dataset.page;
    if (!page) return;
    document.querySelectorAll("[data-nav]").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.nav === page);
    });
  }

  function initMobileNav(navEl) {
    const toggle = navEl.querySelector(".nav-toggle");
    const menu = navEl.querySelector(".nav-menu");
    if (!toggle || !menu) return;

    toggle.addEventListener("click", () => {
      const open = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });

    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        menu.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
      });
    });
  }

  function injectPartial(selector, url) {
    const slot = document.querySelector(selector);
    if (!slot) return Promise.resolve();

    return fetch(resolveLink(url), { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((html) => {
        slot.innerHTML = html;
        fixSiteLinks(slot);
        if (selector === "#site-nav") initMobileNav(slot);
      })
      .catch((err) => {
        console.error(`Failed to load ${url}:`, err);
      });
  }

  Promise.all([
    injectPartial("#site-nav", "partials/nav.html"),
    injectPartial("#site-footer", "partials/footer.html"),
  ]).then(setActiveNav);
})();
