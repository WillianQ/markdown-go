// TOC 输出测试：结构化 toc + 随机唯一锚点 + 与 html 内锚点一致
import MarkdownGo from "../markdown-go.js";

const md = new MarkdownGo();
const { html, toc } = md.render(
  [
    "@[TOC]",
    "",
    "# 概述",
    "",
    "## 背景",
    "",
    "### 细节",
    "",
    "## 背景", // 重复标题：必须拿到不同的锚点
  ].join("\n"),
);

console.log(JSON.stringify(toc, null, 2));

const checks = [
  ["toc 有 4 项", toc.length === 4],
  ["level 序列 1,2,3,2", toc.map((t) => t.level).join() === "1,2,3,2"],
  ["num 语义（level1 为空）", toc[0].num === "" && toc[1].num === "1" && toc[2].num === "1.1"],
  ["anchor 全部唯一", new Set(toc.map((t) => t.anchor)).size === 4],
  ["anchor 为 8 位", toc.every((t) => t.anchor.length === 8)],
  ["anchor 与 title 解耦", toc.every((t) => !t.anchor.includes(t.title))],
  ["重复标题也各得唯一锚点", toc[1].anchor !== toc[3].anchor],
  [
    "html 里的锚点与 toc 一致",
    toc.every((t) => html.includes(`name="${t.anchor}"`) && html.includes(`href="#${t.anchor}"`)),
  ],
];

let allOk = true;
for (const [name, ok] of checks) {
  console.log(`${ok ? "✔" : "✘"} ${name}`);
  if (!ok) allOk = false;
}
console.log(allOk ? "PASS" : "FAIL");
process.exit(allOk ? 0 : 1);
