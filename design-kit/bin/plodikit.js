#!/usr/bin/env node

import { constants, existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultTarget = "design-kit";
const modes = new Set(["empty-raw", "sample-scaffold", "copy-existing"]);
const surfaces = new Set(["web", "app", "multi"]);

const rawPlaceholder = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Empty raw source</title>
    <link rel="icon" href="data:," />
  </head>
  <body></body>
</html>
`;

const wrapperFiles = {
  web: [
    "deliverables/portfolio/styles.css",
    "deliverables/portfolio/web/index.html",
    "deliverables/portfolio/web/main-thumbnail.html",
    "deliverables/portfolio/web/detail-page.html",
    "deliverables/portfolio/web/pages.html",
  ],
};

const excludedNames = new Set([
  ".git",
  ".playwright-mcp",
  ".worktrees",
  "node_modules",
  "dist",
]);

main().catch((error) => {
  console.error(`plodikit: ${error.message}`);
  process.exitCode = 1;
});

async function main() {
  const [command = "help", ...rest] = process.argv.slice(2);
  const options = parseOptions(rest);

  if (command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "init") {
    await init(options);
    return;
  }

  if (command === "doctor") {
    await doctor(options);
    return;
  }

  throw new Error(`unknown command "${command}"`);
}

function parseOptions(args) {
  const options = {
    mode: "empty-raw",
    surface: "web",
    target: defaultTarget,
    source: packageRoot,
    force: false,
    replace: false,
    webSource: "",
    appSource: "",
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--force") {
      options.force = true;
      continue;
    }
    if (arg === "--replace") {
      options.replace = true;
      continue;
    }
    if (arg.startsWith("--")) {
      const [key, inlineValue] = arg.slice(2).split("=", 2);
      const value = inlineValue ?? args[index + 1];
      if (inlineValue === undefined) index += 1;
      assignOption(options, key, value);
      continue;
    }
    if (!options.positional) options.positional = [];
    options.positional.push(arg);
  }

  if (options.positional?.[0]) options.target = options.positional[0];
  options.source = path.resolve(options.source);
  options.target = path.resolve(process.cwd(), options.target);
  if (options.force) options.replace = true;
  if (options.webSource) options.webSource = path.resolve(process.cwd(), options.webSource);
  if (options.appSource) options.appSource = path.resolve(process.cwd(), options.appSource);
  return options;
}

function assignOption(options, key, value) {
  const map = {
    mode: "mode",
    surface: "surface",
    target: "target",
    source: "source",
    "web-source": "webSource",
    "app-source": "appSource",
  };
  const targetKey = map[key];
  if (!targetKey) throw new Error(`unknown option --${key}`);
  if (!value) throw new Error(`missing value for --${key}`);
  options[targetKey] = value;
}

async function init(options) {
  validateOptions(options, { requireCopySources: true });
  assertInstallTarget(options.source, options.target);

  if (existsSync(options.target)) {
    if (!options.replace) {
      throw new Error(`target already exists: ${options.target}. Use --replace to recreate it.`);
    }
    await fs.rm(options.target, { recursive: true, force: true });
  }

  await copyTree(options.source, options.target, options.target);
  await applySurface(options.target, options.surface);
  await applyMode(options);
  if (options.mode !== "sample-scaffold") {
    await writeInstalledRootIndex(options.target, options.surface);
    await writeInstalledPubHub(options.target, options.surface, options.mode);
  }
  await writeInstallRecord(options);

  const result = await runChecks(options, { strict: true });
  printCheckResult("PLODIKIT_INIT", result);
  if (!result.ok) process.exitCode = 1;
}

async function doctor(options) {
  validateOptions(options, { requireCopySources: false });
  const result = await runChecks(options, { strict: false });
  printCheckResult("PLODIKIT_DOCTOR", result);
  if (!result.ok) process.exitCode = 1;
}

function validateOptions(options, { requireCopySources }) {
  if (!modes.has(options.mode)) {
    throw new Error(`invalid mode "${options.mode}". Use empty-raw, sample-scaffold, or copy-existing.`);
  }
  if (!surfaces.has(options.surface)) {
    throw new Error(`invalid surface "${options.surface}". Use web, app, or multi.`);
  }
  if (requireCopySources && options.mode === "copy-existing") {
    const needsWeb = options.surface === "web" || options.surface === "multi";
    const needsApp = options.surface === "app" || options.surface === "multi";
    if (needsWeb && !options.webSource) throw new Error("copy-existing web install requires --web-source");
    if (needsApp && !options.appSource) throw new Error("copy-existing app install requires --app-source");
  }
}

function assertInstallTarget(source, target) {
  const relative = path.relative(source, target);
  if (!relative || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    throw new Error("target must not be inside the design-kit source repo");
  }
}

async function copyTree(source, target, installTarget) {
  await fs.mkdir(target, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    if (excludedNames.has(entry.name)) continue;
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (sameOrInside(from, installTarget)) continue;
    if (entry.isDirectory()) {
      await copyTree(from, to, installTarget);
    } else if (entry.isFile()) {
      await fs.mkdir(path.dirname(to), { recursive: true });
      await fs.copyFile(from, to);
    }
  }
}

function sameOrInside(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return !relative || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function applySurface(target, surface) {
  if (surface === "web") {
    await removePaths(target, [
      "pub/app",
      "deliverables/portfolio/mobile",
      "screenshots/deliverables/portfolio/mobile",
    ]);
  }
  if (surface === "app") {
    await removePaths(target, [
      "pub/admin",
      "deliverables/portfolio/web",
      "screenshots/deliverables/portfolio/web",
    ]);
  }
}

async function applyMode(options) {
  if (options.mode === "sample-scaffold") return;

  if (options.mode === "empty-raw") {
    await emptyRawSources(options.target, options.surface);
    await removeSampleOutputs(options.target, options.surface);
    return;
  }

  if (options.mode === "copy-existing") {
    if (options.surface === "web" || options.surface === "multi") {
      await replaceDirectory(options.webSource, path.join(options.target, "pub/admin"));
    }
    if (options.surface === "app" || options.surface === "multi") {
      await replaceDirectory(options.appSource, path.join(options.target, "pub/app"));
    }
    await removeSampleOutputs(options.target, options.surface);
  }
}

async function emptyRawSources(target, surface) {
  if (surface === "web" || surface === "multi") {
    await writeRawPlaceholder(path.join(target, "pub/admin"));
  }
  if (surface === "app" || surface === "multi") {
    await writeRawPlaceholder(path.join(target, "pub/app"));
  }
}

async function writeRawPlaceholder(rawDir) {
  await fs.mkdir(rawDir, { recursive: true });
  await fs.writeFile(path.join(rawDir, "index.html"), rawPlaceholder);
  await fs.writeFile(path.join(rawDir, "styles.css"), "");
}

async function writeInstalledPubHub(target, surface, mode) {
  const entries = [];
  if (surface === "web" || surface === "multi") entries.push(["Admin raw source", "./admin/"]);
  if (surface === "app" || surface === "multi") entries.push(["App raw source", "./app/"]);
  const list = entries
    .map(([label, href]) => `          <li><a href="${href}">${label}</a></li>`)
    .join("\n");

  const html = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Design Kit Raw Sources</title>
    <link rel="icon" href="data:," />
    <link rel="stylesheet" href="./styles.css" />
    <style>
      .pub-install-hub {
        box-sizing: border-box;
        min-height: 100vh;
        padding: 64px 28px;
        font-family: Pretendard, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        color: #20242b;
        background: #f7f5ef;
      }
      .pub-install-hub .eyebrow {
        margin: 0 0 16px;
        color: #237962;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0;
      }
      .pub-install-hub h1 {
        margin: 0;
        font-size: clamp(34px, 6vw, 72px);
        line-height: 1;
        letter-spacing: 0;
      }
      .pub-install-hub p {
        max-width: 680px;
        margin: 22px 0;
        color: #5d6876;
        font-size: 18px;
        line-height: 1.6;
      }
      .pub-install-hub ul {
        display: grid;
        gap: 12px;
        max-width: 420px;
        padding: 0;
        margin: 32px 0 0;
        list-style: none;
      }
      .pub-install-hub a {
        display: block;
        padding: 16px 18px;
        border: 1px solid rgba(32, 36, 43, 0.12);
        border-radius: 8px;
        color: #20242b;
        background: #fffdf8;
        text-decoration: none;
        font-weight: 800;
      }
    </style>
  </head>
  <body>
    <main class="pub-install-hub" aria-labelledby="pub-title">
      <p class="eyebrow">PLOSTACK DESIGN KIT</p>
      <h1 id="pub-title">Raw source hub</h1>
      <p>
        Install mode: <strong>${mode}</strong>. Portfolio wrappers load these raw sources through iframe.
      </p>
      <nav aria-label="Raw source routes">
        <ul>
${list}
        </ul>
      </nav>
    </main>
  </body>
</html>
`;

  await fs.writeFile(path.join(target, "pub/index.html"), html);
}

