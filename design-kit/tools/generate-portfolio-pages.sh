#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
portfolio="$root/deliverables/portfolio"

cat > "$portfolio/index.html" <<'EOF'
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MEARROW Portfolio</title><link rel="stylesheet" href="./styles.css"></head><body><main class="package-shell"><header class="package-head"><div><p class="eyebrow">MEARROW PORTFOLIO / DESIGN KIT</p><h1>Responsive web.<br>Two connected products.</h1><p>MEARROW SNS and MEARROW Studio, presented across desktop, tablet, and mobile web.</p></div></header><nav class="case-grid"><a class="case-card" href="./web/"><div><h2>MEARROW Web</h2><p>SNS community and Studio discovery</p><span>Open web portfolio</span></div><b class="arrow">↗</b></a></nav></main></body></html>
EOF

for product in mearrow-sns mearrow-studio; do
  if [ "$product" = "mearrow-sns" ]; then
    name="MEARROW SNS"
    tablet_scroll_attr='data-initial-scroll-y="68"'
    kind="K-POP COMMUNITY"
    tagline="A media-first community for K-pop fans."
    first_web="feed"
    web_screens="feed vote profile"
    web_heading="MEARROW SNS<br>Community Web"
    web_subtitle="A social home for every K-pop fan."
    web_detail_lead="Desktop, tablet, mobile.<br>One fan community."
    web_screen_label="COMMUNITY FEED"
    web_feature_one="COMMUNITY FEED"
    web_feature_two="FAN VOTE"
    web_feature_three="MEMBER PROFILE"
    web_feature_four="SHARING"
  else
    name="MEARROW Studio"
    tablet_scroll_attr=""
    kind="EDITORIAL DISCOVERY"
    tagline="Stories, opportunities, and the fans behind them."
    first_web="home"
    web_screens="home fan-vote auditions"
    web_heading="MEARROW Studio<br>Editorial Web"
    web_subtitle="K-pop stories, auditions, and fan voting."
    web_detail_lead="Desktop, tablet, mobile.<br>One connected studio."
    web_screen_label="STUDIO HOME"
    web_feature_one="EDITORIAL STORIES"
    web_feature_two="AUDITION NEWS"
    web_feature_three="FAN VOTE"
    web_feature_four="DISCOVERY"
  fi
  # App concepts remain available under pub/app; the portfolio exports responsive web only.
  for surface in web; do
    surface_label="RESPONSIVE WEB"
    surface_dir="web"
    raw_path="../../../../pub/admin/$product/index.html"
    first_screen="$first_web"
    screen_ids="$web_screens"
    output_prefix="web/$product"
    base_class="web"

    target="$portfolio/$surface_dir/$product"
    mkdir -p "$target"

    cat > "$target/index.html" <<EOF
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>$name · $surface_label portfolio</title><link rel="stylesheet" href="../../styles.css"></head><body><main class="package-shell"><a class="package-back" href="../">← Portfolio hub</a><header class="package-head"><div><p class="eyebrow">$surface_label / MEARROW</p><h1>$name</h1><p>$tagline</p></div></header><nav class="package-links"><a href="./main-thumbnail.html">Main thumbnail</a><a href="./detail-page.html">Detail board</a><a href="./pages.html">Screen pages</a></nav><nav class="package-links"><a href="../../../../screenshots/deliverables/portfolio/$output_prefix-main-thumbnail.png">Thumbnail PNG</a><a href="../../../../screenshots/deliverables/portfolio/$output_prefix-detail-page.png">Detail PNG</a></nav></main></body></html>
EOF

    if [ "$surface" = "web" ]; then
      cat > "$target/main-thumbnail.html" <<EOF
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>$name web portfolio thumbnail</title>
  <link rel="stylesheet" href="../../styles.css">
  <link rel="stylesheet" href="../mearrow-device-frames.css">
