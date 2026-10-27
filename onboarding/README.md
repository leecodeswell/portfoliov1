# Onboarding templates

Graphite dark-mode client documents for Ares. Not part of the deployed site.

- `contract.html` / `contract.pdf`: Master Services Agreement template, with Schedule A (Statement of Work) blanks filled in per client. Governed by Iowa law.
- `welcome.html` / `welcome.pdf`: Client welcome guide.
- `graphite.css`: shared styling.

To re-export a PDF after editing, print the HTML from Chrome or Edge with background graphics on, Letter size, no margins, or headless:

    msedge --headless=new --no-pdf-header-footer --print-to-pdf=onboarding/contract.pdf onboarding/contract.html
