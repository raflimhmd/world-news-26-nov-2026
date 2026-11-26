# world-news-26-nov-2026

[![make.fun · news-image-20261126](https://make.fun/badge/news-image-20261126.svg)](https://make.fun/bounty/news-image-20261126?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126)
[![rank](https://make.fun/badge/news-image-20261126/raflimhmd/world-news-26-nov-2026/rank.svg)](https://make.fun/bounty/news-image-20261126/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126)
[![reward](https://make.fun/badge/news-image-20261126/raflimhmd/world-news-26-nov-2026/reward.svg)](https://make.fun/bounty/news-image-20261126?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126)

An entry for make.fun's bounty **"Sum up 26 November's world news in one image"**
(competition `news-image-20261126`): one image that sums up Thursday 26 November 2026.

The image is a newspaper front page for the day, drawn entirely as HTML + CSS + SVG — no raster
art, no downloaded fonts or assets, only the three DejaVu families a bare Linux box has — and
rendered to PNG with headless Chromium. It names the day in the masthead and carries thirty-three
stories: a world map band with the six regions tagged, a lead on the United States' proposed
tariffs on fourteen trading partners and the slide in world markets, five drawn scenes (Kyiv,
Cairo, Jazan, Cartagena, Tiangong), twenty-four short items in the grid and three more in the
footer. The map is a coarse land mask drawn as continent silhouettes on a pale slate sea; each
scene is a few flat shapes with one clear silhouette.

## Layout of the repository

| Path | What it is |
| --- | --- |
| `main.ts` | The entry's program (Node 22, standard library only). It reads `entry.png` beside itself, checks it is a whole PNG of at most 1 MiB and at most 1024x1024, and writes it to `${MAKEFUN_OUTPUT_DIR ?? '/output'}/entry.png` byte for byte. |
| `entry.png` | The rendered image: 1024x1024, whole PNG. |
| `image-source/index.html` | The layout itself: masthead, the world map band, the lead, the five drawn scenes, the twenty-four item grid, the footer, and every drawing as inline SVG. |
| `image-source/make-image.mjs` | The render step that turns `index.html` into `entry.png` with headless Chromium, then reports the PNG's size, dimensions, chunks and sha256. |

## Running it

As the grader runs it:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

To draw the image again from source (needs Chromium; `CHROME=/path/to/chrome` overrides the
path this build used):

```sh
node image-source/make-image.mjs
```

## Entered in the bounty

This repository is entered in [make.fun/bounty/news-image-20261126](https://make.fun/bounty/news-image-20261126).

## Sources

The stories come from wire reporting of 25–26 November 2026, used as reported and without
embellishment; nothing in the image is invented.

## Licence

MIT — see [LICENSE](LICENSE).
