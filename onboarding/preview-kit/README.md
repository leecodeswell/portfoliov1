# Client preview kit

Private, watermarked website previews on Cloudflare Pages, locked with Cloudflare Access (Zero Trust Free, up to 50 users).

## New client
1. Build the client's site and add `preview-banner.html` just before `</body>` on every page. Build without source maps.
2. Cloudflare → Workers & Pages → Create → Upload assets. Project name: `ares-preview-<client>`. Upload the build folder or a zip.
3. Zero Trust → Access controls → Applications → Create new application → Self-hosted. Domain: `ares-preview-<client>.pages.dev`. Policy: Allow, Emails = your email + the client's email.
4. Pages project → Settings → General → Preview access → **Restrict previews** (locks the per-upload `<id>.ares-preview-<client>.pages.dev` addresses too).
5. Check that both the main and per-upload addresses redirect to `cloudflareaccess.com` when signed out.
6. Put the preview link in the client's Notion portal.

At launch or if a client stops paying: remove their email from the policy, or delete the Pages project.

`demo-site/` is the placeholder deployed to `ares-preview-demo.pages.dev`.
