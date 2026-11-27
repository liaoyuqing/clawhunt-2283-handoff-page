/** 时间与文本格式化，纯函数。 */

/**
 * 把 ISO 时间格式化成气泡上的 MM-DD HH:mm（东八区）。
 * 不用 Intl：小程序基础库对 timeZone 支持不一致，这里按固定 +8 偏移算。
 */
export function formatMessageTime(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return '';
  }
  const shifted = new Date(ms + 8 * 3600 * 1000);
  const pad = (n: number): string => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())} ${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}

/** 步骤条与列表里用到的「未关闭」计数 */
export function countUnclosed(statuses: readonly string[]): number {
  return statuses.filter((status) => status !== 'closed').length;
}

/** 按状态分组，保持 queued / in_progress / replied / closed 的固定顺序 */
export function groupByStatus<T extends { status: string }>(
  tickets: readonly T[],
  order: readonly string[],
): Array<{ status: string; items: T[] }> {
  return order
    .map((status) => ({ status, items: tickets.filter((ticket) => ticket.status === status) }))
    .filter((group) => group.items.length > 0);
}

