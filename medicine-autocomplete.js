// Wires the National List of Essential Medicines (NLEM 2022, Govt of India —
// data/nlem_medicines.json) into any medicine-name text input as a live
// suggest-as-you-type dropdown, using the browser's native <datalist>.
//
// This is deliberately non-strict: typing something not in the list still
// works. NLEM only lists generic drug names (e.g. "Paracetamol"), while real
// pharmacy stock/prescriptions use brand + strength ("Dolo 650", "Crocin
// 500") — those aren't in NLEM at all, so a hard "must pick from list" would
// break existing data. This just makes the official 384-medicine list one
// keystroke away, everywhere a medicine name is entered.
//
// Usage: add `data-medicine-autocomplete` to any <input type="text">, and
// include this script on the page (after the DOM, or it'll wire on
// DOMContentLoaded). New matching inputs added later (e.g. inside a modal
// opened after page load) can be picked up by calling
// window.__wireMedicineAutocomplete() again.
(function () {
  const DATALIST_ID = "nlemMedicineDatalist";
  let ensurePromise = null;

  function escapeAttr(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function ensureDatalist() {
    if (ensurePromise) return ensurePromise;
    ensurePromise = fetch("/data/nlem_medicines.json")
      .then((res) => res.json())
      .then((medicines) => {
        const datalist = document.createElement("datalist");
        datalist.id = DATALIST_ID;
        datalist.innerHTML = medicines.map((m) => `<option value="${escapeAttr(m.genericName)}"></option>`).join("");
        document.body.appendChild(datalist);
      })
      .catch((err) => {
        console.error("Could not load NLEM medicine list:", err);
      });
    return ensurePromise;
  }

  function wireInputs() {
    document.querySelectorAll("input[data-medicine-autocomplete]").forEach((input) => {
      input.setAttribute("list", DATALIST_ID);
    });
  }

  window.__wireMedicineAutocomplete = async function () {
    await ensureDatalist();
    wireInputs();
  };

  document.addEventListener("DOMContentLoaded", () => {
    window.__wireMedicineAutocomplete();
  });
})();
