// font-decorate 插件：**粗** ==标黄== ~~删除~~ ++下划++；以及 [text]{* 粗 = 黄 ~ 删 + 下划线 颜色 字号px} 富装饰
// 老项目 plugin-font-decorate.ts 的 JS 化（satisfies Plugin 剥掉，逻辑原样）
import { HTML, INLINE, colorMap } from "../types.js";

const htmlControl = { "**": "b", "==": "mark", "~~": "s", "++": "u" };

const inlineFontDecorate = (_, __, token) => {
  const r = token.content.match(/^(.*?)([=|*|+|~]{2})(.*?)\2(.*)$/);
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

const inlineFontDecorate2 = (_, __, token) => {
  const r = token.content.match(/^(.*?)\[([^\[]*?)\]\{(.*?)\}(.*)$/);
  if (!r) return;
  const [, frontPart, midPart, option, backPart] = r;

  let style = "";
  if (option.includes("*")) style += "font-weight: bold;";
  if (option.includes("=")) style += "background: yellow;";
  if (option.includes("~")) style += "text-decoration: line-through;";
  if (option.includes("+")) style += "text-decoration: underline;";

  const rColor = option.match(/([a-z]+)/);
  if (rColor) {
    const color = rColor[1].length > 1 ? rColor[1] : colorMap[rColor[1]];
    style += `color: ${color};`;
  }

  const rSize = option.match(/(\d+)/);
  if (rSize) style += `font-size: ${rSize[1]}px;`;

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
