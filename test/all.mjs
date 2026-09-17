// 综合测试脚本（唯一）
//   1) 逐项断言内置语法（PASS/FAIL）
//   2) 渲染一份覆盖全部语法的样例
//   3) 输出 test/test.html（浏览器打开看效果）
// 运行：npm test
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import MarkdownGo from "../markdown-go.js";

// echarts 的 setTimeout 需要 document（node 下给个空实现即可）
globalThis.document = { getElementById: () => null };

const __dirname = dirname(fileURLToPath(import.meta.url));
const md = new MarkdownGo();
const r = (s) => md.render(s).html;
// 报告页里插入断言名也要转义（名字里含 <script> 这类字符）
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------------------------------------------------------------------------
// 1. 断言
// ---------------------------------------------------------------------------
const checks = [
  // 标题 / 锚点 / TOC
  ["标题 h1", r("# 标题").includes("<h1>标题</h1>")],
  ["标题随机锚点", /name="[a-z0-9]{8}"/.test(r("# 标题"))],
  ["@[TOC] 展开", r("@[TOC]\n\n# A\n\n## B").includes("<li>")],
  ["toc 结构化输出", (() => {
    const { toc } = md.render("# A\n\n## B");
    return toc.length === 2 && toc[0].level === 1 && toc[0].num === "" && toc[1].num === "1";
  })()],

  // 表格
  ["表格表头/单元格", r("| a | b |\n|---|---|\n| 1 | 2 |").includes("<th>") && r("| a | b |\n|---|---|\n| 1 | 2 |").includes("<td>")],
  ["表格内 \\| 转义", (() => {
    const h = r("| a | b\\|c |\n|---|---|\n| 1 | x |");
    return h.includes("b|c") && !h.includes("\\|");
  })()],

  // 列表
  ["无序列表", r("- a\n- b").includes("<ul><li>a</li><li>b</li></ul>")],
  ["有序列表", r("1. a\n2. b").includes("<ol>")],
  ["嵌套列表", r("- a\n  - b").includes("<ul><li>a</li><ul><li>b</li></ul></ul>")],

  // 引用 / 分隔线 / 注释
  ["引用", r("> q").includes("<blockquote>")],
  ["分隔线", r("---").includes("<hr>")],
  ["HTML 注释被移除", !r("前\n<!-- x -->\n后").includes("<!--")],

  // 行内装饰（成对符号）
  ["加粗 **", r("**粗**").includes("<b>粗</b>")],
  ["高亮 ==", r("==亮==").includes("<mark>亮</mark>")],
  ["删除 ~~", r("~~删~~").includes("<s>删</s>")],
  ["斜体 ++", r("++斜++").includes("<i>斜</i>")],
  ["下划线 __", r("__下__").includes("<u>下</u>")],
  ["单个符号不触发", !r("++斜+").includes("<i>")],

  // 富装饰 [文字]{…}
  ["富装饰 加粗", r("[x]{*}").includes("font-weight: bold")],
  ["富装饰 颜色", r("[x]{r}").includes("color: #ee6666")],
  ["富装饰 字号", r("[x]{20}").includes("font-size: 20px")],
  ["富装饰 组合", (() => {
    const h = r("[x]{*r 20}");
    return h.includes("font-weight") && h.includes("color") && h.includes("font-size");
  })()],

  // 链接 / 站内资源 / 图片
  ["外链", r("[链接](https://e.com)").includes('href="https://e.com"')],
  ["站内资源 $[]()", r("$[文章](42)").includes('href="/article?id=42"')],
  ["图片", r("![图](https://e.com/a.png)").includes("<img")],

  // KaTeX
  ["KaTeX 公式", r("$$E=mc^2$$").includes("katex-inline")],

  // 代码围栏
  ["```js 高亮", r("```js\nconst a = 1;\n```").includes("hljs-keyword")],
  ["```jsx 别名高亮", r("```jsx\nconst a = 1;\n```").includes("hljs-keyword")],
  ["```html 高亮", r("```html\n<b>x</b>\n```").includes("hljs-tag")],
  ["未知语言自动评估", /class="hljs-/.test(r("```foobar\nfunction f(){ return 1; }\n```"))],
  ["裸 ``` 当文字", r("```").includes("<p>```</p>")],
  ["无语言围栏当代码", (() => {
    const h = r("```\nabc\n```");
    return h.includes('<pre class="hljs"><code>') && h.includes("abc") && !h.includes("<p>```</p>");
  })()],
  ["落单 ``` 不吞后续围栏", (() => {
    const h = r("前\n```\n后\n\n```js\nconst a=1;\n```");
    return h.includes("<p>```</p>") && h.includes("hljs-keyword");
  })()],
  ["围栏 <script> 转义", !r("```jsx\n<script>alert(1)</script>\n```").includes("<script>")],
  ["围栏 <img> 转义", !r("```html\n<img src=x onerror=alert(1)>\n```").includes("<img")],

  // 行内代码 + 原文 HTML 转义（原文不能变成真标签）
  ["行内代码", r("`abc`").includes("<code>abc</code>")],
  ["行内代码内不解析装饰", r("`**x**`").includes("<code>**x**</code>")],
  ["行内代码转义 HTML", (() => {
    const h = r("`<button></button>`");
    return h.includes("&lt;button&gt;") && !h.includes("<button>");
  })()],
  ["原文 HTML 转义", (() => {
    const h = r("<button>x</button>");
    return h.includes("&lt;button&gt;") && !h.includes("<button>");
  })()],
  ["加粗内 HTML 转义", !r("**<button></button>**").includes("<button>")],
  ["富装饰内 HTML 转义", !r("[<button></button>]{*}").includes("<button>")],
  ["链接文字 HTML 转义", !r("[<button></button>](https://e.com)").includes("<button>")],
  ["引用续行 HTML 转义", !r("> a\n> <button></button>").includes("<button>")],

  // echarts
  ["echarts 优先", r("```echarts\n----\n|t|x|\n|-|-|\n|1|2|\n----\n\"title\":{\"text\":\"t\"}\n```").includes("echarts-")],
  ["echarts 内嵌表格正常", !r("```echarts\n----\n|t|x|\n|-|-|\n|1|2|\n----\n\"title\":{\"text\":\"t\"}\n```").includes("[object Object]")],
  ["echarts 输出可初始化的 data-echarts", (() => {
    const h = r("```echarts\n----\n|t|x|\n|-|-|\n|1|2|\n----\n\"title\":{\"text\":\"t\"}\n```");
    const m = h.match(/data-echarts="([^"]+)"/);
    if (!m) return false;
    try {
      const opt = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
      return !!opt.dataset && Array.isArray(opt.series);
    } catch {
      return false;
    }
  })()],
];