</head>
<body class="asset-page mearrow-web-asset-page mearrow-web-thumbnail-page">
  <div class="asset-actions"><a class="primary" href="../../../../screenshots/deliverables/portfolio/$output_prefix-main-thumbnail.png" download>$name PNG</a><a href="./">Portfolio</a></div>
  <main>
    <article class="portfolio-canvas mearrow-web-thumbnail" aria-label="$name responsive web portfolio thumbnail">
      <div class="mearrow-web-orbit mearrow-web-orbit--one" aria-hidden="true"></div>
      <div class="mearrow-web-orbit mearrow-web-orbit--two" aria-hidden="true"></div>
      <header class="mearrow-web-main-copy">
        <p class="eyebrow">$kind / RESPONSIVE WEB</p>
        <h1>$web_heading</h1>
        <p class="mearrow-web-main-subtitle">$web_subtitle</p>
      </header>
      <section class="mearrow-web-device-showcase mearrow-web-thumbnail-showcase" aria-label="$name desktop, tablet, and mobile web previews">
        <div class="mearrow-web-monitor">
          <div class="mearrow-web-monitor-screen">
            <div class="mearrow-web-monitor-bar"><span class="mearrow-web-browser-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="mearrow-web-browser-address">mearrow.com / $product</span></div>
            <div class="mearrow-web-monitor-viewport"><iframe src="$raw_path" title="$name desktop web screen" loading="eager" scrolling="no"></iframe></div>
          </div>
          <div class="mearrow-web-monitor-stand" aria-hidden="true"></div>
          <div class="mearrow-web-monitor-base" aria-hidden="true"></div>
        </div>
        <div class="mearrow-web-tablet" aria-label="Tablet web screen"><div class="mearrow-web-tablet-screen"><iframe src="$raw_path" title="$name tablet web screen" loading="eager" scrolling="no" $tablet_scroll_attr></iframe></div></div>
        <div class="mearrow-web-phone" aria-label="Mobile web screen"><div class="mearrow-web-phone-screen"><iframe src="$raw_path" title="$name mobile web screen" loading="eager" scrolling="no"></iframe></div></div>
      </section>
    </article>
  </main>
  <script>
    const alignTabletFeeds = () => {
      const frames = document.querySelectorAll(".mearrow-web-tablet-screen iframe[data-initial-scroll-y]");
      const alignFeeds = () => frames.forEach((frame) => {
        const scroller = frame.contentDocument?.scrollingElement;
        if (scroller) {
          scroller.style.scrollBehavior = "auto";
          scroller.scrollTop = Number(frame.dataset.initialScrollY);
        }
      });
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(alignFeeds, 0)));
    };
    if (document.readyState === "complete") setTimeout(alignTabletFeeds, 0);
    else window.addEventListener("load", alignTabletFeeds, { once: true });
  </script>
</body>
</html>
EOF
      cat > "$target/detail-page.html" <<EOF
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>$name web portfolio detail</title>
  <link rel="stylesheet" href="../../styles.css">
  <link rel="stylesheet" href="../mearrow-device-frames.css">
</head>
<body class="asset-page mearrow-web-asset-page mearrow-web-detail-page">
  <div class="asset-actions"><a class="primary" href="../../../../screenshots/deliverables/portfolio/$output_prefix-detail-page.png" download>$name PNG</a><a href="./">Portfolio</a></div>
  <main>
    <article class="portfolio-canvas mearrow-web-detail" aria-label="$name responsive web portfolio detail">
      <div class="mearrow-web-orbit mearrow-web-orbit--one" aria-hidden="true"></div>
      <div class="mearrow-web-orbit mearrow-web-orbit--two" aria-hidden="true"></div>
      <header class="mearrow-web-detail-head">
        <div class="mearrow-web-brand-lockup">
          <img src="../../../../assets/brand/mearrow-mark.svg" alt="">
          <div><p>RESPONSIVE WEB / MEARROW</p><h1>$name</h1></div>
        </div>
        <p class="mearrow-web-detail-lead">$web_detail_lead</p>
        <dl class="mearrow-web-detail-meta"><div><dt>TYPE</dt><dd>WEBSITE</dd></div><div><dt>SCOPE</dt><dd>PC · TABLET · MOBILE</dd></div><div><dt>SCREEN</dt><dd>$web_screen_label</dd></div></dl>
      </header>
      <section class="mearrow-web-device-showcase" aria-label="$name desktop, tablet, and mobile web previews">
        <div class="mearrow-web-monitor" aria-label="Desktop web screen">
          <div class="mearrow-web-monitor-screen">
            <div class="mearrow-web-monitor-bar"><span class="mearrow-web-browser-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="mearrow-web-browser-address">desktop / mearrow.com</span></div>
            <div class="mearrow-web-monitor-viewport"><iframe src="$raw_path" title="$name desktop responsive screen" loading="eager" scrolling="no"></iframe></div>
          </div>
          <div class="mearrow-web-monitor-stand" aria-hidden="true"></div>
          <div class="mearrow-web-monitor-base" aria-hidden="true"></div>
        </div>
        <div class="mearrow-web-tablet" aria-label="Tablet web screen"><div class="mearrow-web-tablet-screen"><iframe src="$raw_path" title="$name tablet responsive screen" loading="eager" scrolling="no" $tablet_scroll_attr></iframe></div></div>
        <div class="mearrow-web-phone" aria-label="Mobile web screen"><div class="mearrow-web-phone-screen"><iframe src="$raw_path" title="$name mobile responsive screen" loading="eager" scrolling="no"></iframe></div></div>
      </section>
      <section class="mearrow-web-feature-list" aria-label="$name features"><p>$web_feature_one</p><p>$web_feature_two</p><p>$web_feature_three</p><p>$web_feature_four</p></section>
      <footer class="mearrow-web-detail-footer"><p>$name / WEB</p><strong>Responsive web experience · 2026</strong></footer>
    </article>
  </main>
  <script>
    const alignTabletFeeds = () => {
      const frames = document.querySelectorAll(".mearrow-web-tablet-screen iframe[data-initial-scroll-y]");
      const alignFeeds = () => frames.forEach((frame) => {
        const scroller = frame.contentDocument?.scrollingElement;
        if (scroller) {
          scroller.style.scrollBehavior = "auto";
          scroller.scrollTop = Number(frame.dataset.initialScrollY);
        }
      });
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(alignFeeds, 0)));
    };
    if (document.readyState === "complete") setTimeout(alignTabletFeeds, 0);
    else window.addEventListener("load", alignTabletFeeds, { once: true });
  </script>
