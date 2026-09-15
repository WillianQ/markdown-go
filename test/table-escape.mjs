import MarkdownGo from "../markdown-go.js";

const md = new MarkdownGo();

const src = [
  "| a | b\\|c | d |",
  "|---|---|---|",
  "| 1 | x \\| y | 3 |",
  "| 2 | 管道\\|竖线 | end |",
].join("\n");

const { html } = md.render(src);
console.log(html);

// 断言：每行仍是 3 列；\| 还原为 |
const ths = (html.match(/<th>/g) || []).length;
const tds = (html.match(/<td>/g) || []).length;
const ok = ths === 3 && tds === 6 && html.includes("b|c") && html.includes("x | y") && html.includes("管道|竖线") && !html.includes("\\|");
console.log(ok ? "PASS" : `FAIL th=${ths} td=${tds}`);
