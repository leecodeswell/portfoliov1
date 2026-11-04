/* Firebase connection for Work Order Manager.
   Same Firebase project as Scheduling Agent; the two apps keep their data apart
   (this one uses the wo_ collections). These values identify the project and are
   safe to publish: access is controlled by the security rules, not by hiding this.

   Set WO_FIREBASE_CONFIG = null to run in "this browser only" mode (for demos). */
window.WO_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDrNntYfI0r1X809afCqAhgTVa02jp5QFA",
  authDomain: "outreachdev-scheduling-eb94c.firebaseapp.com",
  projectId: "outreachdev-scheduling-eb94c",
  storageBucket: "outreachdev-scheduling-eb94c.firebasestorage.app",
  messagingSenderId: "185463350531",
  appId: "1:185463350531:web:df319ebc97084ec7be3536"
};

/* Plans and prices shown in the app. Change them here any time.
   url: the Payment Link from Stripe for that product (null until you have it).
   If you change trialDays, change the "14" in firestore.rules too. */
window.WO_BILLING = {
  trialDays: 14,
  contact: "thompsontechnologiesleet@gmail.com",
  plans: [
    { id: "lifetime", label: "Pay once", price: "$60", per: "one time", note: "Unlimited team members. Updates to version 1 included.", url: "https://buy.stripe.com/fZu14ncJ240380we7E2wU05" },
    { id: "monthly", label: "Monthly", price: "$12", per: "per month", note: "Unlimited team members. Cancel any time.", url: "https://buy.stripe.com/eVq7sL9wQ7cfcgM0gO2wU04" }
  ],
  /* The AI assistant: free during the trial, then this add-on (or included in a free copy you give someone).
     Put its Stripe Payment Link in url. */
  ai: { price: "$8", per: "per month", note: "Ask about your jobs in plain words and approve changes with one tap.", url: "https://buy.stripe.com/00w28rcJ2cwzbcI6Fc2wU03" }
};

/* Demo: opening the app as .../work-orders/?demo runs a copy in that browser tab only
   (nothing goes online, no sign-in) and it's erased when the tab closes. */
if (/[?&]demo\b/.test(location.search)) {
  window.WO_DEMO = true;
  window.WO_FIREBASE_CONFIG = null;
  document.addEventListener("DOMContentLoaded", function () {
    var b = document.createElement("div");
    b.id = "demo-bar"; b.setAttribute("role", "note");
    b.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:9999;display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:center;max-width:calc(100% - 24px);padding:8px 8px 8px 16px;border-radius:22px;background:#1d1b2a;color:#fff;font:500 13px/1.3 Inter,system-ui,sans-serif;box-shadow:0 10px 30px rgba(20,16,40,.28)";
    b.innerHTML = '<span>Demo. Nothing is saved after you close this tab.</span><a href="./" style="flex:none;padding:7px 14px;border-radius:999px;background:#fff;color:#1d1b2a;font-weight:600;text-decoration:none">Start free trial</a><button type="button" aria-label="Hide" style="flex:none;width:28px;height:28px;border:0;border-radius:50%;background:transparent;color:#fff;font-size:18px;cursor:pointer">&times;</button>';
    b.querySelector("button").onclick = function () { b.remove(); };
    document.body.appendChild(b);
  });
}
