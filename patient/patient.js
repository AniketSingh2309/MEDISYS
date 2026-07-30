(function () {
  async function guardSession() {
    const res = await fetch("/api/session", { credentials: "same-origin" });
    const data = await res.json();

    if (!data.user || data.user.role !== "patient") {
      window.location.href = "../index.html";
      return null;
    }

    document.getElementById("portalUser").textContent = data.user.userId;
    return data.user;
  }

  function wireLogout() {
    document.getElementById("logoutBtn").addEventListener("click", async () => {
      await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
      window.location.href = "../index.html";
    });
  }

  async function loadProfile() {
    const res = await fetch("/api/me", { credentials: "same-origin" });
    const data = await res.json();
    if (!data.success) return;

    const { fullName, hospitalName } = data.profile;
    document.getElementById("welcomeHeading").textContent = `Welcome, ${fullName}`;
    document.getElementById("patientSubtitle").textContent = `Patient at ${hospitalName}`;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const user = await guardSession();
    if (!user) return;
    wireLogout();
    loadProfile();
  });
})();
