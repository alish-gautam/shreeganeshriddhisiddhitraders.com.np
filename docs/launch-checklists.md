# Client review and launch checklists

## Client content review

- Confirm the legal/business display name and Biratnagar address. The current address is approximate and must be verified before it is shown as a visit destination.
- Add and verify the business phone number, email address, and any announcement in **Admin → Site settings**. Blank phone and email fields stay hidden on the public site.
- Replace the placeholder machine artwork with client-approved images. Upload descriptive alt text and confirm each image accurately represents the listed product.
- Confirm each product’s name, category, model/specifications, price mode, price amount (if any), availability wording, and publication status.
- Review the About and Services copy, contact instructions, buying-guide text, privacy notice, and terms with the client.
- Remove the sample catalogue from preview after review. Do not import sample products into production.

## Preview review

- Confirm Cloudflare Access protects the entire preview hostname and every preview administrator account is on the allowlist.
- Review the site at phone, tablet, and desktop widths, including navigation, search, filters, contact submission, and dark/light theme controls.
- Confirm the demo notice appears, `robots.txt` disallows crawling, and preview pages are not presented as a live inventory.
- Test enquiry review, product/category edits, image upload, image alt text, product preview, and publish/unpublish flow with an authenticated administrator.
- Confirm the customer receives no promise of stock or delivery unless the business has verified it.

## Production launch

- Replace the preview/production D1 IDs in `wrangler.jsonc` and confirm preview and production resources are separate.
- Apply `0001_initial.sql` to production. Do not run the demo seed on the production database.
- Configure production Access applications and Worker secrets; verify both the Access policy and Worker email allowlist.
- Attach the apex domain to the production Worker and redirect `www` to the apex. Confirm HTTPS and the canonical URL.
- Set initial business settings and publish only client-approved categories/products/images.
- Check production `robots.txt`, sitemap, page titles/descriptions, social sharing metadata, and structured product information.
- Submit a real test enquiry with the client and agree who will monitor and answer enquiries in the admin dashboard.
- Record the Cloudflare account owner, administrator email list, backup/export procedure, and ongoing content owner with the client.