</body>
</html>
EOF
      cat > "$target/pages.html" <<EOF
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>$name web screen pages</title><link rel="stylesheet" href="../../styles.css"></head><body class="asset-page"><main>
EOF
      for screen_id in $screen_ids; do
        case "$screen_id" in
          feed) label="COMMUNITY FEED"; headline="A feed made for fan moments." ;;
          vote) label="FAN VOTE"; headline="Support that moves the board." ;;
          profile) label="CREATOR PROFILE"; headline="A home for every fan story." ;;
          home) label="STUDIO HOME"; headline="Stories and opportunity in one place." ;;
          fan-vote) label="FAN VOTE + NEWS"; headline="The pulse of the fandom." ;;
          auditions) label="AUDITIONS"; headline="Find the next opportunity." ;;
        esac
        cat >> "$target/pages.html" <<EOF
<article id="page-$screen_id" class="portfolio-canvas page-canvas"><header class="page-head"><div><p class="eyebrow">$name / WEB</p><h1>$headline</h1></div><p>$label · RESPONSIVE SCREEN</p></header><div class="browser-shell"><div class="browser-bar"><i></i><i></i><i></i><span>mearrow.com / $product / $screen_id</span></div><div class="browser-viewport"><iframe src="$raw_path#$screen_id" title="$name $label screen" loading="eager"></iframe></div></div><footer class="page-footer"><b>$label</b><span>Static design source · 1440px reference</span></footer></article>
EOF
      done
      printf '%s\n' '</main></body></html>' >> "$target/pages.html"
    fi
  done
done

cat > "$portfolio/web/index.html" <<'EOF'
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MEARROW Web Portfolio</title><link rel="stylesheet" href="../styles.css"></head><body><main class="package-shell"><a class="package-back" href="../">← Portfolio hub</a><header class="package-head"><div><p class="eyebrow">MEARROW / WEB</p><h1>Responsive web portfolio</h1><p>One web source per product, presented at desktop, tablet, and mobile widths.</p></div></header><nav class="case-grid"><a class="case-card" href="./mearrow-sns/"><div><h2>MEARROW SNS</h2><p>Media-first community experience</p><span>Open case →</span></div></a><a class="case-card" href="./mearrow-studio/"><div><h2>MEARROW Studio</h2><p>Editorial and opportunity discovery</p><span>Open case →</span></div></a></nav></main></body></html>
EOF
for surface_dir in web; do
  for legacy_page in main-thumbnail.html detail-page.html pages.html; do
    cat > "$portfolio/$surface_dir/$legacy_page" <<EOF
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=./index.html"><title>MEARROW Portfolio</title></head><body><a href="./index.html">Open the MEARROW $surface_dir portfolio.</a></body></html>
EOF
  done
done

for legacy_page in service/main-thumbnail.html service/main-thumbnail-sample.html service/detail-page-sample.html; do
  cat > "$portfolio/$legacy_page" <<'EOF'
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=../index.html"><title>MEARROW Portfolio</title></head><body><a href="../index.html">Open the MEARROW portfolio hub.</a></body></html>
EOF
done
