const panels = document.querySelectorAll(".js-fade-panel");

const revealPanel = (entry) => {
  if (!entry.isIntersecting) {
    return;
  }

  entry.target.classList.add("is-visible");
};

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries, currentObserver) => {
      entries.forEach((entry) => {
        revealPanel(entry);
        if (entry.isIntersecting) {
          currentObserver.unobserve(entry.target);
        }
      });
    },
    {
      root: null,
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.2,
    }
  );

  panels.forEach((panel) => observer.observe(panel));
} else {
  // Fallback for older browsers without IntersectionObserver.
  panels.forEach((panel) => panel.classList.add("is-visible"));
}
