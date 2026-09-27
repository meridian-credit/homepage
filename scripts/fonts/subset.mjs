#!/usr/bin/env node
/* 한글 웹폰트를 사이트에 실제로 쓰인 글자만 남겨 다시 굽는다.
 *
 * Pretendard · Wanted Sans 는 배포본 그대로 92조각(unicode-range)으로 실려 있다.
 * 조각은 페이지에 그 범위 글자가 하나라도 있으면 통째로 받는데, 한 조각에 한글이
 * 수백 자씩 들어 있어 페이지마다 600KB 안팎을 받았다. 사이트 글은 코드와 content/
 * 에 다 있으니, 조각마다 그 글자만 남긴 "… Site" family 를 만들어 앞에 세운다.
 *
 * - 조각 구조와 조각별 서체 설정(굵기 축·표시 방식)은 원본 그대로 둔다.
 * - unicode-range 는 실제로 남긴 글자만 적는다. 그래서 사이트에 없는 글자(검색어,
 *   문의 입력)는 subset 이 가로채지 않고, 뒤에 선 원래 family 조각이 받아 그린다.
 * - 오픈타입 기능(tabular-nums 등)과 가변 축은 subset-font 기본값대로 모두 남는다.
 *
 * 결과는 src/fonts/generated/ 에 쓰고(git 제외) layout 이 import 한다. 그러면 Next 가
 * 파일마다 내용 해시 이름을 붙여 /_next/static/media 에 불변 캐시로 싣는다.
 * build · dev 스크립트가 이걸 먼저 돌린다(2초 남짓). 실패하면 빌드도 멈춘다.
 * 같은 입력이면 같은 파일이 나와 해시도 그대로다 — 재방문자 캐시가 깨지지 않는다.
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import subsetFont from 'subset-font';

const root = path.resolve(import.meta.dirname, '../..');
const outDir = path.join(root, 'src/fonts/generated');
const families = [
  { css: 'src/fonts/pretendard/PretendardVariable.css', family: 'Pretendard Site', dir: 'pretendard' },
  { css: 'src/fonts/wanted/WantedSansVariable.css', family: 'Wanted Sans Site', dir: 'wanted' },
];

/* 코드에 문자열로 없는데 화면에 나오는 글자. 날짜는 Intl(ko-KR, month: long)이
   「2026년 9월 27일」로 찍는다(src/lib/content-system.ts). */
const RUNTIME_TEXT = '년월일';

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', copy: '©', middot: '·', times: '×',
  larr: '←', rarr: '→', uarr: '↑', darr: '↓', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  hellip: '…', ndash: '–', mdash: '—', bull: '•',
};

/* 코드(JSX)는 strict 다. 모르는 이름을 조용히 넘기면 그 글자가 subset 에서 빠진다. 여기에 더해 준다.
   글(content/)은 빌드를 멈추지 않는다. 「R&D;」 같은 평범한 글이 엔티티 꼴이 될 수 있고, MDX 는 모르는
   이름을 글자 그대로 찍는다(그 글자는 이미 다 들어 있다). 진짜 엔티티라면 그 글자만 원래 조각에서 받는다. */
function decodeEntities(text, where, strict = true) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body) => {
    if (body[0] === '#') return String.fromCodePoint(body[1].toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : Number(body.slice(1)));
    const decoded = ENTITIES[body];
    if (decoded !== undefined) return decoded;
    if (strict) throw new Error(`${where}: 모르는 HTML 엔티티 ${match} — scripts/fonts/subset.mjs 의 ENTITIES 에 더하세요`);
    console.warn(`warning: ${where}: ${match} 를 글자 그대로 센다 — 진짜 HTML 엔티티면 ENTITIES 에 더하세요`);
    return match;
  });
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return full === outDir ? [] : listFiles(full);
    return [full];
  });
}

/* 문자열 리터럴 · 템플릿 조각 · JSX 텍스트만 모은다. 주석과 식별자는 화면에 안 나온다.
   스캐너가 아니라 파서를 쓰는 이유: JSX 텍스트는 문맥을 알아야 토큰이 되고,
   같은 이스케이프는 파서가 풀어 준 값(.text)이 실제 글자다. */