// ---------------------------------------------------------------------------
// 2. 覆盖全部语法的综合样例
// ---------------------------------------------------------------------------
const sample = [
  "# markdown-go 语法总览",
  "",
  "@[TOC]",
  "",
  "## 行内装饰",
  "",
  "成对符号：**加粗**、==高亮==、~~删除~~、++斜体++、__下划线__。",
  "",
  "富装饰：方括号加大括号，符号只写一次 —— [加粗]{*}、[红字]{r}、[大字]{20}、[组合]{*r 20}。",
  "",
  "行内代码：`abc`、`**不是加粗**`、`<button></button>`（反引号里的内容原样显示）。",
  "",
  "原文 HTML 不能变成真标签：<button>点我</button>、<script>alert(1)</script>。",
  "",
  "## 链接与图片",
  "",
  "外链 [示例站点](https://example.com)，站内文章 $[另一篇文章](42)，图片 ![占位图](https://example.com/a.png)。",
  "",
  "## 表格",
  "",
  "| 名称 | 数量 | 备注 |",
  "|------|------|------|",
  "| 苹果 | 3 | 红 |",
  "| 梨 | 5 | 黄\\|褐 |",
  "",
  "## 列表",
  "",
  "- 无序项 A",
  "- 无序项 B",
  "  - 嵌套项 B1",
  "",
  "1. 有序项一",
  "2. 有序项二",
  "",
  "## 引用",
  "",
  "> 这是一段引用。",
  "> 引用可以有多行。",
  "",
  "## 分隔线",
  "",
  "---",
  "",
  "## 代码围栏",
  "",
  "```js",
  "const a = 1; // 已知语言",
  "```",
  "",
  "```jsx",
  "<Input.TextArea style={{ flex: 1, minWidth: 0 }} />",
  "```",
  "",
  "```html",
  '<div class="box"><b>hi</b> &amp; bye</div>',
  "```",
  "",
  "```mermaid",
  "graph TD;",
  "  A-->B;",
  "```",
  "",
  "未知语言里的 HTML 必须转义：",
  "",
  "```jsx",
  "<script>alert('xss')</script>",
  "<img src=x onerror=alert(1)>",
  "```",
  "",
  "无语言围栏同样是代码块：",
  "",
  "```",
  "plain text, no language",
  "```",
  "",
  "裸三反引号当文字：",
  "",
  "前一行",
  "```",
  "后1行",
  "后2行",
  "",
  "后3行",
  "```",
  "",
  "## KaTeX 公式",
  "",
  "质能方程：$$E = mc^2$$",
  "",
  "## ECharts 图表",
  "",
  "```echarts",
  "----",
  "|月度销量|销量|利润|",
  "|-|-|-|",
  "|1月|120|30|",
  "|2月|200|45|",
  "----",
  '"tooltip":{"trigger":"axis"}',
  "```",
  "",
  "<!-- 这段注释不会显示 -->",
  "",
].join("\n");

