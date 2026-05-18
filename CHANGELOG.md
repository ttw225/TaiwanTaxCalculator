## 0.1.0 (2026-05-18)

### Feat

- **seo**: web vitals beacon, route prefetch, and home-only hero warmup
- **deploy**: add Cloudflare Pages config and security headers
- **rouing**: migrate public site to React Router prerendering
- **intro**: redesign IntroPage with hero image and updated step screenshots (#59)
- **ui**: summary table (#55)
- **ui**: shared modal overlay with Escape and backdrop dismiss (#54)
- **tax-summary**: structured scenario formulas, checklist mortgage formula, and UX fixes (#53)
- **summary**: scenario dialog and tax summary (AMT, recommendations, basic living expense) (#50)
- **summary**: add scenario combinations dialog and normalize font sizes (#47)
- **decision**: remove decision (#46)
- **intro**: add bottom CTA section and refine steps heading (#43)
- **intro**: revamp onboarding flow with step visuals and aligned field labels (#39)
- **revamp-income-card-and-summary**: - add per-card participant management (add existing/new, edit labels, and scoped removal) (#37)
- **list-uxui-change**: improve checklist scroll targeting and deduction comparison UI cues (#36)
- **checklist**: link interest income to savings investment deduction (#33)
- Update cap feedback copy (#24)
- improve checklist summary flow, export placement, and header tax-year context (#22)
- **staging**: add 404 page and redirect to home list (#20)
- **checklist**: expand tax estimate panel and formula breakdown (#19)
- **checklist**: gross income card, sticky tax summary (#16)
- **personal-tax**: remove personal section (#14)
- **card-in-page-2**: remove not needed labels and buttons (#12)
- **back-to-the-top-button**: add back-to-top button and smooth scroll animation (#11)
- **ux-flow**: enhance checklist management with item addition and removal (#8)
- **ci**: generate gh-pages index.html for preview hub (#7)
- **ci**: GitHub Pages dev site, PR previews, and deploy badges (#6)

### Fix

- **hero**: avoid Safari black hero image after 404 navigation (#62)
- **url-base**: fix github page build error (#61)
- **deploy**: copy dist/client for gh-pages and sync ai-context
- **export**: missing footer when print PDF
- clear shared participants when last income card is removed (#41)
- **flow**: route intro and header navigation by existing selection state (#35)
- **flow**: route intro and header navigation by existing selection state (#34)
- **dialog-overflow**: prevent dialog viewport overflow and refine checklist card styles (#29)
- **preview-pages**: fix cleanup ci (#9)

### Refactor

- **footer**: tighten copy and move metadata to about section (#40)
- **card-list-adjustment**: streamline checklist interactions and summary presentation (#38)
- **heading-style**: extract page heading and unify checklist heading styles (#27)
- **checklist**: extract shared shell and wealth-clause flag (#18)
- **checklist**: drop further_check category; fold items into gross income (#17)

### Perf

- **images**: optimize intro screenshots and Hero LCP image
- **checklist**: pass route-state snapshot to skip results loading flash
- **home**: preload and warm up hero image for faster LCP

## 0.0.0 (2026-05-02)
