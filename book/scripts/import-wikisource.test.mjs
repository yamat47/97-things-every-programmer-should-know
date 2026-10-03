import assert from "node:assert/strict";
import { test } from "node:test";

import { convertBody, convertTable } from "./import-wikisource.mjs";

const noLinks = () => null;

test("脚注を本文の参照と末尾の定義に分ける", () => {
  const markdown = convertBody("本文<ref>注の内容</ref>の続き。", noLinks);
  assert.equal(markdown, "本文[^1]の続き。\n\n[^1]: 注の内容");
});

test("出典つきの Quote テンプレートを引用にする", () => {
  const markdown = convertBody("前\n{{Quote|引用文|発言者}}\n後", noLinks);
  assert.equal(markdown, "前\n\n> 引用文\n>\n> — 発言者\n\n後");
});

test("syntaxhighlight を言語つきのコードブロックにし、中身は変換しない", () => {
  const markdown = convertBody(
    '<syntaxhighlight lang="c">\n#include <stdio.h>\nint a_b = x * y;\n</syntaxhighlight>',
    noLinks,
  );
  assert.equal(markdown, "```c\n#include <stdio.h>\nint a_b = x * y;\n```");
});

test("行頭が空白の行をコードブロックにする", () => {
  const markdown = convertBody("前\n\n rm -rf tmp\n\n後", noLinks);
  assert.equal(markdown, "前\n\n```\nrm -rf tmp\n```\n\n後");
});

test("Code テンプレートと tt をインラインコードにする", () => {
  const markdown = convertBody("{{Code|a_b}} と <tt>x*y</tt>", noLinks);
  assert.equal(markdown, "`a_b` と `x*y`");
});

test("本文中の記号を文字どおりに表示させる", () => {
  const markdown = convertBody("a_b と x*y と <tag>", noLinks);
  assert.equal(markdown, "a\\_b と x\\*y と &lt;tag>");
});

test("太字、斜体、見出し、リストを Markdown にする", () => {
  const markdown = convertBody(
    "== 見出し ==\n'''太字'''と''斜体''\n* 項目\n** 子項目\n# 手順\n:字下げ",
    noLinks,
  );
  assert.equal(
    markdown,
    "## 見出し\n**太字**と*斜体*\n* 項目\n  * 子項目\n1. 手順\n> 字下げ",
  );
});

test("エッセイへのウィキリンクをページへのリンクにし、それ以外は文字だけ残す", () => {
  const linkFor = (target) => (target === "本/エッセイ" ? "./thing-1.md" : null);
  const markdown = convertBody("[[本/エッセイ|表示名]] と [[ほか|別名]]", linkFor);
  assert.equal(markdown, "[表示名](./thing-1.md) と 別名");
});

test("外部リンクを Markdown のリンクにする", () => {
  const markdown = convertBody("[https://example.com/a_b 説明] と [https://example.com/]", noLinks);
  assert.equal(markdown, "[説明](https://example.com/a_b) と <https://example.com/>");
});

test("カテゴリと references タグを落とす", () => {
  const markdown = convertBody("本文\n<references />\n[[Category:分類|よみ]]", noLinks);
  assert.equal(markdown, "本文");
});

test("未対応のテンプレートが残ったら失敗する", () => {
  assert.throws(() => convertBody("{{Unknown|x}}", noLinks), /Unsupported template/);
});

test("wikitable をセル属性なしの Markdown の表にする", () => {
  const table = "{|class=wikitable\n! rowspan=1|名前\n! 値\n|-\n|a\n|<1\n|}";
  assert.equal(convertTable(table), "| 名前 | 値 |\n| --- | --- |\n| a | <1 |");
});
