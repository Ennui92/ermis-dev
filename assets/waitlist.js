// ermis.dev waitlist — talks to the ermis-waitlist Cloudflare Worker.
// Drop a <section class="waitlist" data-source="..."> with the expected
// fields into any page and it works.

(() => {
  const API = "https://ermis-waitlist.feepok.workers.dev/waitlist";

  const section = document.querySelector(".waitlist");
  if (!section) return;
  const source = section.dataset.source || "unknown";
  const form = section.querySelector("#waitlist-form");
  const emailInput = section.querySelector("#waitlist-email");
  const websiteInput = section.querySelector("#waitlist-website");
  const status = section.querySelector("#waitlist-status");
  const submit = section.querySelector("#waitlist-submit");
  const countEl = section.querySelector("#waitlist-count");

  const formMountedAt = Date.now();

  function turnstileToken() {
    const fld = form.querySelector('input[name="cf-turnstile-response"]');
    return fld ? fld.value : "";
  }

  async function loadCount() {
    if (!countEl) return;
    try {
      const res = await fetch(`${API}/count`);
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.count === "number" && data.count > 0) {
        countEl.textContent = `${data.count} already on the list.`;
      }
    } catch {}
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.className = "comment-status";
    status.textContent = "";

    const email = emailInput.value.trim();
    if (!email) {
      status.classList.add("is-error");
      status.textContent = "Enter your email first.";
      return;
    }

    const token = turnstileToken();
    if (!token) {
      status.classList.add("is-error");
      status.textContent = "Solve the captcha first.";
      return;
    }

    submit.disabled = true;
    status.textContent = "Adding you…";

    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source,
          turnstileToken: token,
          website: websiteInput ? websiteInput.value : "",
          formAgeMs: Date.now() - formMountedAt,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        status.classList.add("is-error");
        status.textContent = data.error || "Could not sign up. Try again.";
        if (window.turnstile) window.turnstile.reset();
        return;
      }
      status.classList.add("is-success");
      status.textContent = data.already
        ? "You're already on the list. We'll be in touch."
        : "You're on the list. Watch your inbox at launch.";
      emailInput.value = "";
      if (window.turnstile) window.turnstile.reset();
      loadCount();
    } catch {
      status.classList.add("is-error");
      status.textContent = "Network error. Try again.";
      if (window.turnstile) window.turnstile.reset();
    } finally {
      submit.disabled = false;
    }
  });

  loadCount();
})();
