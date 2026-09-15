// highlight-code 插件：```js / ```python / ```json / ```sql 代码高亮（hljs 按需注册四种语言）
// 老项目 plugin-highlight-code.ts 的 JS 化（逻辑原样）
import { HTML } from "./types.js";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import python from "highlight.js/lib/languages/python";
import json from "highlight.js/lib/languages/json";
import sql from "highlight.js/lib/languages/sql";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("json", json);
hljs.registerLanguage("sql", sql);

const blockHighlightCode = (_, __, lines, pos) => {
  const r1 = lines[pos].match(/^```code\:*(\S*)$/);
  const r2 = lines[pos].match(/^```(python|js|json|sql)$/);
  if (!r1 && !r2) return;

  const language = r1?.[1] || r2?.[1] || "code";
  const startPos = pos;

  let code = "";
  pos++;
  while (pos < lines.length && !lines[pos].match(/^```$/)) {
    code += lines[pos] + "\n";
    pos++;
  }

  const htmlHighlight =
    language === "code" ? hljs.highlightAuto(code).value : hljs.highlight(code, { language }).value;

  return {
    startPos,
    endPos: pos,
    tokens: [{ tType: HTML, content: `<pre class="hljs"><code>${htmlHighlight}</code></pre>` }],
  };
};

export default {
  initContext: [],
  blockRules: [blockHighlightCode],
  inlineRules: [],
};
