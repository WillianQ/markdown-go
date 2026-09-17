// 代码围栏测试：echarts 优先 → 4 种语言高亮 → 其余 ```xxx 当代码（转义）→ 裸 ``` 当文字
globalThis.document = { getElementById: () => null }; // echarts 的 setTimeout 在 node 下需要 document
import MarkdownGo from "../markdown-go.js";

const md = new MarkdownGo();
const r = (s) => md.render(s).html;

const checks = [
  // 兜底代码：任何带语言的围栏都要转义，不能变成真 HTML
  ["jsx 内容被转义", r("```jsx\n<Input.TextArea />\n```").includes("&lt;Input.TextArea /&gt;")],
  ["jsx 不产出真标签", !r("```jsx\n<Input.TextArea />\n```").includes("<Input.TextArea")],
  ["html 围栏被转义", r("```html\n<b>hi</b>\n```").includes("&lt;b&gt;hi&lt;/b&gt;")],
  ["无语言已废弃（裸 ``` 当文字）", r("```").includes("<p>```</p>")],
  ["裸 ``` 不再吞后续内容", r("前\n```\n后").includes("<p>后</p>")],

  // ```code / ```code:xx 已废弃：降级为普通代码，不再高亮、不报错
  ["```code 不再特殊处理", !r("```code\nconst a = 1;\n```").includes("hljs-keyword")],
  ["```code 仍被转义", r("```code\n<script>\n```").includes("&lt;script&gt;")],
  ["```code:js 不再特殊处理", !r("```code:js\nconst a = 1;\n```").includes("hljs-keyword")],
  ["废弃语法不报错", !r("```code:foo\nx\n```").includes("Block 渲染错误")],

  // 已注册语言仍高亮
  ["js 仍高亮", r("```js\nconst a = 1;\n```").includes("hljs-keyword")],
  ["python 仍高亮", r("```python\ndef f(): pass\n```").includes("hljs-keyword")],

  // echarts 优先级最高
  ["echarts 优先于代码兜底", r("```echarts\n----\n|t|x|\n|-|-|\n|1|2|\n----\n\"title\":{\"text\":\"t\"}\n```").includes("echarts-")],

  // & 先转义，避免二次转义
  ["& 先转义", r("```jsx\na & b < c\n```").includes("a &amp; b &lt; c")],
];

let allOk = true;
for (const [name, ok] of checks) {
  console.log(`${ok ? "✔" : "✘"} ${name}`);
  if (!ok) allOk = false;
}
console.log(allOk ? "PASS" : "FAIL");
process.exit(allOk ? 0 : 1);
