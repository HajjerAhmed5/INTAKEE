// script.js for INTAKEE app navigation and functionality

document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll("nav button");
  const sections = document.querySelectorAll("main section");

  // Switch tab function
  function showTab(tabId) {
    sections.forEach(section => {
      section.classList.remove("active");
    });
    document.getElementById(tabId).classList.add("active");
  }

  // Set up tab clicks
  tabs.forEach(button => {
    button.addEventListener("click", () => {
      const target = button.getAttribute("data-tab");
      showTab(target);
    });
  });

  // Default tab on load
  showTab("home");
});