function collectSource(file, add) {
  const text = fs.readFileSync(file, 'utf8');
  const kind = file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const visit = (node) => {
    if (ts.isJsxText(node)) add(decodeEntities(node.text, file));
    else if (ts.isStringLiteral(node) && ts.isJsxAttribute(node.parent)) add(decodeEntities(node.text, file));
    else if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) add(node.text);
    ts.forEachChild(node, visit);
  };
  visit(source);
}

/* CSS 는 content: 로 찍는 글자만 화면에 나온다. \2192 같은 이스케이프를 푼다. */
function collectCss(file, add) {
  const text = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, , value] of text.matchAll(/content:\s*(["'])((?:\\.|(?!\1).)*)\1/g)) {
    add(value.replace(/\\([0-9a-f]{1,6})\s?/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16))).replace(/\\(.)/g, '$1'));
  }
}

function collectSiteCodePoints() {
  const points = new Set();
  const add = (text) => { for (const ch of text) points.add(ch.codePointAt(0)); };
  for (const file of listFiles(path.join(root, 'src'))) {
    if (/\.(ts|tsx|mts)$/.test(file) && !file.endsWith('.d.ts')) collectSource(file, add);
    else if (file.endsWith('.css')) collectCss(file, add);
  }
  for (const file of listFiles(path.join(root, 'content'))) add(decodeEntities(fs.readFileSync(file, 'utf8'), file, false));
  add(RUNTIME_TEXT);
  for (let cp = 0x20; cp <= 0x7e; cp++) points.add(cp);
  /* 줄바꿈·탭은 글리프가 아니다. */
  for (const cp of [0x09, 0x0a, 0x0d]) points.delete(cp);
  return points;
}

function parseRange(value) {
  return value.split(',').map((part) => {
    const [from, to] = part.trim().replace(/^U\+/i, '').split('-').map((hex) => parseInt(hex, 16));
    return [from, to ?? from];
  });
}

function formatRange(points) {
  const ranges = [];
  for (const cp of points) {
    const last = ranges.at(-1);
    if (last && cp === last[1] + 1) last[1] = cp;
    else ranges.push([cp, cp]);
  }
  return ranges.map(([a, b]) => (a === b ? `U+${a.toString(16)}` : `U+${a.toString(16)}-${b.toString(16)}`)).join(', ');
}

function parseFaces(cssFile) {
  const css = fs.readFileSync(cssFile, 'utf8');
  return [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body]) => {
    const get = (name) => body.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim();
    const url = get('src').match(/url\(([^)]+)\)/)[1].replace(/['"]/g, '');
    return {
      style: get('font-style'),
      weight: get('font-weight'),
      display: get('font-display'),
      format: get('src').match(/format\(([^)]+)\)/)?.[1] ?? "'woff2'",
      file: path.resolve(path.dirname(cssFile), url),
      ranges: parseRange(get('unicode-range')),
    };
  });
}

const sitePoints = [...collectSiteCodePoints()].sort((a, b) => a - b);

fs.rmSync(outDir, { recursive: true, force: true });
const rules = [
  `/* scripts/fonts/subset.mjs 가 만든 파일이다. 직접 고치지 말 것.
   원본 서체와 라이선스(SIL OFL 1.1)는 src/fonts/pretendard · src/fonts/wanted 에 있다. */`,
];
let before = 0;
let after = 0;
for (const { css, family, dir } of families) {
  fs.mkdirSync(path.join(outDir, dir), { recursive: true });
  const faces = parseFaces(path.join(root, css));
  for (const [index, face] of faces.entries()) {
    const kept = sitePoints.filter((cp) => face.ranges.some(([a, b]) => cp >= a && cp <= b));
    if (!kept.length) continue;
    const original = fs.readFileSync(face.file);
    const subset = await subsetFont(original, String.fromCodePoint(...kept), { targetFormat: 'woff2' });
    fs.writeFileSync(path.join(outDir, dir, `${index}.woff2`), subset);
    before += original.length;
    after += subset.length;
    rules.push(`@font-face {
  font-family: '${family}';
  font-style: ${face.style};
  font-display: ${face.display};
  font-weight: ${face.weight};
  src: url(./${dir}/${index}.woff2) format(${face.format});
  unicode-range: ${formatRange(kept)};
}`);
  }
}
fs.writeFileSync(path.join(outDir, 'site-fonts.css'), `${rules.join('\n\n')}\n`);
console.log(`fonts: 사이트 글자 ${sitePoints.length}자, ${rules.length - 1}조각 ${Math.round(before / 1024)}KB → ${Math.round(after / 1024)}KB`);
