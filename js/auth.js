onAuthStateChanged(auth, async (user) => {
  window.__AUTH_READY__ = true;
  hideSpinner();

  if (!user) {
    headerUsername.style.display = "none";
    openAuthBtn && (openAuthBtn.style.display = "inline-block");
    return;
  }

  // ✅ AUTH UI FIRST (NO FIRESTORE)
  headerUsername.textContent = "@loading";
  headerUsername.style.display = "inline-block";
  openAuthBtn && (openAuthBtn.style.display = "none");
  authDialog?.close();

  // 🔁 Firestore is OPTIONAL
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      headerUsername.textContent = "@" + snap.data().username;
    } else {
      headerUsername.textContent = "@user";
    }
  } catch (err) {
    console.warn("⚠️ Firestore unavailable, auth still valid");
    headerUsername.textContent = "@user";
  }
});
