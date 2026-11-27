/** 页面 query 参数的解析，纯函数。 */
import type { HandoffCategory, HandoffStatus } from './handoff-types';
import { HANDOFF_CATEGORIES } from './handoff-types';

const STATUSES: readonly HandoffStatus[] = ['queued', 'in_progress', 'replied', 'closed'];

/**
 * 只接受四个合法状态；传 status=in_progress 可直接打开该状态的工单，
 * 演示与取证时用 status=closed 免去记忆工单号。
 */
export function resolveStatusParam(options: Record<string, unknown> | null | undefined): HandoffStatus | null {
  if (!options) {
    return null;
  }
  const raw = options.status;
  if (typeof raw === 'string' && STATUSES.indexOf(raw as HandoffStatus) >= 0) {
    return raw as HandoffStatus;
  }
  return null;
}

/**
 * 工作时间开关的演示参数：hours=on / hours=off。
 * 真实环境该值来自后端（in_work_hours），这里允许入口显式覆盖，只为演示两种提示文案。
 */
export function resolveWorkHoursParam(
  options: Record<string, unknown> | null | undefined,
  fallback: boolean,
): boolean {
  if (!options) {
    return fallback;
  }
  const raw = options.hours;
  if (raw === 'on') {
    return true;
  }
  if (raw === 'off') {
    return false;
  }
  return fallback;
}

export function resolveCategoryParam(
  options: Record<string, unknown> | null | undefined,
): HandoffCategory | null {
  if (!options) {
    return null;
  }
  const raw = options.category;
  if (typeof raw !== 'string') {
    return null;
  }
  const hit = HANDOFF_CATEGORIES.find((item) => item.key === raw);
  return hit ? hit.key : null;
}

/**
 * 演示与取证用的预填参数 demo，取值是两个固定场景，其它值一律忽略：
 *   demo=short9 → 预填 9 字描述（验收 AC1 的「少于 10 字」截图）
 *   demo=ok10   → 预填 10 字描述（同一入口的对照截图）
 * 预填内容与用户手输走同一套校验，不会绕过 10–500 字判定。
 */
export interface DemoPreset {
  category: HandoffCategory;
  description: string;
}

export const DEMO_PRESETS: Record<string, DemoPreset> = {
  short9: { category: 'space_facility', description: '空调出风很小请看看' },
  ok10: { category: 'space_facility', description: '空调出风很小请看看吧' },
};

export function resolveDemoParam(options: Record<string, unknown> | null | undefined): DemoPreset | null {
  if (!options) {
    return null;
  }
  const raw = options.demo;
  if (typeof raw !== 'string') {
    return null;
  }
  return DEMO_PRESETS[raw] ?? null;
}
