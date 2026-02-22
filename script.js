// Put your Calendly link here later:
const CALENDLY_URL = "https://calendly.com/YOUR_CALENDLY_LINK";

["bookBtn","bookBtn2"].forEach(id=>{
  const el = document.getElementById(id);
  if (el) el.href = CALENDLY_URL;
});

document.getElementById("year").textContent = new Date().getFullYear();