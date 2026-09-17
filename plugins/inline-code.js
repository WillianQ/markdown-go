// inline-code 插件：行内代码 `code`。
// 反引号内容做 HTML 转义后放进 <code>，不参与后续行内解析 ——
// 所以里面的 `**x**` / `$$x$$` / `<button>` 都是字面量，不会变成真标签或公式。
// 优先级最高（最后 use()），保证代码里的装饰符号不被 font-decorate / katex 抢走。
import { HTML, INLINE } from "../types.js";

const escapeHtml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const inlineCode = (_, __, token) => {
  // 第一对反引号；`[^`]+` 保证内容非空且不跨行
  const r = token.content.match(/^(.*?)`([^`]+)`(.*)$/);
  if (!r) return;

  const [, frontPart, code, backPart] = r;
  return [
    { tType: INLINE, content: frontPart },
    { tType: HTML, content: `<code>${escapeHtml(code)}</code>` },
    { tType: INLINE, content: backPart },
  ];
};

export default {
  initContext: [],
  blockRules: [],
  inlineRules: [inlineCode],
};
