/**
 * AutoBuddy Subtle 3D Card Depth & Specular Physics Engine
 * Adds tactile 60fps micro-tilt and dynamic specular light reflection.
 */

class Tilt3DEngine {
  constructor() {
    this.maxTilt = 7; // subtle, natural tilt degrees
    this.perspective = 1200;
    this.scale = 1.015;
    this.speed = 350; // transition speed ms
    this.init();
  }

  init() {
    if (typeof window === "undefined") return;
    this.bindCards();

    const observer = new MutationObserver(() => {
      this.bindCards();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  bindCards() {
    const selectors = [
      ".action-card",
      ".service-card",
      ".list-card",
      ".detail-card",
      ".workflow-card",
      ".auth-card",
      ".booking-history-card",
      ".map-card",
      "[data-tilt-3d]"
    ];

    const cards = document.querySelectorAll(selectors.join(", "));
    cards.forEach((card) => {
      if (card.dataset.tiltBound) return;
      card.dataset.tiltBound = "true";

      card.style.transformStyle = "preserve-3d";
      card.style.transition = `transform ${this.speed}ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow ${this.speed}ms ease`;

      let glare = card.querySelector(".tilt-glare");
      if (!glare) {
        glare = document.createElement("div");
        glare.className = "tilt-glare";
        card.appendChild(glare);
      }

      this.attachListeners(card, glare);
    });
  }

  attachListeners(card, glare) {
    let bounds = null;
    let isHovered = false;

    const onMouseEnter = () => {
      bounds = card.getBoundingClientRect();
      isHovered = true;
      card.style.transition = "none";
      if (glare) glare.style.opacity = "1";
    };

    const onMouseMove = (e) => {
      if (!isHovered || !bounds) bounds = card.getBoundingClientRect();

      const mouseX = e.clientX - bounds.left;
      const mouseY = e.clientY - bounds.top;

      const xPct = (mouseX / bounds.width) * 2 - 1;
      const yPct = (mouseY / bounds.height) * 2 - 1;

      const rotateX = -yPct * this.maxTilt;
      const rotateY = xPct * this.maxTilt;

      card.style.transform = `perspective(${this.perspective}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${this.scale}, ${this.scale}, ${this.scale})`;

      if (glare) {
        glare.style.background = `radial-gradient(circle at ${mouseX}px ${mouseY}px, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 65%)`;
      }
    };

    const onMouseLeave = () => {
      isHovered = false;
      card.style.transition = `transform ${this.speed}ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow ${this.speed}ms ease`;
      card.style.transform = `perspective(${this.perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;

      if (glare) glare.style.opacity = "0";
    };

    card.addEventListener("mouseenter", onMouseEnter, { passive: true });
    card.addEventListener("mousemove", onMouseMove, { passive: true });
    card.addEventListener("mouseleave", onMouseLeave, { passive: true });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.tilt3DEngine = new Tilt3DEngine();
});
