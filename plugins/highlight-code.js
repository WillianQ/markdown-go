// highlight-code 插件：```xxx 代码高亮。
// 不写死语言名：除 ```echarts（由 echarts 插件以更高优先级处理）外，
// 任何 ```xxx 都交给 hljs —— 名字已知就按名字高亮，名字未知就 highlightAuto 自动评估。
// 无语言的 ``` 围栏同样当代码；只有落单的裸 ```（没有配对的结束符）才交给 base-parse 当文字。
import { HTML } from "../types.js";
// common 内置 ~35 种常用语言（含 html/xml、typescript、go、rust、bash、css…）。
// 想要全部 386 种：改成 import hljs from "highlight.js"；
// 想回到最小体积：改成 highlight.js/lib/core + 按需 registerLanguage。
import hljs from "highlight.js/lib/common";

const blockHighlightCode = (_, __, lines, pos) => {
  const r = lines[pos].match(/^```(\S*)$/);
  if (!r) return;

  const language = r[1];
  const startPos = pos;

  let code = "";
  pos++;
  while (pos < lines.length && !lines[pos].match(/^```$/)) {
    // 无语言围栏：扫描中遇到另一个围栏开始（如 ```echarts / ```js）说明当前 ``` 不是围栏，
    // 只是普通文字；否则会把后面整段（含后续代码块）都吞进代码块。
    if (!language && lines[pos].match(/^```\S+$/)) return;
    code += lines[pos] + "\n";
    pos++;
  }

  // 无语言的裸 ``` 必须有配对的结束 ```，否则当普通文字（交给 blockParagraph）。
  if (!language && pos >= lines.length) return;

  // 名字已知（含别名，如 jsx→javascript、py→python）→ 按名字高亮；
  // 名字未知 → highlightAuto 从内容自动评估。
  const htmlHighlight = hljs.getLanguage(language)
    ? hljs.highlight(code, { language, ignoreIllegals: true }).value
    : hljs.highlightAuto(code).value;

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
