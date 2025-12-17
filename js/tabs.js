document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".bottom-nav a");
  const sections = document.querySelectorAll(".tab-section");

  function showTab(tabId) {
    sections.forEach(section => {
      section.style.display =
        section.id === tabId ? "block" : "none";
    });

    tabs.forEach(tab => {
      tab.classList.toggle(
        "active",
        tab.dataset.tab === tabId
      );
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener("click", e => {
      e.preventDefault();
      const tabId = tab.dataset.tab;
      window.location.hash = tabId;
      showTab(tabId);
    });
  });

  // Load tab from URL hash
  const initialTab =
    window.location.hash.replace("#", "") || "home";

  showTab(initialTab);
});
