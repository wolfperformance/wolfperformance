// Calendly link (set later)
const CALENDLY_URL = "https://calendly.com/YOUR_CALENDLY_LINK";
["bookBtnTop","bookBtnHero","bookBtnMobile","bookBtnBottom"].forEach(id=>{
  const el = document.getElementById(id);
  if (el) el.href = CALENDLY_URL;
});

// Mobile menu
const menuBtn = document.getElementById("menuBtn");
const mobileMenu = document.getElementById("mobileMenu");
if (menuBtn && mobileMenu) {
  menuBtn.addEventListener("click", () => {
    const open = mobileMenu.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
}

// Close mobile menu on link click
if (mobileMenu) {
  mobileMenu.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => {
      mobileMenu.classList.remove("open");
      menuBtn?.setAttribute("aria-expanded", "false");
    });
  });
}

// Navbar blur/fade on scroll
const nav = document.querySelector(".nav");
function onScrollUI() {
  if (!nav) return;
  nav.classList.toggle("scrolled", window.scrollY > 10);
}
window.addEventListener("scroll", onScrollUI, { passive: true });
onScrollUI();

// Reveal on scroll
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) e.target.classList.add("on");
  });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));

// Subtle parallax hero (Apple-style, not cheesy)
const heroImg = document.querySelector('[data-parallax="hero"]');
function parallax() {
  if (!heroImg) return;
  const y = Math.min(120, window.scrollY);
  heroImg.style.transform = `scale(1.02) translateY(${y * 0.08}px)`;
}
window.addEventListener("scroll", parallax, { passive: true });
parallax();

// Footer year (if you have #year)
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();