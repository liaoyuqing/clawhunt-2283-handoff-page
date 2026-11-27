import { describe, expect, it } from 'vitest';
import {
  CLOSED_TIP,
  STATUS_SEQUENCE,
  buildSteps,
  canAppendMessage,
  closedView,
  highlightedCount,
  scanContacts,
  statusIndex,
  workHoursTip,
} from '../miniprogram/utils/status';
import { formatMessageTime } from '../miniprogram/utils/format';
import { mockGetTicketByStatus } from '../miniprogram/mock/support';

describe('AC3 4 种状态的步骤条', () => {
  it('四段齐全且顺序固定为 排队中 → 处理中 → 已回复 → 已关闭', () => {
    const steps = buildSteps('queued');
    expect(steps).toHaveLength(4);
    expect(steps.map((step) => step.label)).toEqual(['排队中', '处理中', '已回复', '已关闭']);
    expect(STATUS_SEQUENCE).toHaveLength(4);
  });

  it('每种状态都恰好只有一段高亮', () => {
    for (const status of STATUS_SEQUENCE) {
      const steps = buildSteps(status);
      expect(highlightedCount(steps)).toBe(1);
    }
  });

  it('当前段的视觉态与该状态一致，之前的段为已完成，之后的段为未到达', () => {
    const cases = ['queued', 'in_progress', 'replied', 'closed'] as const;
    cases.forEach((status, expectedIndex) => {
      const steps = buildSteps(status);
      const current = steps.filter((step) => step.visual === 'current');
      expect(current).toHaveLength(1);
      expect(current[0].status).toBe(status);
      expect(steps.indexOf(current[0])).toBe(expectedIndex);
      expect(steps.slice(0, expectedIndex).every((step) => step.visual === 'done')).toBe(true);
      expect(steps.slice(expectedIndex + 1).every((step) => step.visual === 'todo')).toBe(true);
    });
  });

  it('已完成段与未到达段的视觉态不同（不能同色）', () => {
    const steps = buildSteps('in_progress');
    const done = steps.filter((step) => step.visual === 'done');
    const todo = steps.filter((step) => step.visual === 'todo');
    expect(done.length).toBeGreaterThan(0);
    expect(todo.length).toBeGreaterThan(0);
    expect(done[0].visual).not.toBe(todo[0].visual);
  });

  it('mock 数据覆盖全部 4 种状态，可各取一张截图', () => {
    const seen = new Set<string>();
    for (const status of STATUS_SEQUENCE) {
      const ticket = mockGetTicketByStatus(status);
      expect(ticket).not.toBeNull();
      expect(ticket?.status).toBe(status);
      seen.add(status);
    }
    expect(seen.size).toBe(4);
  });

  it('statusIndex 对未知状态回退到第一段，保证高亮唯一', () => {
    expect(statusIndex('queued')).toBe(0);
    expect(statusIndex('closed')).toBe(3);
    expect(statusIndex('unknown' as never)).toBe(0);
  });
});

describe('AC4 closed 状态隐藏输入框并显示结束提示', () => {
  it('closed 时输入框不渲染、结束提示出现', () => {
    const view = closedView('closed');
    expect(view.showInput).toBe(false);
    expect(view.showClosedTip).toBe(true);
    expect(view.closedTip).toBe(CLOSED_TIP);
    expect(view.closedTip).toContain('本次服务已结束');
  });

  it('另外 3 种状态都渲染输入框且不显示结束提示', () => {
    let withInput = 0;
    for (const status of ['queued', 'in_progress', 'replied'] as const) {
      const view = closedView(status);
      expect(view.showInput).toBe(true);
      expect(view.showClosedTip).toBe(false);
      expect(canAppendMessage(status)).toBe(true);
      withInput += 1;
    }
    expect(withInput).toBe(3);
    expect(canAppendMessage('closed')).toBe(false);
  });

  it('关闭态页面出现的文案里联系方式命中数为 0', () => {
    const texts = [CLOSED_TIP, closedView('closed').closedTip, formatMessageTime('2026-11-19T10:10:00+08:00')];
    const hits = texts.reduce((sum, text) => sum + scanContacts(text).length, 0);
    expect(hits).toBe(0);
  });
});

describe('AC5 工作时间与非工作时间提示文案', () => {
  it('工作时间内与非工作时间文案不同且都能拿到', () => {
    const on = workHoursTip(true);
    const off = workHoursTip(false);
    expect(on.inWorkHours).toBe(true);
    expect(off.inWorkHours).toBe(false);
    expect(on.text).not.toBe(off.text);
    expect(on.text).toContain('服务时间');
    expect(off.text).toContain('非服务时间');
  });

  it('服务时段取自可配置项，改配置文案跟着变', () => {
    const custom = workHoursTip(true, { startHour: 8, endHour: 20, includesHolidays: true });
    expect(custom.text).toContain('8:00–20:00');
    expect(custom.text).toContain('含法定节假日');
    const off = workHoursTip(false, { startHour: 8, endHour: 20, includesHolidays: false });
    expect(off.text).toContain('次日 8:00');
  });
});

describe('联系方式扫描器本身可用（用于 AC4 的命中数为 0 断言）', () => {
  it('能识别手机号、座机、邮箱、微信号与 QQ 号', () => {
    expect(scanContacts('联系 13800138000').length).toBe(1);
    expect(scanContacts('电话 010-88886666').length).toBe(1);
    expect(scanContacts('邮箱 service@example.com').length).toBe(1);
    expect(scanContacts('微信：space_butler').length).toBe(1);
    expect(scanContacts('QQ: 123456789').length).toBe(1);
  });

  it('普通中文描述不会被误判', () => {
    expect(scanContacts('三楼靠窗的独立工位最近空调出风很小，希望物业看一下。')).toHaveLength(0);
    expect(scanContacts('会议室免费时长本月还能用两次吗')).toHaveLength(0);
  });
});

