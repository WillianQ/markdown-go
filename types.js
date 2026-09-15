// MarkdownGo 类型常量与颜色表（老项目 types.ts 的 JS 化：接口/类型注解剥掉，常量保留）
// 原类型语义（供阅读）：
//   Token = { tType: 0|1|2, content: string }         —— tType 0=HTML 1=TEXT 2=INLINE
//   RuleResult = { startPos, endPos, tokens: Token[] }
//   Context = { headingInfo?: [level, titleNum, title][], headingList?: (number|null)[], ... }
//   Plugin = { initContext[], blockRules[], inlineRules[] }
export const HTML = 0;
export const TEXT = 1;
export const INLINE = 2;

// 颜色映射（font-decorate 简写色 / echarts 出错色用）
export const colorMap = {
  b: "#5470c6",
  l: "#91cc75",
  y: "#fac858",
  r: "#ee6666",
  c: "#73c0de",
  g: "#3ba272",
  o: "#fc8452",
  p: "#9a60b4",
};
