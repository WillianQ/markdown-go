// echarts 内嵌表格测试：rawTable 必须用 md.render(...).html，不能是对象（否则输出 [object Object]）
globalThis.document = { getElementById: () => null }; // echarts 的 setTimeout 在 node 下需要 document
import MarkdownGo from "../markdown-go.js";

const md = new MarkdownGo();
const src = [
  "```echarts",
  "----",
  "|月度销量|销量|利润|",
  "|-|-|-|",
  "|1月|120|30|",
  "|2月|200|45|",
  "----",
  '"tooltip":{"trigger":"axis"}',
  "```",
].join("\n");

const html = md.render(src).html;
console.log(html);

const checks = [
  ["不再出现 [object Object]", !html.includes("[object Object]")],
  ["内嵌表格被真正渲染", html.includes("<table") && html.includes("<th>")],
  ["表头文字存在", html.includes("月度销量")],
  ["图表占位 div 仍在", html.includes("echarts-")],
];

let allOk = true;
for (const [name, ok] of checks) {
  console.log(`${ok ? "✔" : "✘"} ${name}`);
  if (!ok) allOk = false;
}
console.log(allOk ? "PASS" : "FAIL");
process.exit(allOk ? 0 : 1);
