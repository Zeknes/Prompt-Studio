/**
 * 尝试将文本解析为 JSON
 * @param text - 要解析的文本
 * @returns 如果成功返回 { isJson: true, data: parsedData }，否则返回 { isJson: false, data: null }
 */
export function tryParseJson(text: string): { isJson: boolean; data: any } {
  try {
    const trimmed = text.trim();
    if (!trimmed) {
      return { isJson: false, data: null };
    }
    // 尝试整个文本作为 JSON 解析
    const data = JSON.parse(trimmed);
    // 确保解析结果是对象或数组（排除纯字符串、数字、布尔值）
    if (data && typeof data === 'object') {
      return { isJson: true, data };
    }
    return { isJson: false, data: null };
  } catch {
    return { isJson: false, data: null };
  }
}

/**
 * 从文本中提取代码块内的 JSON
 * @param text - 要解析的文本
 * @returns 包含 JSON 代码块信息的数组
 */
export function extractJsonBlocks(text: string): Array<{ code: string; data: any; start: number; end: number }> {
  const blocks: Array<{ code: string; data: any; start: number; end: number }> = [];

  // 匹配 ```json 或 ``` 后跟 JSON 内容的代码块
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const code = match[1].trim();
    try {
      const data = JSON.parse(code);
      if (data && typeof data === 'object') {
        blocks.push({
          code,
          data,
          start: match.index,
          end: match.index + match[0].length
        });
      }
    } catch {
      // 忽略无法解析的代码块
    }
  }

  return blocks;
}

/**
 * 检查文本是否包含 JSON 代码块
 */
export function hasJsonBlocks(text: string): boolean {
  return extractJsonBlocks(text).length > 0;
}

/**
 * 将文本中的 JSON 代码块替换为占位符
 * @returns { text: 替换后的文本，blocks: JSON 代码块信息 }
 */
export function replaceJsonBlocks(text: string): { text: string; blocks: Array<{ code: string; data: any; placeholder: string }> } {
  const blocks = extractJsonBlocks(text);
  let result = text;
  const replacedBlocks: Array<{ code: string; data: any; placeholder: string }> = [];

  // 从后向前替换，避免索引偏移问题
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i];
    const placeholder = `__JSON_BLOCK_${i}__`;
    replacedBlocks.unshift({
      code: block.code,
      data: block.data,
      placeholder
    });
    result = result.slice(0, block.start) + placeholder + result.slice(block.end);
  }

  return { text: result, blocks: replacedBlocks };
}
