import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const kitDir = path.resolve(scriptDir, '..');
const repoDir = path.resolve(kitDir, '..');
const origin = new URL(process.env.MEARROW_SOURCE_ORIGIN ?? 'http://localhost:3000');
const products = [
  { id: 'mearrow-sns', route: '/' },
  { id: 'mearrow-studio', route: '/studio' },
];

function attr(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match?.[2]?.replaceAll('&amp;', '&') ?? null;
}

function setAttr(tag, name, value) {
  const escaped = value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  const expression = new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i');
  if (expression.test(tag)) return tag.replace(expression, `${name}="${escaped}"`);
  const closing = tag.endsWith('/>') ? '/>' : '>';
  return `${tag.slice(0, -closing.length)} ${name}="${escaped}"${closing}`;
}

function removeAttr(tag, name) {
  return tag.replace(new RegExp(`\\s+${name}\\s*=\\s*(["']).*?\\1`, 'i'), '');
}

function relativeAsset(fromDir, toFile) {
  let value = path.relative(fromDir, toFile).split(path.sep).join('/');
  if (!value.startsWith('.')) value = `./${value}`;
  return value;
}

function extensionFor(contentType, resourceUrl) {
  const type = contentType?.split(';')[0]?.trim().toLowerCase();
  const known = new Map([
    ['image/avif', '.avif'], ['image/gif', '.gif'], ['image/jpeg', '.jpg'],
    ['image/png', '.png'], ['image/svg+xml', '.svg'], ['image/webp', '.webp'],
    ['font/woff', '.woff'], ['font/woff2', '.woff2'], ['application/font-woff', '.woff'],
    ['application/font-woff2', '.woff2'], ['application/vnd.ms-fontobject', '.eot'],
  ]);
  if (known.has(type)) return known.get(type);
  const ext = path.extname(new URL(resourceUrl).pathname).toLowerCase();
  return /^\.[a-z0-9]{2,5}$/.test(ext) ? ext : '.bin';
}

function isPrivateUserMedia(url) {
  return /(?:supabase\.co\/storage\/v1\/object\/public\/profile-images|googleusercontent\.com)/i.test(url);
}

function sanitizeSnsCards(html) {
  let cardIndex = 0;
  return html.replace(/<article\b(?=[^>]*data-testid="profile-feed-card")[^>]*>[\s\S]*?<\/article>/gi, (sourceCard) => {
    const sampleNumber = ++cardIndex;
    const safeId = `portfolio-demo-post-${sampleNumber}`;
    let card = sourceCard.replace(/\bid="post-[^"]*"/i, `id="${safeId}"`);
    card = card.replace(/(<(?:span)\b[^>]*class="[^"]*__authorCopy[^"]*"[^>]*>)[\s\S]*?(<\/span>)/i, '$1<strong>Studio fan</strong>$2');
    card = card.replace(/(<p\b[^>]*class="[^"]*__caption[^"]*"[^>]*>)[\s\S]*?(<\/p>)/i, '$1A bright moment shared with the community.$2');
    card = card.replace(/<time\b[^>]*>[\s\S]*?<\/time>/i, '<time datetime="2026-10-01T09:00:00.000Z">Oct 1, 2026</time>');

    card = card.replace(/<img\b[^>]*>/gi, (imageTag) => {
      const classes = attr(imageTag, 'class') ?? '';
      if (classes.includes('__media')) {
        let next = setAttr(imageTag, 'src', '../../../assets/studio/lightstick-constellation.webp');
        next = setAttr(next, 'alt', 'Community concert moment');
        return removeAttr(removeAttr(next, 'srcset'), 'sizes');
      }
      if (classes.includes('__authorAvatarImage')) {
        let next = setAttr(imageTag, 'src', '../../../assets/brand/mearrow-demo-avatar.svg');
        next = setAttr(next, 'alt', 'Studio fan avatar');
        return removeAttr(removeAttr(next, 'srcset'), 'sizes');
      }
      return imageTag;
    });

    card = card.replace(/<a\b[^>]*>/gi, (anchorTag) => {
      const classes = attr(anchorTag, 'class') ?? '';
      let next = setAttr(anchorTag, 'href', '#');
      if (classes.includes('__authorLink')) next = setAttr(next, 'aria-label', 'Studio fan profile');
      return next;
    });

    let actionIndex = 0;
    card = card.replace(/<button\b[^>]*class="[^"]*__actionButton[^"]*"[^>]*>[\s\S]*?<\/button>/gi, (buttonTag) => {
      const number = actionIndex++ === 0 ? '24' : '3';
      const accessibleName = number === '24' ? 'Like' : 'Comments';
      let next = setAttr(buttonTag, 'aria-label', accessibleName);
      next = next.replace(/(<span\b[^>]*>)[\s\S]*?(<\/span>)/i, `$1${number}$2`);
      return next;
    });
    card = card.replace(/(<button\b[^>]*class="[^"]*__railShareButton[^"]*"[^>]*)(>)/i, '$1 aria-label="Share post"$2');
    card = card.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, safeId);
    return card;
  });
}