const { html } = md.render(sample);

// ---------------------------------------------------------------------------
// 3. 输出 test/test.html
// ---------------------------------------------------------------------------
// 高亮主题（改这一行即可换）：github-dark / atom-one-light / atom-one-dark / nord / monokai / vs2015 …
const THEME = "github-dark";

const passCount = checks.filter(([, ok]) => ok).length;
const checksHtml = checks
  .map(([name, ok]) => `<tr class="${ok ? "ok" : "bad"}"><td>${ok ? "✔" : "✘"}</td><td>${esc(name)}</td></tr>`)
  .join("\n");

const page = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>markdown-go 综合测试</title>
<link rel="stylesheet" href="../node_modules/katex/dist/katex.min.css">
<link rel="stylesheet" href="../node_modules/highlight.js/styles/${THEME}.css">
<style>
body { font-family: -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; color: #24292e; line-height: 1.6; }
.summary { font-size: 1.1rem; font-weight: 600; margin: 1rem 0; }
table.checks { border-collapse: collapse; width: 100%; margin-bottom: 2rem; }
table.checks td { border: 1px solid #d0d7de; padding: 4px 10px; }
tr.ok td:first-child { color: #1a7f37; font-weight: bold; }
tr.bad td:first-child { color: #cf222e; font-weight: bold; }
tr.bad { background: #ffebe9; }
.markdown-body pre { padding: 1em; border-radius: 6px; overflow-x: auto; }
.markdown-body code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 90%; }
.markdown-body table { border-collapse: collapse; }
.markdown-body th, .markdown-body td { border: 1px solid #d0d7de; padding: 4px 10px; }
.markdown-body h1, .markdown-body h2, .markdown-body h3 { border-bottom: 1px solid #eaecef; padding-bottom: .3em; }
hr { margin: 2rem 0; border: 0; border-top: 2px dashed #d0d7de; }
.sample-source { background: #eaf3ff; border: 1px solid #b6d4fe; border-radius: 6px; padding: 1em; white-space: pre-wrap; word-break: break-word; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 90%; line-height: 1.5; }
</style>
</head>
<body>
<h1>markdown-go 综合测试</h1>
<p class="summary">断言结果：${passCount} / ${checks.length} 通过</p>
<table class="checks">
${checksHtml}
</table>
<hr>
<h1>渲染样例</h1>
${html}
<hr>
<h1>样例源码</h1>
<pre class="sample-source">${esc(sample)}</pre>
<script src="https://cdn.jsdelivr.net/npm/echarts@5.6.0/dist/echarts.min.js"></script>
<script>
  document.querySelectorAll("[data-echarts]").forEach(function (el) {
    var chart = echarts.init(el);
    chart.setOption(JSON.parse(el.getAttribute("data-echarts")));
    window.addEventListener("resize", function () { chart.resize(); });
  });
</script>
</body>
</html>
`;

writeFileSync(join(__dirname, "test.html"), page, "utf8");

// ---------------------------------------------------------------------------
// 控制台结果
// ---------------------------------------------------------------------------
let allOk = true;
for (const [name, ok] of checks) {
  console.log(`${ok ? "✔" : "✘"} ${name}`);
  if (!ok) allOk = false;
}
console.log(`\n${allOk ? "PASS" : "FAIL"}  (${passCount}/${checks.length})`);
console.log("已生成 test/test.html");
process.exit(allOk ? 0 : 1);
