// font-decorate 插件：行内装饰（符号成对）+ 富装饰（[文字]{…}）
//
// 符号集（两处统一）：
//   * 加粗   = 高亮   ~ 删除   + 斜体   _ 下划线
// 行内装饰：符号必须成对出现（**粗** / ++斜体++ / __下划线__ …）。
// 富装饰：[]{} 里每个符号只写 1 次即生效；另有 数字=字号(px)、颜色（单字母简写 / CSS 色名 / #hex）。
import { HTML, INLINE, colorMap } from "../types.js";

const htmlControl = {
  "**": "b", // 加粗
  "==": "mark", // 高亮
  "~~": "s", // 删除
  "++": "i", // 斜体
  "__": "u", // 下划线
};

// 行内装饰：**粗** ==高亮== ~~删除~~ ++斜体++ __下划线__（必须成对）
const inlineFontDecorate = (_, __, token) => {
  const r = token.content.match(/^(.*?)(\*\*|==|~~|\+\+|__)(.*?)\2(.*)$/);
  if (!r) return;
  const [, frontPart, decType, midPart, backPart] = r;
  const html = htmlControl[decType];
  return [
    { tType: INLINE, content: frontPart },
    { tType: HTML, content: `<${html}>` },
    { tType: INLINE, content: midPart },
    { tType: HTML, content: `</${html}>` },
    { tType: INLINE, content: backPart },
  ];
};

// 富装饰：[文字]{* = ~ + _ 20 r red #f00}
//   符号 → 样式（1 次即生效）· 数字 → 字号(px) · 颜色 → 单字母简写 / CSS 色名 / #hex
const inlineFontDecorate2 = (_, __, token) => {
  const r = token.content.match(/^(.*?)\[([^\[]*?)\]\{(.*?)\}(.*)$/);
  if (!r) return;
  const [, frontPart, midPart, option, backPart] = r;

  let style = "";

  // 符号 → 字体样式
  if (option.includes("*")) style += "font-weight: bold;";
  if (option.includes("=")) style += "background: yellow;";
  const decos = [];
  if (option.includes("~")) decos.push("line-through");
  if (option.includes("_")) decos.push("underline");
  if (decos.length) style += `text-decoration: ${decos.join(" ")};`;
  if (option.includes("+")) style += "font-style: italic;";

  // 颜色：先挖 #hex（其数字/字母不能被后续误判），再单字母简写 / CSS 色名
  let rest = option;
  let color = null;
  const rHex = rest.match(/#[0-9a-fA-F]+/);
  if (rHex) {
    color = rHex[0];
    rest = rest.replace(rHex[0], " ");
  } else {
    const rAlpha = rest.match(/[a-zA-Z]+/);
    if (rAlpha) {
      const word = rAlpha[0];
      color = word.length === 1 ? colorMap[word.toLowerCase()] ?? null : word;
      rest = rest.replace(word, " ");
    }
  }
  if (color) style += `color: ${color};`;

  // 字号
  const rSize = rest.match(/\d+/);
  if (rSize) style += `font-size: ${rSize[0]}px;`;

  return [
    { tType: INLINE, content: frontPart },
    { tType: HTML, content: `<span style="${style}">${midPart}</span>` },
    { tType: INLINE, content: backPart },
  ];
};

export default {
  initContext: [],
  blockRules: [],
  inlineRules: [inlineFontDecorate, inlineFontDecorate2],
};
