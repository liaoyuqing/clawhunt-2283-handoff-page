/**
 * 来源带入：从 FAQ 详情或管家对话跳到转人工页时，入口参数里带 source=faq / source=butler，
 * FAQ 入口额外带 faq_id 或 faq_title，用来显示具体是哪一条问答（订单要求「来自：FAQ 某条 / 管家对话」）。
 * 页面把 query 交给 resolveSourceFromQuery + resolveFaqEntry，再按下文渲染顶部标签；不依赖 wx。
 */
import type { HandoffSource } from './handoff-types';

export const SOURCE_LABEL: Record<HandoffSource, string> = {
  faq: '来自：常见问题',
  butler: '来自：管家对话',
};

export const SOURCE_TEXT: Record<HandoffSource, string> = {
  faq: '常见问题',
  butler: '管家对话',
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
 * FAQ 条目标题清洗：去首尾空白、把连续空白压成一个空格、限制 40 个字。
 * 清洗后为空就当作「取不到条目」，由调用方退回类别文案。
 */
export function normalizeFaqEntry(raw: unknown): string {
  if (typeof raw !== 'string') {
    return '';
  }
  const text = raw.replace(/\s+/g, ' ').trim();
  return text.length > 40 ? text.slice(0, 40) : text;
}

/** faq_id → 条目标题 的查表函数；接后端时换成接口返回的字典即可 */
export type FaqLookup = (faqId: string) => string | null;

/**
 * 从入口参数里取 FAQ 条目：faq_title 直接用，faq_id 走查表。
 * 两者都没有、或查不到时返回空串（不编造条目名）。
 */
export function resolveFaqEntry(options: Record<string, unknown> | null | undefined, lookup: FaqLookup): string {
  if (!options) {
    return '';
  }
  const title = normalizeFaqEntry(options.faq_title);
  if (title) {
    return title;
  }
  const rawId = options.faq_id;
  const faqId = typeof rawId === 'string' ? rawId.trim() : '';
  if (!faqId) {
    return '';
  }
  return normalizeFaqEntry(lookup(faqId));
}

/** 带了 FAQ 条目参数（faq_title / faq_id）就等于从 FAQ 详情进入，来源即 faq */
export function sourceFromOptions(options: Record<string, unknown> | null | undefined): HandoffSource | null {
  const explicit = resolveSourceFromQuery(options);
  if (explicit) {
    return explicit;
  }
  if (!options) {
    return null;
  }
  const hasTitle = normalizeFaqEntry(options.faq_title) !== '';
  const hasId = typeof options.faq_id === 'string' && options.faq_id.trim() !== '';
  return hasTitle || hasId ? 'faq' : null;
}

/**
 * 来源正文（不含「来自：」前缀）：FAQ 带出「FAQ <条目>」，取不到条目退回「常见问题」；
 * 管家对话固定为「管家对话」。没有来源返回空串。
 */
export function sourceText(source: HandoffSource | null, faqEntry?: string | null): string {
  if (!source) {
    return '';
  }
  if (source === 'butler') {
    return SOURCE_TEXT.butler;
  }
  const entry = normalizeFaqEntry(faqEntry);
  return entry ? `FAQ ${entry}` : SOURCE_TEXT.faq;
}

/**
 * 顶部标签文案：有来源给「来自：…」，没有来源给空串。
 * 页面用 shouldRenderSource 决定节点是否创建（空串时不渲染，避免留白）。
 */
export function sourceLabel(source: HandoffSource | null, faqEntry?: string | null): string {
  const text = sourceText(source, faqEntry);
  return text ? `来自：${text}` : '';
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
