# JHEEM.org Domain Transition Guide

**Switching from Cloudflare redirects to Vercel-hosted Next.js app**

## Overview

This guide covers transitioning jheem.org from Cloudflare page rules (redirecting to Shiny apps) to hosting the new Next.js JHEEM Portal on Vercel with the custom domain.

## Prerequisites

- [x] Next.js app fully tested on Vercel preview URL
- [x] All published URLs working correctly:
  - `/ryan-white` (landing page)
  - `/ryan-white-state-level` (iframe)
  - `/cdc-testing` (iframe)
  - `/prerun`, `/custom`, `/explore` (Ryan White interfaces)
- [x] Team approval for transition
- [x] Access to Cloudflare DNS management for jheem.org

## Current State

**Cloudflare Page Rules (to be removed):**
1. `*jheem.org/ryan-white-state-level*` → `https://jheem.shinyapps.io/ryan-white-state-level/`
2. `*jheem.org/cdc-testing*` → `https://jheem.shinyapps.io/cdc-testing/`  
3. `*jheem.org/ryan-white*` → `https://jheem.shinyapps.io/ryan-white/`

## Transition Steps

### Phase 1: Add Custom Domain to Vercel (5 minutes)

1. **In Vercel Dashboard:**
   - Go to your JHEEM Portal project
   - Navigate to Settings → Domains
   - Click "Add Domain"
   - Add both:
     - `jheem.org`
     - `www.jheem.org` (optional but recommended)

2. **Note the DNS instructions Vercel provides**
   - Vercel will show you exactly what DNS records to add
   - Keep this tab open for reference

### Phase 2: Update DNS at Cloudflare (10 minutes)

1. **Remove existing page rules:**
   - Go to Cloudflare dashboard for jheem.org
   - Navigate to Rules → Page Rules
   - Delete all three existing page rules

2. **Update DNS records:**
   - Go to DNS → Records
   - Remove any existing A/CNAME records for the root domain
   - Add new records as instructed by Vercel:
     ```
     Type: A
     Name: jheem.org (or @)
     Value: 76.76.19.61
     Proxy status: DNS only (gray cloud)
     
     Type: CNAME
     Name: www  
     Value: cname.vercel-dns.com
     Proxy status: DNS only (gray cloud)
     ```

### Phase 3: Verify and Test (15-30 minutes)

1. **Wait for DNS propagation:**
   - Usually takes 5-30 minutes
   - Check status in Vercel dashboard
   - Use `dig jheem.org` or online DNS checkers to verify

2. **Test all published URLs:**
   - [ ] `https://jheem.org` → Home page
   - [ ] `https://jheem.org/ryan-white` → Ryan White landing
   - [ ] `https://jheem.org/ryan-white-state-level` → State level iframe
   - [ ] `https://jheem.org/cdc-testing` → CDC testing iframe
   - [ ] `https://jheem.org/prerun` → Prerun interface
   - [ ] `https://jheem.org/custom` → Custom interface
   - [ ] `https://jheem.org/explore` → Interactive explorer
   - [ ] `https://jheem.org/aging` → HIV aging projections

3. **Verify SSL certificate:**
   - Should be automatically provisioned by Vercel
   - Check for green lock icon in browser
   - Certificate should be valid and issued by Let's Encrypt

## Rollback Plan (If Needed)

If issues arise, quickly restore the old setup:

1. **Re-add Cloudflare page rules:**
   ```
   *jheem.org/ryan-white-state-level* → https://jheem.shinyapps.io/ryan-white-state-level/
   *jheem.org/cdc-testing* → https://jheem.shinyapps.io/cdc-testing/
   *jheem.org/ryan-white* → https://jheem.shinyapps.io/ryan-white/
   ```

2. **Revert DNS if necessary:**
   - Point jheem.org back to Cloudflare proxy (orange cloud)

## Post-Transition

### Immediate (Day 1)
- [ ] Test all URLs from different locations/devices
- [ ] Monitor Vercel analytics for traffic
- [ ] Check that iframe embeds work properly
- [ ] Verify navigation between all pages

### First Week
- [ ] Monitor for any broken links or 404s
- [ ] Check search engine indexing status
- [ ] Gather team feedback on new interface
- [ ] Document any issues or improvements needed

### Ongoing
- [ ] Set up monitoring/alerts for site availability
- [ ] Plan future migrations (e.g., replacing iframe embeds with native React)
- [ ] Consider analytics setup (Google Analytics, etc.)

## Key Contacts

- **Vercel Support:** Available if deployment issues arise
- **Cloudflare DNS:** Access needed for DNS management
- **Team Members:** [Add relevant team contacts for testing/feedback]

## Notes

- **Cost:** Custom domain is FREE on Vercel
- **SSL:** Automatically handled by Vercel
- **Performance:** Should be faster than current redirect setup
- **SEO:** URLs remain the same, no impact expected
- **Academic Citations:** All existing published URLs will continue to work

## Timeline Estimate

- **Preparation:** 5 minutes
- **DNS Updates:** 10 minutes  
- **Propagation Wait:** 15-30 minutes
- **Testing:** 15 minutes
- **Total:** ~1 hour maximum

---

*Last Updated: August 2025*
*Status: Ready for implementation*