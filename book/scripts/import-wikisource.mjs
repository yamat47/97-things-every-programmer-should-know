// 日本語版ウィキソースの『プログラマが知るべき97のこと』から各エッセイを取得し、
// things/thing-N.md（97 本）、things/ja-N.md（日本人プログラマによる 10 本）、SUMMARY.md を生成する。
//
// 使い方: npm run import
//
// 生成物は手で編集しない。誤りはウィキソース側か、このスクリプトの変換を直して再生成する。

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const BOOK_DIR = join(import.meta.dirname, "..");
const API = "https://ja.wikisource.org/w/api.php";
const USER_AGENT =
  "97-things-import/1.0 (https://github.com/yamat47/97-things-every-programmer-should-know)";
const ROOT = "プログラマが知るべき97のこと";
// 目次に並ぶ順のまとまりごとの、ファイル名の接頭辞と本数
const GROUPS = [
  { prefix: "thing", count: 97 },
  { prefix: "ja", count: 10 },
];
// 日本人プログラマによる 10 本は個別ページにライセンスの明記がないので、
// 作品全体を対象とする目次ページの表記をライセンスの根拠にする
const LICENSE_TEMPLATE = /\{\{CC-BY-3\.0-US\}\}/i;
const LICENSE_URL = "https://creativecommons.org/licenses/by/3.0/us/deed.ja";

async function api(params) {
  const response = await fetch(API, {
    method: "POST",
    headers: { "User-Agent": USER_AGENT },
    body: new URLSearchParams({ ...params, format: "json", formatversion: "2" }),
  });
  if (!response.ok) {
    throw new Error(`Wikisource API returned ${response.status}`);
  }
  return response.json();
}

