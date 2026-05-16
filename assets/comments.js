// ermis.dev comments — talks to the ermis-comments Cloudflare Worker.
//
// Two things must be filled in once and then never again:
//   - API: the worker URL printed by `wrangler deploy`
//   - the Turnstile site key in the post's data-sitekey attribute
//
// Everything else is generic: drop the same <section class="comments">
// block into any post and it will work, using its data-post-id.

(() => {
  const API = "https://ermis-comments.feepok.workers.dev/comments";

  const section = document.querySelector(".comments[data-post-id]");
  if (!section) return;
  const postId = section.dataset.postId;
  const list = section.querySelector("#comment-list");
  const form = section.querySelector("#comment-form");
  const nameInput = section.querySelector("#comment-name");
  const bodyInput = section.querySelector("#comment-body");
  const counter = section.querySelector("#comment-counter");
  const status = section.querySelector("#comment-status");
  const submit = section.querySelector("#comment-submit");

  const fmt = new Intl.DateTimeFormat("en", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function relTime(ts) {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return fmt.format(new Date(ts));
  }

  function render(comments) {
    if (!comments.length) {
      list.innerHTML = '<li class="comment-empty">No comments yet. Be the first.</li>';
      return;
    }
    list.innerHTML = comments.map(c => {
      const name = escapeHTML(c.name || "Anonymous");
      const body = escapeHTML(c.body || "").replace(/\n/g, "<br>");
      const iso = new Date(c.ts).toISOString();
      return `
        <li class="comment">
          <div class="comment-head">
            <span class="comment-name">${name}</span>
            <time class="comment-time" datetime="${iso}" title="${escapeHTML(fmt.format(new Date(c.ts)))}">${relTime(c.ts)}</time>
          </div>
          <p class="comment-body">${body}</p>
        </li>
      `;
    }).join("");
  }

  async function load() {
    try {
      const res = await fetch(`${API}?postId=${encodeURIComponent(postId)}`, {
        headers: { "Accept": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      render(data.comments || []);
    } catch (err) {
      list.innerHTML = '<li class="comment-empty">Comments are unreachable right now. Try again in a minute.</li>';
    }
  }

  function turnstileToken() {
    const fld = form.querySelector('input[name="cf-turnstile-response"]');
    return fld ? fld.value : "";
  }

  bodyInput.addEventListener("input", () => {
    counter.textContent = bodyInput.value.length;
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.className = "comment-status";
    status.textContent = "";

    const body = bodyInput.value.trim();
    if (!body) {
      status.classList.add("is-error");
      status.textContent = "Write something first.";
      return;
    }

    const token = turnstileToken();
    if (!token) {
      status.classList.add("is-error");
      status.textContent = "Solve the captcha first.";
      return;
    }

    submit.disabled = true;
    status.textContent = "Posting…";

    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          name: nameInput.value,
          body,
          turnstileToken: token,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        status.classList.add("is-error");
        status.textContent = data.error || "Could not post. Try again.";
        if (window.turnstile) window.turnstile.reset();
        return;
      }
      status.classList.add("is-success");
      status.textContent = "Thanks. Your comment is live.";
      bodyInput.value = "";
      nameInput.value = "";
      counter.textContent = "0";
      if (window.turnstile) window.turnstile.reset();
      await load();
    } catch (err) {
      status.classList.add("is-error");
      status.textContent = "Network error. Try again.";
      if (window.turnstile) window.turnstile.reset();
    } finally {
      submit.disabled = false;
    }
  });

  load();
})();
