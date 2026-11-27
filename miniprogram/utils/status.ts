/**
 * 状态条与关闭态规则，全部纯函数：页面拿到返回值直接渲染，单元测试直接断言。
 */
import type { HandoffStatus } from './handoff-types';

/** 步骤条固定四段，顺序即流程顺序 */
export const STATUS_SEQUENCE: readonly HandoffStatus[] = ['queued', 'in_progress', 'replied', 'closed'] as const;

export const STATUS_LABEL: Record<HandoffStatus, string> = {
  queued: '排队中',
  in_progress: '处理中',
  replied: '已回复',
  closed: '已关闭',
};

/** 每一段在步骤条上的视觉态：done 已完成、current 当前、todo 未到达 */
export type StepVisual = 'done' | 'current' | 'todo';

export interface StepItem {
  status: HandoffStatus;
  label: string;
  visual: StepVisual;
  /** 当前段序号（1 起）；未到达段为 0 */
  order: number;
}

export const CLOSED_TIP = '本次服务已结束，如有新问题请重新提交';

export function statusIndex(status: HandoffStatus): number {
  const index = STATUS_SEQUENCE.indexOf(status);
  return index < 0 ? 0 : index;
}

/**
 * 生成四段步骤条。当前段唯一高亮（visual=current），之前的段 done，之后的段 todo。
 * 若传入未知状态，按第一段处理，保证「当前段恰好 1 个」始终成立。
 */
export function buildSteps(status: HandoffStatus): StepItem[] {
  const current = statusIndex(status);
  return STATUS_SEQUENCE.map((key, index) => ({
    status: key,
    label: STATUS_LABEL[key],
    visual: index === current ? ('current' as const) : index < current ? ('done' as const) : ('todo' as const),
    order: index < current ? index + 1 : 0,
  }));
}

export function highlightedCount(steps: StepItem[]): number {
  return steps.filter((step) => step.visual === 'current').length;
}

/** 关闭态收起输入框：返回 false 时页面不渲染输入框与发送按钮 */
export function canAppendMessage(status: HandoffStatus): boolean {
  return status !== 'closed';
}

export interface ClosedView {
  showInput: boolean;
  showClosedTip: boolean;
  closedTip: string;
}

export function closedView(status: HandoffStatus): ClosedView {
  const closed = status === 'closed';
  return {
    showInput: !closed,
    showClosedTip: closed,
    closedTip: closed ? CLOSED_TIP : '',
  };
}

/**
 * 工作时间提示。in_work_hours 由 mock 常量给出，服务时间口径（是否含法定节假日）作为
 * config.workCalendar 可配置项，接入后端后替换即可。
 */
export interface WorkHoursConfig {
  /** 每日服务时段，左闭右开 */
  startHour: number;
  endHour: number;
  /** 口径说明：是否含法定节假日，默认不含 */
  includesHolidays: boolean;
}

export const DEFAULT_WORK_HOURS: WorkHoursConfig = {
  startHour: 9,
  endHour: 18,
  includesHolidays: false,
};

export interface WorkHoursTip {
  inWorkHours: boolean;
  text: string;
}

export function workHoursTip(inWorkHours: boolean, config: WorkHoursConfig = DEFAULT_WORK_HOURS): WorkHoursTip {
  const span = `${config.startHour}:00–${config.endHour}:00`;
  const holidayNote = config.includesHolidays ? '（含法定节假日）' : '（法定节假日顺延）';
  return {
    inWorkHours,
    text: inWorkHours
      ? `服务时间 ${span}${holidayNote}，提交后将按顺序处理`
      : `当前为非服务时间，提交后将于次日 ${config.startHour}:00 起依次处理`,
  };
}

/**
 * 联系方式扫描：页面不得出现任何员工联系方式。
 * 命中手机号、座机、邮箱、微信号、QQ 号任意一类即计数，验收要求为 0。
 */
export const CONTACT_PATTERNS: readonly RegExp[] = [
  /1[3-9]\d{9}/,
  /\b\d{3,4}-\d{7,8}\b/,
  /[\w.+-]+@[\w-]+\.[\w.-]+/,
  /(微信|weixin|wechat)\s*[:：]?\s*[A-Za-z][\w-]{4,}/i,
  /QQ\s*[:：]?\s*\d{5,}/i,
] as const;

export interface ContactHit {
  pattern: string;
  match: string;
}

export function scanContacts(text: string): ContactHit[] {
  const hits: ContactHit[] = [];
  for (const pattern of CONTACT_PATTERNS) {
    const found = text.match(pattern);
    if (found) {
      hits.push({ pattern: pattern.source, match: found[0] });
    }
  }
  return hits;
}

