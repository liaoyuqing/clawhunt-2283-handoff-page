/**
 * 提交页的字段校验，全部是纯函数：不依赖 wx，也不发请求。
 * 页面只负责把用户输入喂进来、把返回值渲染出去；单元测试直接在 node 里调用。
 */
import type { HandoffCategory } from './handoff-types';

/** 描述长度下限（含），低于它不能提交 */
export const DESCRIPTION_MIN = 10;
/** 描述长度上限（含），超过它不能提交 */
export const DESCRIPTION_MAX = 500;
/** 截图数量上限 */
export const ATTACHMENT_MAX = 3;

export const DESCRIPTION_MIN_TIP = '请至少填写 10 个字，便于我们准确理解您的问题';
export const DESCRIPTION_MAX_TIP = '最多 500 字，请精简后再提交';
export const CATEGORY_REQUIRED_TIP = '请选择问题分类';
export const ATTACHMENT_MAX_TIP = '最多上传 3 张截图';

export interface DescriptionCheck {
  /** 去掉首尾空白后的字符数，中文按 1 个字计 */
  length: number;
  /** 是否达到下限 */
  enough: boolean;
  /** 是否超出上限 */
  tooLong: boolean;
  /** 需要展示在输入框下方的提示；无提示时为 null */
  tip: string | null;
}

/** 按 Unicode 码点计数，避免 emoji 被算成 2 个字 */
export function countChars(text: string): number {
  return Array.from(text.trim()).length;
}

export function checkDescription(text: string): DescriptionCheck {
  const length = countChars(text);
  const tooLong = length > DESCRIPTION_MAX;
  const enough = length >= DESCRIPTION_MIN && !tooLong;
  let tip: string | null = null;
  if (tooLong) {
    tip = DESCRIPTION_MAX_TIP;
  } else if (length > 0 && !enough) {
    tip = DESCRIPTION_MIN_TIP;
  }
  return { length, enough, tooLong, tip };
}

export interface SubmitGateInput {
  category: HandoffCategory | null;
  description: string;
  attachmentCount: number;
}

export interface SubmitGate {
  /** 提交按钮是否可用 */
  enabled: boolean;
  /** 阻止提交的原因，按优先级只给第一条；可提交时为 null */
  reason: string | null;
}

/**
 * 提交闸门：分类未选、描述不足 10 字、描述超 500 字、截图超 3 张，任一命中就禁用提交。
 * 顺序固定为分类 → 长度 → 截图，页面与测试共用同一判定。
 */
export function submitGate(input: SubmitGateInput): SubmitGate {
  if (!input.category) {
    return { enabled: false, reason: CATEGORY_REQUIRED_TIP };
  }
  const check = checkDescription(input.description);
  if (check.tooLong) {
    return { enabled: false, reason: DESCRIPTION_MAX_TIP };
  }
  if (!check.enough) {
    return { enabled: false, reason: DESCRIPTION_MIN_TIP };
  }
  if (input.attachmentCount > ATTACHMENT_MAX) {
    return { enabled: false, reason: ATTACHMENT_MAX_TIP };
  }
  return { enabled: true, reason: null };
}

/**
 * 点击提交时统一走这里：返回 ok=false 表示必须拦住请求，页面据此提示且不调用服务层。
 * 测试用注入的 request 计数验证「禁用时不发请求」。
 */
export function submitOrBlock<T>(
  input: SubmitGateInput,
  send: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; reason: string }> {
  const gate = submitGate(input);
  if (!gate.enabled) {
    return Promise.resolve({ ok: false as const, reason: gate.reason ?? DESCRIPTION_MIN_TIP });
  }
  return send().then((value) => ({ ok: true as const, value }));
}

