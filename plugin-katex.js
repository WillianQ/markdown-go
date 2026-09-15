// katex 插件：行内公式 $$...$$（KaTeX 渲染，出错红色提示）
// 老项目 plugin-katex.ts 的 JS 化（逻辑原样）
import { HTML, INLINE } from "./types.js";
import katex from "katex";
// 注：katex.min.css 由使用方注入（本包保持纯解析，node 可直接 require 引擎）
// 使用方（如 web 的 MarkdownRenderer）：import "katex/dist/katex.min.css"

const inlineKatex = (_, __, token) => {
  const m = token.content.match(/(.*?)\$\$(.*?)\$\$(.*)/);
  if (!m) return;

  const [, frontPart, tex, backPart] = m;
  try {
    const html = katex.renderToString(tex, { displayMode: false, throwOnError: false });
    return [
      { tType: INLINE, content: frontPart },
      { tType: HTML, content: `<span class="katex-inline">${html}</span>` },
      { tType: INLINE, content: backPart },
    ];
  } catch (e) {
    return [
      { tType: INLINE, content: frontPart },
      { tType: HTML, content: `<span style="color:red">KaTeX 错误</span>` },
      { tType: INLINE, content: backPart },
    ];
  }
};

export default {
  initContext: [],
  blockRules: [],
  inlineRules: [inlineKatex],
};
