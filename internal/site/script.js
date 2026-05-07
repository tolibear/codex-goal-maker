if (window.lucide) {
  window.lucide.createIcons();
}

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    const value = button.getAttribute("data-copy");
    const label = button.querySelector("span");
    const original = label.textContent;

    try {
      await navigator.clipboard.writeText(value);
      label.textContent = "Copied";
      window.setTimeout(() => {
        label.textContent = original;
      }, 1400);
    } catch {
      label.textContent = "Select";
      window.setTimeout(() => {
        label.textContent = original;
      }, 1400);
    }
  });
});
