/*  
==========================================
  INTAKEE — TABS NAVIGATION SYSTEM
==========================================
*/

// All tab IDs in your HTML
const TABS = ["home", "videos", "podcasts", "upload", "clips", "profile", "settings"];

// Elements
const header = document.getElementById("mainHeader");
const searchBar = document.getElementById("globalSearchBar");

// Main showTab function
export function showTab(tabName) {
    console.log("Switching to:", tabName);

    TABS.forEach(t => {
        const section = document.getElementById(t);
        if (section) {
            section.style.display = (t === tabName) ? "block" : "none";
        }
    });

    // Update active bottom nav
    document.querySelectorAll(".bottom-nav a").forEach(btn => {
        btn.classList.remove("active");
        if (btn.dataset.tab === tabName) btn.classList.add("active");
    });

    // Header visibility
    if (tabName === "upload" || tabName === "profile") {
        header.style.display = "none";
    } else {
        header.style.display = "flex";
    }

    // Search bar visibility
    if (["home", "videos", "podcasts", "clips"].includes(tabName)) {
        searchBar.style.display = "flex";
    } else {
        searchBar.style.display = "none";
    }

    // Update URL
    location.hash = tabName;

    window.scrollTo(0, 0);
}

// Add click handlers to bottom nav buttons
document.querySelectorAll(".bottom-nav a").forEach(btn => {
    btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        showTab(tab);
    });
});

// Load correct tab on refresh
window.addEventListener("load", () => {
    let initial = location.hash.replace("#", "");
    if (!TABS.includes(initial)) initial = "home";
    showTab(initial);
});

// Handle back/forward browser buttons
window.addEventListener("hashchange", () => {
    const tab = location.hash.replace("#", "");
    if (TABS.includes(tab)) showTab(tab);
});