// 目次のエッセイ一覧を、間に挟まる見出しの行で区切ったまとまりに分ける
export function parseIndex(wikitext) {
  const groups = [];
  let heading = null;
  let current = null;
  for (const line of wikitext.slice(templateEnd(wikitext, wikitext.search(/\{\{header/i))).split("\n")) {
    const item = line.match(/^#\[\[\/([^|\]]+)/);
    if (item) {
      if (!current) groups.push((current = { heading, titles: [] }));
      current.titles.push(item[1]);
    } else if (line.trim() && !/^(\[\[Category:|\{\{)/.test(line)) {
      heading = line.trim();
      current = null;
    }
  }
  return groups;
}

async function fetchIndex() {
  const data = await api({ action: "parse", page: ROOT, prop: "wikitext" });
  const { wikitext } = data.parse;
  if (!LICENSE_TEMPLATE.test(wikitext)) throw new Error("No CC BY 3.0 US notice on the index page");
  const groups = parseIndex(wikitext);
  const counts = groups.map((group) => group.titles.length).join(", ");
  if (counts !== GROUPS.map((group) => group.count).join(", ")) {
    throw new Error(`Unexpected essay groups in the index: ${counts}`);
  }
  return groups;
}

async function fetchPages(titles) {
  const pages = [];
  for (let i = 0; i < titles.length; i += 10) {
    const chunk = titles.slice(i, i + 10).map((title) => `${ROOT}/${title}`);
    const data = await api({
      action: "query",
      prop: "revisions",
      rvprop: "content|ids",
      rvslots: "main",
      redirects: "1",
      titles: chunk.join("|"),
    });
    const byTitle = new Map(data.query.pages.map((page) => [page.title, page]));
    const moved = new Map();
    for (const { from, to } of [...(data.query.normalized ?? []), ...(data.query.redirects ?? [])]) {
      moved.set(from, to);
    }
    for (const requested of chunk) {
      let title = requested;
      while (moved.has(title)) title = moved.get(title);
      const page = byTitle.get(title);
      if (!page || page.missing) throw new Error(`Page not found: ${requested}`);
      pages.push({
        title: page.title,
        revid: page.revisions[0].revid,
        wikitext: page.revisions[0].slots.main.content,
      });
    }
  }
  return pages;
}

// `{{` から対応する `}}` までを、入れ子を数えて切り出す
function templateEnd(text, start) {
  let depth = 0;
  for (let i = start; i < text.length - 1; i++) {
    const pair = text.slice(i, i + 2);
    if (pair === "{{") {
      depth++;
      i++;
    } else if (pair === "}}") {
      depth--;
      i++;
      if (depth === 0) return i + 1;
    }
  }
  throw new Error("Unclosed template");
}

export function splitHeader(wikitext) {
  const start = wikitext.search(/\{\{header/i);
  if (start === -1) throw new Error("No header template");
  const end = templateEnd(wikitext, start);
  const header = wikitext.slice(start, end);
  const field = (name) => {
    const match = header.match(new RegExp(`\\|\\s*${name}\\s*=[ \\t]*([^\\n]*)`));
    return match ? match[1].trim() : "";
  };
  return {
    author: field("author"),
    translator: field("translator"),
    body: wikitext.slice(0, start) + wikitext.slice(end),
  };
}

// トップレベルの `|` で引数を分ける（リンクやテンプレートの中の `|` は数えない）
function splitArgs(text) {
  const args = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < text.length; i++) {
    const pair = text.slice(i, i + 2);
    if (pair === "{{" || pair === "[[") {
      depth++;
      current += pair;
      i++;
    } else if (pair === "}}" || pair === "]]") {
      depth--;
      current += pair;
      i++;
    } else if (text[i] === "|" && depth === 0) {
      args.push(current);
      current = "";
    } else {
      current += text[i];
    }
  }
  args.push(current);
  return args;
}

function inlineCode(code) {
  const fence = code.includes("`") ? "``" : "`";
  const pad = code.startsWith("`") || code.endsWith("`") ? " " : "";
  return `${fence}${pad}${code}${pad}${fence}`;
}

// Markdown や HTML として解釈される文字を、文字どおりに表示させる
function escapeChar(char) {
  return char === "<" ? "&lt;" : `\\${char}`;
}

export function convertTable(table) {
  const rows = table
    .replace(/^\{\|.*\n/, "")
    .replace(/\n\|\}$/, "")
    .split(/^\|-.*$/m)
    .map((row) =>
      row
        .split("\n")
        .filter((line) => /^[!|]/.test(line))
        .map((line) =>
          line
            .slice(1)
            // `rowspan=1|` のようなセル属性を落とす
            .replace(/^\s*\w+=[^|]*\|/, "")
            .trim(),
        ),
    )
    .filter((cells) => cells.length > 0);
  const [head, ...rest] = rows;
  const line = (cells) => `| ${cells.join(" | ")} |`;
  return [line(head), line(head.map(() => "---")), ...rest.map(line)].join("\n");
}

export function convertBody(wikitext, linkFor) {
  const stash = [];
  const keep = (markdown) => {
    stash.push(markdown);
    return `\u0000${stash.length - 1}\u0000`;
  };
  const restore = (text) => {
    let previous;
    do {
      previous = text;
      text = text.replace(/\u0000(\d+)\u0000/g, (_, index) => stash[Number(index)]);
    } while (text !== previous);
    return text;
  };

  const footnotes = [];
  let text = wikitext.replace(/\r\n/g, "\n");

  // Markdown の記法として解釈させたくない部分を、先に退避する
  text = text.replace(
    /<syntaxhighlight(?:\s+lang="?([\w-]+)"?)?[^>]*>\n?([\s\S]*?)\n?<\/syntaxhighlight>/g,
    (_, lang, code) => keep(`\n\n\`\`\`${lang ?? ""}\n${code}\n\`\`\`\n\n`),
  );
  text = text.replace(/((?:^ +\S.*\n?)+)/gm, (block) =>
    keep(`\n\n\`\`\`\n${block.replace(/^ /gm, "").trimEnd()}\n\`\`\`\n\n`),
  );
  text = text.replace(/\{\{[Cc]ode\|([\s\S]*?)\}\}/g, (_, code) =>
    keep(inlineCode(code.replace(/^1=/, ""))),
  );
  text = text.replace(/<tt>([\s\S]*?)<\/tt>/g, (_, code) => keep(inlineCode(code)));
  text = text.replace(/^\{\|[\s\S]*?^\|\}/gm, (table) =>
    keep(convertTable(table).replace(/[<*_]/g, escapeChar)),
  );
  text = text.replace(/\[(https?:\/\/[^\s\]]+)(?: ([^\]]*))?\]/g, (_, url, label) =>
    keep(label ? `[${label}](${url})` : `<${url}>`),
  );
  text = text.replace(/\[\[Category:[^\]]*\]\]\n?/g, "");
  text = text.replace(/\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g, (_, target, label) => {
    const link = linkFor(target);
    return link ? keep(`[${label ?? target}](${link})`) : (label ?? target);
  });
  text = text.replace(/<br\s*\/?>/g, () => keep("<br>"));

  text = text.replace(/[<*_]/g, (char, offset, whole) => {
    if (char === "<" && /^<\/?ref[\s>]/.test(whole.slice(offset, offset + 6))) return char;
    // 行頭の `*` は箇条書きの記号なので残す
    if (char === "*" && /^\**$/.test(whole.slice(whole.lastIndexOf("\n", offset - 1) + 1, offset))) {
      return char;
    }
    return escapeChar(char);
  });

  text = text.replace(/<ref[^>]*>([\s\S]*?)<\/ref>/g, (_, note) => {
    footnotes.push(note.trim());
    return `[^${footnotes.length}]`;
  });

  text = text.replace(/\{\{-\}\}/g, "");
  text = text.replace(/&lt;references\s*\/?>/gi, "");
  let quote;
  while ((quote = text.search(/\{\{Quote\|/i)) !== -1) {
    const end = templateEnd(text, quote);
    const [body, source] = splitArgs(text.slice(quote + "{{Quote|".length, end - 2));
    const lines = body.trim().split("\n");
    if (source) lines.push("", `— ${source.trim()}`);
    text = `${text.slice(0, quote)}\n\n${lines.map((l) => `> ${l}`.trimEnd()).join("\n")}\n\n${text.slice(end)}`;
  }
  if (/\{\{|\}\}/.test(text)) throw new Error("Unsupported template left in the body");

  text = text.replace(/^(\*+)\s*/gm, (_, stars) => `${"  ".repeat(stars.length - 1)}* `);
  text = text.replace(/^#\s*/gm, "1. ");
  text = text.replace(/^(=+)\s*(.+?)\s*=+\s*$/gm, (_, level, title) => `${"#".repeat(level.length)} ${title}`);
  text = text.replace(/^:\s*/gm, "> ");
  // 行頭の記法を先に済ませる。太字の `**` が箇条書きの記号に見えてしまうため
  text = text.replace(/'''(.+?)'''/g, "**$1**");
  text = text.replace(/''(.+?)''/g, "*$1*");

  text = restore(text)
    .replace(/^[ \t　]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const notes = footnotes.map((note, index) => `[^${index + 1}]: ${restore(note)}`);
  return notes.length > 0 ? `${text}\n\n${notes.join("\n\n")}` : text;
}

function renderEssay(title, page, linkFor) {
  const { author, translator, body } = splitHeader(page.wikitext);
  if (!author) throw new Error("No author");

  let markdown = convertBody(body, linkFor);
  // HonKit は本文を Nunjucks テンプレートとして評価するので、コード中の波括弧を守る
  if (/\{\{|\{%|\{#/.test(markdown)) markdown = `{% raw %}\n${markdown}\n{% endraw %}`;

  const permalink = `https://ja.wikisource.org/w/index.php?oldid=${page.revid}`;
  const credit = [
    `出典: [ウィキソース「${page.title}」](${permalink})。`,
    `Kevlin Henney 編、和田卓人 監修${translator ? `、${translator} 訳` : ""}`,
    `『${ROOT}』（オライリー・ジャパン、2010年）。`,
    `このエッセイは [CC BY 3.0 US](${LICENSE_URL}) のもとで提供されています。`,
    "掲載にあたり、体裁を Markdown に変換しています。",
  ].join("");

  return `${title}\n====\n\n著者: ${author}\n\n${markdown}\n\n---\n\n${credit}\n`;
}

// テストから変換の関数だけを読み込めるよう、取り込みは直接実行されたときに限る
if (import.meta.main) {
  const groups = await fetchIndex();
  const titles = groups.flatMap((group) => group.titles);
  const pages = await fetchPages(titles);
  const files = groups.flatMap((group, g) =>
    group.titles.map((_, index) => `${GROUPS[g].prefix}-${index + 1}.md`),
  );

  // 本文中のウィキリンクは、転送前と転送後のどちらのページ名でも書かれうる
  const links = new Map();
  titles.forEach((title, index) => {
    links.set(`${ROOT}/${title}`, `./${files[index]}`);
    links.set(pages[index].title, `./${files[index]}`);
  });
  const linkFor = (target) => links.get(target) ?? null;

  await mkdir(join(BOOK_DIR, "things"), { recursive: true });
  for (const [index, title] of titles.entries()) {
    try {
      await writeFile(join(BOOK_DIR, "things", files[index]), renderEssay(title, pages[index], linkFor));
    } catch (error) {
      throw new Error(`${files[index]} (${title}): ${error.message}`);
    }
  }

  const summary = ["# Summary", "", `* [${ROOT}](README.md)`];
  let index = 0;
  for (const group of groups) {
    if (group.heading) summary.push("", `## ${group.heading}`, "");
    for (const title of group.titles) summary.push(`* [${title}](./things/${files[index++]})`);
  }
  await writeFile(join(BOOK_DIR, "SUMMARY.md"), `${summary.join("\n")}\n`);

  console.log(`Imported ${titles.length} essays.`);
}