async function writeInstalledRootIndex(target, surface) {
  const pubRows = [];
  const deliverableRows = [];

  if (surface === "app" || surface === "multi") {
    pubRows.push({
      code: "APP",
      href: "./pub/app/",
      path: "pub/app/",
      purpose: "모바일 앱 raw 화면",
    });
  }

  if (surface === "web" || surface === "multi") {
    pubRows.push({
      code: "ADMIN",
      href: "./pub/admin/",
      path: "pub/admin/",
      purpose: "관리자 raw 화면",
    });
    deliverableRows.push({
      code: "WEB",
      href: "./deliverables/portfolio/web/",
      path: "web package",
      purpose: "관리자 웹 대표, 상세, 페이지 모음 허브",
    });
  }

  const rowMarkup = (rows) => rows
    .map((row) => `              <li>
                <a class="ledger-subrow" href="${row.href}">
                  <span class="ledger-code">${row.code}</span>
                  <strong class="ledger-path">${row.path}</strong>
                  <span class="ledger-purpose">${row.purpose}</span>
                </a>
              </li>`)
    .join("\n");

  const html = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>플디킷</title>
    <meta
      name="description"
      content="프로젝트에 심어 초기 디자인, 퍼블리싱, 포트폴리오 산출물을 뽑는 Plostack Design Kit 모듈"
    />
    <link rel="icon" href="data:," />
    <link rel="stylesheet" href="./styles/index.css" />
  </head>
  <body>
    <main class="kit-console">
      <nav class="artifact-ledger" aria-label="플디킷 핵심 산출물">
        <ul class="ledger-list" aria-label="플디킷 산출물 경로">
          <li>
            <a class="ledger-row" href="./DESIGN.md">
              <span class="ledger-code">DESIGN</span>
              <strong class="ledger-path">DESIGN.md</strong>
              <span class="ledger-purpose">디자인 원본 규칙</span>
              <span class="ledger-state">source</span>
            </a>
          </li>
          <li>
            <a class="ledger-row" href="./sitemap.html">
              <span class="ledger-code">MAP</span>
              <strong class="ledger-path">sitemap.html</strong>
              <span class="ledger-purpose">산출물 route와 surface 연결 지도</span>
              <span class="ledger-state">map</span>
            </a>
          </li>
          <li id="pub">
            <div class="ledger-row ledger-row--group">
              <span class="ledger-code">PUB</span>
              <strong class="ledger-path">pub/</strong>
              <span class="ledger-purpose">raw 화면 publishing 원본</span>
              <span class="ledger-state">raw</span>
            </div>
            <ul class="ledger-sublist" aria-label="pub level 2 routes">
${rowMarkup(pubRows)}
            </ul>
          </li>
          <li id="deliverables">
            <div class="ledger-row ledger-row--group">
              <span class="ledger-code">OUT</span>
              <strong class="ledger-path">deliverables/</strong>
              <span class="ledger-purpose">프로젝트별 제출/공유용 디자인 산출물</span>
              <span class="ledger-state">export</span>
            </div>
            <ul class="ledger-sublist" aria-label="deliverables level 2 routes">
${rowMarkup(deliverableRows)}
            </ul>
          </li>
        </ul>
      </nav>
    </main>
  </body>
</html>
`;

  await fs.writeFile(path.join(target, "index.html"), html);
}

async function removeSampleOutputs(target, surface) {
  const paths = ["assets/generated", "screenshots/origin", "screenshots/pub"];
  if (surface === "web" || surface === "multi") paths.push("screenshots/deliverables/portfolio/web");
  if (surface === "app" || surface === "multi") paths.push("screenshots/deliverables/portfolio/mobile");
  await removePaths(target, paths);
}

async function removePaths(root, paths) {
  await Promise.all(paths.map((item) => fs.rm(path.join(root, item), { recursive: true, force: true })));
}

async function replaceDirectory(source, target) {
  await fs.access(source, constants.R_OK);
  await fs.rm(target, { recursive: true, force: true });
  await copyTree(source, target, target);
}

async function writeInstallRecord(options) {
  const record = [
    "# Plostack Design Kit Install",
    "",
    `- mode: ${options.mode}`,
    `- surface: ${options.surface}`,
    `- source: ${options.source}`,
    "",
    "This file records how the design kit was initialized. AGENTS.md remains the source of truth.",
    "",
  ].join("\n");
  await fs.writeFile(path.join(options.target, "INSTALL.md"), record);
}

async function runChecks(options, { strict }) {
  const checks = [];
  const target = options.target;

  checks.push(await checkExists("target", target));
  checks.push(await checkNonEmptyFile("pub hub", path.join(target, "pub/index.html")));

  if (options.surface === "web" || options.surface === "multi") {
    checks.push(await checkExists("admin raw", path.join(target, "pub/admin/index.html")));
    checks.push(await checkWrappers(options.source, target, "web"));
  }

  if (options.surface === "app" || options.surface === "multi") {
    checks.push(await checkExists("app raw", path.join(target, "pub/app/index.html")));
    checks.push(await checkMissing(
      "native app concepts are not exported as a portfolio package",
      path.join(target, "deliverables/portfolio/mobile"),
    ));
  }

  if (options.surface === "multi" && await hasProductSpecificWrappers(target)) {
    checks.push(await checkMearrowProductTracks(target));
  }

  if (options.mode === "empty-raw") {
    checks.push(await checkMissing("generated sample images removed", path.join(target, "assets/generated")));
    checks.push(await checkMissing("pub sample screenshots removed", path.join(target, "screenshots/pub")));
    checks.push(await checkMissing("origin sample screenshots removed", path.join(target, "screenshots/origin")));
  }

  checks.push(await checkMissing("public/design-kit absent", path.resolve(process.cwd(), "public/design-kit")));
  checks.push(await checkMissing(
    ".vercel/output/static/design-kit absent",
    path.resolve(process.cwd(), ".vercel/output/static/design-kit"),
  ));
  checks.push(await checkDeployWorkflows(process.cwd()));

  const failed = checks.filter((item) => !item.ok);
  if (strict && failed.length > 0) {
    return { ok: false, checks };
  }
  return { ok: failed.length === 0, checks };
}

async function checkExists(label, filePath) {
  return { label, ok: existsSync(filePath), detail: path.relative(process.cwd(), filePath) || "." };
}

async function checkMissing(label, filePath) {
  return { label, ok: !existsSync(filePath), detail: path.relative(process.cwd(), filePath) || "." };
}

async function checkNonEmptyFile(label, filePath) {
  try {
    const stat = await fs.stat(filePath);
    return { label, ok: stat.isFile() && stat.size > 0, detail: path.relative(process.cwd(), filePath) };
  } catch {
    return { label, ok: false, detail: path.relative(process.cwd(), filePath) };
  }
}

async function checkWrappers(source, target, surface) {
  const files = wrapperFiles[surface];
  if (await hasProductSpecificWrappers(target)) {
    const missing = [];
    for (const file of files) {
      const result = await checkNonEmptyFile("product wrapper", path.join(target, file));
      if (!result.ok) missing.push(file);
    }
    return {
      label: `${surface} product portfolio wrappers present`,
      ok: missing.length === 0,
      detail: missing.length ? `missing ${missing.join(", ")}` : `${files.length} customized files`,
    };
  }

  const mismatches = [];
  for (const file of files) {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);
    if (!(await sameFile(sourcePath, targetPath))) mismatches.push(file);
  }
  return {
    label: `${surface} portfolio wrappers unchanged`,
    ok: mismatches.length === 0,
    detail: mismatches.length ? mismatches.join(", ") : `${files.length} files`,
  };
}

async function hasProductSpecificWrappers(target) {
  try {
    const record = await fs.readFile(path.join(target, "INSTALL.md"), "utf8");
    return /^- portfolio wrappers: product-specific$/m.test(record);
  } catch {
    return false;
  }
}

async function checkMearrowProductTracks(target) {
  const required = [
    "pub/admin/mearrow-sns/index.html",
    "pub/admin/mearrow-sns/styleguide/index.html",
    "pub/admin/mearrow-studio/index.html",
    "pub/admin/mearrow-studio/styleguide/index.html",
    "pub/app/mearrow-sns/index.html",
    "pub/app/mearrow-sns/styleguide/index.html",
    "pub/app/mearrow-studio/index.html",
    "pub/app/mearrow-studio/styleguide/index.html",
    "deliverables/portfolio/web/mearrow-sns/index.html",
    "deliverables/portfolio/web/mearrow-studio/index.html",
    "tools/generate-portfolio-pages.sh",
    "tools/capture-mearrow-portfolio.mjs",
  ];
  const missing = [];
  for (const relativePath of required) {
    const result = await checkNonEmptyFile("product track", path.join(target, relativePath));
    if (!result.ok) missing.push(relativePath);
  }
  return {
    label: "MEARROW product-surface tracks",
    ok: missing.length === 0,
    detail: missing.length ? `missing ${missing.join(", ")}` : `${required.length} product files present`,
  };
}

async function sameFile(first, second) {
  try {
    const [left, right] = await Promise.all([fs.readFile(first), fs.readFile(second)]);
    return Buffer.compare(left, right) === 0;
  } catch {
    return false;
  }
}

async function checkDeployWorkflows(root) {
  const workflowDir = path.join(root, ".github/workflows");
  if (!existsSync(workflowDir)) {
    return { label: "deploy workflow guard", ok: true, detail: "no workflows" };
  }

  const entries = await fs.readdir(workflowDir, { withFileTypes: true });
  const workflowFiles = entries
    .filter((entry) => entry.isFile() && /\.(ya?ml)$/i.test(entry.name))
    .map((entry) => path.join(workflowDir, entry.name));

  const deployFiles = [];
  for (const file of workflowFiles) {
    const content = await fs.readFile(file, "utf8");
    if (/cloudflare|vercel|netlify|deploy|pages/i.test(content)) deployFiles.push({ file, content });
  }

  if (deployFiles.length === 0) {
    return { label: "deploy workflow guard", ok: true, detail: "no deploy workflow" };
  }

  const missing = deployFiles
    .filter(({ content }) => !/paths-ignore:[\s\S]*design-kit\/\*\*/.test(content))
    .map(({ file }) => path.relative(root, file));

  return {
    label: "deploy workflow guard",
    ok: missing.length === 0,
    detail: missing.length ? `missing paths-ignore in ${missing.join(", ")}` : "paths-ignore present",
  };
}

function printCheckResult(name, result) {
  console.log(`${name}: ${result.ok ? "PASS" : "FAIL"}`);
  for (const check of result.checks) {
    console.log(`- ${check.ok ? "PASS" : "FAIL"} ${check.label}: ${check.detail}`);
  }
}

function printHelp() {
  console.log(`Plostack Design Kit CLI

Usage:
  plodikit init [target] --surface web --mode empty-raw
  plodikit init design-kit --surface web --mode sample-scaffold
  plodikit init design-kit --surface web --mode copy-existing --web-source ./design-lab/pub/admin
  plodikit doctor --target design-kit --surface web --mode empty-raw

Options:
  --target <path>       Install target. Default: design-kit
  --source <path>       Design-kit source root. Default: this package
  --surface <type>      web, app, or multi. Default: web
  --mode <mode>         empty-raw, sample-scaffold, or copy-existing. Default: empty-raw
  --web-source <path>   Existing admin raw source for copy-existing
  --app-source <path>   Existing app raw source for copy-existing
  --replace             Recreate target if it already exists
  --force               Alias for --replace
`);
}
