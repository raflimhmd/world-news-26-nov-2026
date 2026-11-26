# world-news-26-nov-2026

[![make.fun · news-image-20261126](https://make.fun/badge/news-image-20261126.svg)](https://make.fun/bounty/news-image-20261126)
[![rank](https://make.fun/badge/news-image-20261126/raflimhmd/world-news-26-nov-2026/rank.svg)](https://make.fun/bounty/news-image-20261126/leaderboard)
[![reward](https://make.fun/badge/news-image-20261126/raflimhmd/world-news-26-nov-2026/reward.svg)](https://make.fun/bounty/news-image-20261126)

An entry for make.fun's bounty **"Sum up 26 November's world news in one image"**
(competition `news-image-20261126`): one image that sums up Thursday 26 November 2026.

The image is a newspaper front page for the day, drawn entirely as HTML + CSS + SVG — no raster
art, no downloaded fonts or assets, only the DejaVu families a bare Linux box has — and rendered
to PNG with headless Chromium.

It carries **48 stories from six regions**. The hierarchy runs

1. the masthead — the day, the story count, the map band with the six regions tagged;
2. the lead — the United States' proposed duties on fourteen trading partners and the swing in
   world markets, set over a chart of the proposed rates;
3. a strip of six drawn scenes (Miami, New York, Cape Canaveral, Cairo, the Red Sea, Madrid);
4. six region blocks — North America, South America, Europe, Africa, Asia, Oceania — each with a
   header bar and two columns of short items; and
5. a footer of five more stories, plus a *day in numbers* panel holding the four figures the day's
   stories keep returning to.

Every story is dated 26 November 2026 and was taken from wire and newspaper reporting of that day
(RSS feeds of the BBC, Al Jazeera, The Guardian, France 24, NPR, CBC, ABC Australia, RNZ, the
Japan Times, the SCMP, CNA, the Times of India, AllAfrica, Africanews and the Google News editions
of some forty countries), used as reported and without embellishment; nothing in the image is
invented. The map is a coarse land mask drawn as continent silhouettes on a pale slate sea; each
scene is a few flat shapes with one clear silhouette.

## Layout of the repository

| Path | What it is |
| --- | --- |
| `main.ts` | The entry's program (Node 22, standard library only). It reads `entry.png` beside itself, checks it is a whole PNG of at most 1 MiB and at most 1024x1024, and writes it to `${MAKEFUN_OUTPUT_DIR ?? '/output'}/entry.png` byte for byte. |
| `entry.png` | The rendered image: 1024x1024, whole PNG. |
| `image-source/index.html` | The layout itself: masthead, world map band, the lead and its chart, the six drawn scenes, the six region blocks, the numbers panel, the footer, and every drawing as inline SVG. |
| `image-source/make-image.mjs` | The render step that turns `index.html` into `entry.png` with headless Chromium, then reports the PNG's size, dimensions, chunks and sha256. |

## Running it

As the grader runs it:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

To draw the image again from source (needs Chromium; `CHROME=/path/to/chrome` overrides the path
this build used):

```sh
node image-source/make-image.mjs
```

Both the render and the program are run twice in this repository's tests; the two runs write
identical bytes.

## Entered in the bounty

This repository is entered in [make.fun/bounty/news-image-20261126](https://make.fun/bounty/news-image-20261126).

## Licence

MIT — see [LICENSE](LICENSE).
