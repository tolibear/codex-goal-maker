if (window.lucide) {
  window.lucide.createIcons();
}

const toast = document.createElement("div");
toast.className = "copy-toast";
toast.setAttribute("role", "status");
toast.setAttribute("aria-live", "polite");
document.body.append(toast);

let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 1700);
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.append(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("Copy command failed");
}

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async (event) => {
    event.preventDefault();

    const value = button.getAttribute("data-copy");
    const label = button.querySelector("span");
    const original = label ? label.textContent : "";
    const toastMessage = button.getAttribute("data-copy-toast") || `Copied ${value}`;

    try {
      await copyText(value);
      showToast(toastMessage);
      if (button.classList.contains("copy-command") && label) {
        label.textContent = "Copied";
        window.setTimeout(() => {
          label.textContent = original;
        }, 1400);
      }
    } catch {
      showToast("Copy failed");
      if (button.classList.contains("copy-command") && label) {
        label.textContent = "Select";
        window.setTimeout(() => {
          label.textContent = original;
        }, 1400);
      }
    }
  });
});

const starCount = document.querySelector("[data-github-stars]");

function formatStars(count) {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`;
  }
  return String(count);
}

async function loadGithubStars() {
  if (!starCount) return;

  try {
    const response = await fetch("https://api.github.com/repos/tolibear/goalbuddy", {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) throw new Error("GitHub API unavailable");
    const repo = await response.json();
    starCount.textContent = `${formatStars(repo.stargazers_count)} stars`;
  } catch {
    starCount.textContent = "GitHub";
  }
}

loadGithubStars();
