# TEMSCON: IEEE TEMS homepage (trial build)

An unofficial, standalone trial homepage for the IEEE Technology and Engineering Management Society, in two versions:

| Folder | Version | Layout |
|---|---|---|
| [`classic/`](classic/) | Classic | Stats bar under the hero, six-card Explore grid, separate history tile |
| [`bento/`](bento/) | Bento (polished) | Stats, Explore cards, history and focus areas merged into one bento grid; Publications and News side by side; accessibility and contrast polish |

Both share the same look: animated logo intro, glowing three-panel globe hero, GSAP motion, canvas silk-ribbon background, custom two-tone icons, and a low-end "lite" mode.

## Run locally

Each folder is self-contained. Serve either one with any static server, for example:

```bash
python -m http.server 8000 --directory bento
```

Then open http://localhost:8000. Add `?lite` to the URL to preview the low-end performance mode.

## Notes

- **Unofficial.** Not affiliated with, or endorsed by, IEEE or IEEE TEMS. Nothing on the page links to official IEEE or IEEE TEMS websites; IEEE-only links are inert placeholders, and search runs on the page itself.
- **Data.** Conference dates and venues, publication titles, news items and history were researched from public sources in October 2026 and may change.
- **Images.** Event photos are from Wikimedia Commons (CC BY / CC BY-SA) and the hero globe is rendered from NASA public-domain imagery; see `assets/CREDITS.txt` in each folder. Other photos are loaded from Unsplash. The IEEE logo files are trademarks of IEEE.
- **External libraries.** GSAP + ScrollTrigger (cdnjs), Lenis (jsDelivr) and Google Fonts load from CDNs.
