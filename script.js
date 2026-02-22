const CALENDLY_URL = "https://calendly.com/YOUR_CALENDLY_LINK";

["bookBtnTop","bookBtnHero","bookBtnMobile","bookBtnBottom"].forEach(id=>{
  const el = document.getElementById(id);
  if (el) el.href = CALENDLY_URL;
});

const menuBtn = document.getElementById("menuBtn");
const mobileMenu = document.getElementById("mobileMenu");
if (menuBtn && mobileMenu) {
  menuBtn.addEventListener("click", () => {
    const open = mobileMenu.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
}

document.querySelector("#year").textContent = new Date().getFullYear();