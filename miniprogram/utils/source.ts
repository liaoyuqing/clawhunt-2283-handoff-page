/**
 * 来源带入：从 FAQ 详情或管家对话跳到转人工页时，入口参数里带 source=faq / source=butler。
 * 页面把 query 交给 resolveSource，再按 sourceLabel 渲染顶部标签；不依赖 wx。
 */
import type { HandoffSource } from './handoff-types';

export const SOURCE_LABEL: Record<HandoffSource, string> = {
  faq: '来自：常见问题',
  butler: '来自：礼宾对话',
};

export const SOURCE_TEXT: Record<HandoffSource, string> = {
  faq: '常见问题',
  butler: '礼宾对话',
};

/** 入口参数里只接受这两个值；其它值（拼错、空串、数组、未知来源）一律当作「没有来源」 */
export function resolveSource(raw: unknown): HandoffSource | null {
  if (raw === 'faq') {
    return 'faq';
  }
  if (raw === 'butler') {
    return 'butler';
  }
  return null;
}

/**
 * 顶部标签文案：有来源给「来自：…」，没有来源给空串。
 * 页面用 shouldRenderSource 决定节点是否创建（空串时不渲染，避免留白）。
 */
export function sourceLabel(source: HandoffSource | null): string {
  return source ? SOURCE_LABEL[source] : '';
}

export function sourceText(source: HandoffSource | null): string {
  return source ? SOURCE_TEXT[source] : '';
}

export function shouldRenderSource(source: HandoffSource | null): boolean {
  return source !== null;
}

/** 从页面 onLoad 的 options 里取来源；微信把 query 值统一给成 string */
export function resolveSourceFromQuery(options: Record<string, unknown> | null | undefined): HandoffSource | null {
  if (!options) {
    return null;
  }
  const raw = options.source ?? options.from;
  if (typeof raw === 'string') {
    return resolveSource(raw);
  }
  if (Array.isArray(raw) && typeof raw[0] === 'string') {
    return resolveSource(raw[0]);
  }
  return null;
}

