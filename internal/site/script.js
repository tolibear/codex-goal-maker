const canAnimate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (canAnimate && window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);

  gsap.from("[data-animate='fade-down']", {
    y: -18,
    opacity: 0,
    duration: 0.8,
    ease: "power3.out"
  });

  gsap.from("[data-animate='hero-copy'] > *", {
    y: 34,
    opacity: 0,
    duration: 0.9,
    ease: "power3.out",
    stagger: 0.1
  });

  gsap.from("[data-animate='terminal']", {
    y: 38,
    rotate: -1.5,
    opacity: 0,
    duration: 1,
    ease: "power3.out",
    delay: 0.12
  });

  gsap.from(".role-column", {
    scrollTrigger: {
      trigger: ".role-board",
      start: "top 96%"
    },
    y: 24,
    opacity: 0,
    duration: 0.72,
    ease: "power3.out",
    stagger: 0.1
  });

  document.querySelectorAll(".reveal-words h2").forEach((heading) => {
    const words = heading.textContent.trim().split(/\s+/);
    heading.innerHTML = words
      .map((word, index) => {
        if (index === 5) {
          return `<span class="word">${word}</span> <span class="inline-image" aria-hidden="true"></span>`;
        }
        return `<span class="word">${word}</span>`;
      })
      .join(" ");

    gsap.fromTo(
      heading.querySelectorAll(".word"),
      { opacity: 0.72, y: 8 },
      {
        opacity: 1,
        y: 0,
        stagger: 0.06,
        ease: "none",
        scrollTrigger: {
          trigger: heading,
          start: "top 78%",
          end: "bottom 38%",
          scrub: true
        }
      }
    );
  });

  gsap.utils.toArray(".bento-card").forEach((card) => {
    gsap.fromTo(
      card,
      { scale: 0.96, opacity: 0.82 },
      {
        scale: 1,
        opacity: 1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: card,
          start: "top 88%",
          end: "top 48%",
          scrub: true
        }
      }
    );
  });

  gsap.utils.toArray(".stack-card").forEach((card, index) => {
    gsap.fromTo(
      card,
      { y: 70, scale: 0.96, opacity: 0.86 },
      {
        y: 0,
        scale: 1,
        opacity: 1,
        ease: "none",
        scrollTrigger: {
          trigger: card,
          start: "top 92%",
          end: "top 48%",
          scrub: true
        }
      }
    );
    card.style.zIndex = String(index + 1);
  });
}

document.querySelectorAll(".accordion-panel").forEach((panel) => {
  panel.addEventListener("mouseenter", () => {
    document.querySelectorAll(".accordion-panel").forEach((item) => item.classList.remove("wide"));
    panel.classList.add("wide");
  });
});
