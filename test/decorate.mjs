// 装饰测试：行内装饰（成对符号）+ 富装饰（[文字]{…} 的符号/颜色/字号）
import MarkdownGo from "../markdown-go.js";

const md = new MarkdownGo();
const r = (s) => md.render(s).html;

const checks = [
  // 行内装饰：必须成对
  ["**粗** → <b>", r("**粗**").includes("<b>粗</b>")],
  ["==高亮== → <mark>", r("==高亮==").includes("<mark>高亮</mark>")],
  ["~~删~~ → <s>", r("~~删~~").includes("<s>删</s>")],
  ["++斜体++ → <i>", r("++斜体++").includes("<i>斜体</i>")],
  ["__下划线__ → <u>", r("__下划线__").includes("<u>下划线</u>")],
  ["单个符号不触发", !r("++斜体+").includes("<i>")],

  // 富装饰：1 个符号即生效
  ["{*} 加粗", r("[x]{*}").includes("font-weight: bold")],
  ["{=} 高亮", r("[x]{=}").includes("background: yellow")],
  ["{~} 删除", r("[x]{~}").includes("text-decoration: line-through")],
  ["{+} 斜体", r("[x]{+}").includes("font-style: italic")],
  ["{_} 下划线", r("[x]{_}").includes("text-decoration: underline")],
  ["{~_} 删除+下划线组合", r("[x]{~_}").includes("text-decoration: line-through underline")],

  // 颜色
  ["单字母 r → colorMap", r("[x]{r}").includes("color: #ee6666")],
  ["多字母 → CSS 色名", r("[x]{red}").includes("color: red")],
  ["#hex 短", r("[x]{#f00}").includes("color: #f00")],
  ["#hex 长", r("[x]{#123456}").includes("color: #123456")],

  // 字号
  ["数字 → 字号", r("[x]{20}").includes("font-size: 20px")],
  ["#hex 的数字不当字号", !r("[x]{#123456}").includes("font-size")],
  ["符号+颜色+字号 组合", (() => {
    const h = r("[x]{*r 20}");
    return h.includes("font-weight: bold") && h.includes("color: #ee6666") && h.includes("font-size: 20px");
  })()],
  ["顺序无关", r("[x]{20 r *}").includes("font-weight: bold") && r("[x]{20 r *}").includes("color: #ee6666")],
];

let allOk = true;
for (const [name, ok] of checks) {
  console.log(`${ok ? "✔" : "✘"} ${name}`);
  if (!ok) allOk = false;
}
console.log(allOk ? "PASS" : "FAIL");
process.exit(allOk ? 0 : 1);