async function saveAsset(resourceUrl, assetDir, assetIndex) {
  const response = await fetch(resourceUrl);
  if (!response.ok) throw new Error(`Asset request returned ${response.status}`);
  const contentType = response.headers.get('content-type') ?? '';
  const ext = extensionFor(contentType, resourceUrl);
  const filename = `source-asset-${String(assetIndex).padStart(4, '0')}${ext}`;
  const filePath = path.join(assetDir, filename);
  await writeFile(filePath, Buffer.from(await response.arrayBuffer()));
  return filePath;
}

async function rewriteCssUrls(css, cssUrl, outputDir, assetDir, counts) {
  const expression = /url\(\s*(?:(["'])(.*?)\1|([^)]*?))\s*\)/gi;
  const matches = [...css.matchAll(expression)];
  let output = css;
  for (const match of matches.reverse()) {
    const raw = (match[2] ?? match[3] ?? '').trim();
    if (!raw || /^(?:data:|#|var\()/i.test(raw)) continue;
    const resolved = new URL(raw, cssUrl);
    const saved = await saveAsset(resolved.href, assetDir, ++counts.assets);
    const replacement = `url("${relativeAsset(outputDir, saved)}")`;
    output = output.slice(0, match.index) + replacement + output.slice(match.index + match[0].length);
  }
  return output;
}

async function rewriteHtmlAssetTags(html, sourceOrigin, outputDir, assetDir, counts) {
  const userMedia = '../../../assets/studio/lightstick-constellation.webp';
  const attributes = /<(?:img|source|video|audio|image)\b[^>]*>/gi;
  let output = html;

  for (const match of [...html.matchAll(attributes)].reverse()) {
    let tag = match[0];
    let skipPrivate = false;
    for (const name of ['src', 'poster']) {
      const value = attr(tag, name);
      if (!value) continue;
      if (value.startsWith('../../../assets/')) continue;
      if (isPrivateUserMedia(value)) {
        tag = setAttr(tag, name, userMedia);
        skipPrivate = true;
        continue;
      }
      const resolved = new URL(value, sourceOrigin);
      const saved = await saveAsset(resolved.href, assetDir, ++counts.assets);
      tag = setAttr(tag, name, relativeAsset(outputDir, saved));
    }
    const srcset = attr(tag, 'srcset');
    if (srcset) {
      const rewritten = [];
      for (const candidate of srcset.split(',')) {
        const [candidateUrl, ...descriptorParts] = candidate.trim().split(/\s+/);
        if (!candidateUrl) continue;
        if (candidateUrl.startsWith('../../../assets/')) {
          rewritten.push(`${candidateUrl} ${descriptorParts.join(' ')}`.trim());
          continue;
        }
        if (skipPrivate || isPrivateUserMedia(candidateUrl)) {
          rewritten.push(`${userMedia} ${descriptorParts.join(' ')}`.trim());
          continue;
        }
        const saved = await saveAsset(new URL(candidateUrl, sourceOrigin).href, assetDir, ++counts.assets);
        rewritten.push(`${relativeAsset(outputDir, saved)} ${descriptorParts.join(' ')}`.trim());
      }
      tag = setAttr(tag, 'srcset', rewritten.join(', '));
    }
    output = output.slice(0, match.index) + tag + output.slice(match.index + match[0].length);
  }

  const styledTags = [...output.matchAll(/<[^>]+\bstyle="[^"]*"[^>]*>/gi)];
  for (const match of styledTags.reverse()) {
    const style = attr(match[0], 'style');
    if (!style || !/url\(/i.test(style)) continue;
    const decodedStyle = style.replaceAll('&quot;', '"').replaceAll('&#39;', "'");
    const rewrittenStyle = await rewriteCssUrls(decodedStyle, sourceOrigin, outputDir, assetDir, counts);
    const tag = setAttr(match[0], 'style', rewrittenStyle);
    output = output.slice(0, match.index) + tag + output.slice(match.index + match[0].length);
  }
  return output;
}

async function extractProduct(product) {
  const pageUrl = new URL(product.route, origin);
  const response = await fetch(pageUrl);
  if (!response.ok) throw new Error(`${product.id}: route returned ${response.status}`);
  const document = await response.text();
  const htmlOpen = document.match(/<html\b[^>]*>/i)?.[0] ?? '<html lang="en">';
  const bodyMatch = document.match(/<body\b([^>]*)>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) throw new Error(`${product.id}: no server-rendered body found`);
  const bodyOpen = `<body${bodyMatch[1]}>`;
  let body = bodyMatch[2]
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript\s*>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, '');
  if (product.id === 'mearrow-sns') body = sanitizeSnsCards(body);
  body = body.replace(/<a\b[^>]*>/gi, (anchorTag) => {
    const href = attr(anchorTag, 'href');
    if (!href || href.startsWith('#')) return anchorTag;
    const resolved = new URL(href, pageUrl);
    return setAttr(anchorTag, 'href', resolved.hash || '#');
  });
  body = body.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, 'portfolio-static-id');

  const outputDir = path.join(kitDir, 'pub', 'admin', product.id);
  const assetDir = path.join(kitDir, 'pub', 'assets', 'mearrow-source', product.id);
  await mkdir(outputDir, { recursive: true });
  await rm(assetDir, { recursive: true, force: true });
  await mkdir(assetDir, { recursive: true });

  const stylesheetLinks = [...document.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => match[0])
    .filter((tag) => /href=["'][^"']+\.css(?:[?#][^"']*)?["']/i.test(tag))
    .map((tag) => attr(tag, 'href'))
    .filter(Boolean);
  if (!stylesheetLinks.length) throw new Error(`${product.id}: no source stylesheets found`);

  const counts = { assets: 0 };
  let styles = '';
  for (const href of stylesheetLinks) {
    const cssUrl = new URL(href, origin);
    const cssResponse = await fetch(cssUrl);
    if (!cssResponse.ok) throw new Error(`${product.id}: stylesheet returned ${cssResponse.status}`);
    const css = await cssResponse.text();
    styles += `\n/* Source stylesheet: ${cssUrl.pathname} */\n`;
    styles += await rewriteCssUrls(css, cssUrl, outputDir, assetDir, counts);
    styles += '\n';
  }

  body = await rewriteHtmlAssetTags(body, origin, outputDir, assetDir, counts);
  const pageStyles = `<!doctype html>\n${htmlOpen}\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="robots" content="noindex">\n<title>${product.id === 'mearrow-sns' ? 'MEARROW SNS' : 'MEARROW Studio'} · Source-faithful static transfer</title>\n<link rel="stylesheet" href="./styles.css">\n</head>\n${bodyOpen}\n<!-- Static transfer from ${pageUrl.pathname}; runtime scripts and private feed data are removed. -->\n${body}\n</body>\n</html>\n`;
  await writeFile(path.join(outputDir, 'index.html'), pageStyles);
  await writeFile(path.join(outputDir, 'styles.css'), styles);
  return { product: product.id, stylesheets: stylesheetLinks.length, copiedAssets: counts.assets };
}

for (const product of products) {
  const result = await extractProduct(product);
  console.log(`${result.product}: source HTML/CSS copied; ${result.stylesheets} stylesheets, ${result.copiedAssets} local assets`);
}
