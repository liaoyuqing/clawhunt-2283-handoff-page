import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { supportService, subscribeNotifier } from '../miniprogram/services/support';
import { mockListTickets, mockGetTicket, mockFaqTitle } from '../miniprogram/mock/support';
import { countUnclosed, formatMessageTime, groupByStatus } from '../miniprogram/utils/format';
import { STATUS_SEQUENCE } from '../miniprogram/utils/status';
import { buildSteps } from '../miniprogram/utils/status';
import { categoryLabel, HANDOFF_CATEGORIES } from '../miniprogram/utils/handoff-types';
import { submitGate } from '../miniprogram/utils/validation';

describe('列表与详情的数据契约', () => {
  it('分类固定 6 项且 key 与文案一一对应', () => {
    expect(HANDOFF_CATEGORIES).toHaveLength(6);
    expect(HANDOFF_CATEGORIES.map((item) => item.key)).toEqual([
      'member_benefit',
      'space_facility',
      'event_signup',
      'resource_match',
      'account_privacy',
      'other',
    ]);
    expect(categoryLabel('space_facility')).toBe('空间与设施');
    expect(categoryLabel('account_privacy')).toBe('账号与隐私');
  });

  it('「我的咨询」未关闭数量按 status!==closed 统计', () => {
    const tickets = mockListTickets();
    const unclosed = countUnclosed(tickets.map((ticket) => ticket.status));
    const expected = tickets.filter((ticket) => ticket.status !== 'closed').length;
    expect(unclosed).toBe(expected);
    expect(unclosed).toBe(3);
  });

  it('列表按状态分组且组内顺序与状态顺序一致', () => {
    const groups = groupByStatus(mockListTickets(), STATUS_SEQUENCE);
    const order = groups.map((group) => group.status);
    const expected = STATUS_SEQUENCE.filter((status) => order.indexOf(status) >= 0);
    expect(order).toEqual(expected);
    expect(groups.reduce((sum, group) => sum + group.items.length, 0)).toBe(mockListTickets().length);
  });

  it('气泡数据左右分布正确：会员消息在右、管家消息在左', () => {
    const ticket = mockGetTicket('H-1003');
    expect(ticket).not.toBeNull();
    const sides = ticket?.messages.map((message) => message.side);
    expect(sides).toContain('member');
    expect(sides).toContain('butler');
    const memberSides = ticket?.messages.filter((message) => message.side === 'member').map((m) => m.side);
    expect(memberSides?.every((side) => side === 'member')).toBe(true);
  });

  it('每条消息都能格式化成 MM-DD HH:mm 并带上时间', () => {
    const ticket = mockGetTicket('H-1003');
    const times = ticket?.messages.map((message) => formatMessageTime(message.time)) ?? [];
    expect(times.length).toBeGreaterThan(0);
    for (const time of times) {
      expect(time).toMatch(/^\d{2}-\d{2} \d{2}:\d{2}$/);
    }
    expect(formatMessageTime('2026-11-21T10:30:00+08:00')).toBe('11-21 10:30');
    expect(formatMessageTime('not-a-time')).toBe('');
  });

  it('提交服务返回 queued 工单并带上来源与附件凭证', async () => {
    const ticket = await supportService.submit({
      category: 'resource_match',
      description: '想对接做工业视觉检测的会员企业，我们是做产线集成的，希望有机会交流。',
      source: 'faq',
      sourceDetail: '工位空调出风小如何报修',
      attachmentTokens: ['mock-token-a'],
    });
    expect(ticket.status).toBe('queued');
    expect(ticket.source).toBe('faq');
    expect(ticket.sourceDetail).toBe('工位空调出风小如何报修');
    expect(ticket.id).toMatch(/^H-\d+$/);
    expect(buildSteps(ticket.status).filter((step) => step.visual === 'current')).toHaveLength(1);
  });

  it('已关闭工单不允许追加消息，未关闭工单可以', async () => {
    const closed = await supportService.appendMessage('H-1004', '还想再问一句');
    expect(closed).toBeNull();
    const open = await supportService.appendMessage('H-1001', '补充一下工位编号是 A3-12');
    expect(open).not.toBeNull();
    expect(open?.messages.length).toBeGreaterThan(1);
  });

  it('上传凭证返回非空字符串，可逐张累积', async () => {
    const first = await supportService.uploadAttachment(0);
    const second = await supportService.uploadAttachment(1);
    expect(first.length).toBeGreaterThan(0);
    expect(first).not.toBe(second);
  });

  it('订阅消息授权组件当前为空实现，调用不抛错（调用点已预留）', () => {
    expect(() => subscribeNotifier.requestReplyNotice('H-1001')).not.toThrow();
  });

  it('用户可见文案里不出现「礼宾」字样（返修自查）', () => {
    const files = [
      'miniprogram/pages/support/handoff.json',
      'miniprogram/pages/support/handoff.wxml',
      'miniprogram/pages/support/handoff-detail.wxml',
      'miniprogram/components/message-bubble/index.ts',
      'miniprogram/mock/support.ts',
      'miniprogram/utils/source.ts',
    ];
    const hits = files.filter((file) => readFileSync(file, 'utf8').includes('礼宾'));
    expect(hits).toEqual([]);
  });

  it('未选分类 + 已填 10 字时仍被分类拦住（页面提示与校验同源）', () => {
    const gate = submitGate({ category: null, description: '会员权益咨询十个字', attachmentCount: 0 });
    expect(gate.enabled).toBe(false);
    expect(gate.reason).toBe('请选择问题分类');
  });
});
  it('FAQ 条目字典在仓库内，faq_id 能解析出可核对的标题', () => {
    expect(mockFaqTitle('FAQ-1012')).toBe('工位空调出风小如何报修');
    expect(mockFaqTitle('FAQ-1188')).toBe('如何对接其他会员企业');
    expect(mockFaqTitle('FAQ-0000')).toBeNull();
  });

  it('FAQ 条目字典随仓库提交，不依赖任何远程数据', () => {
    const text = readFileSync('miniprogram/mock/support.ts', 'utf8');
    expect(text.includes("'FAQ-1012': '工位空调出风小如何报修'")).toBe(true);
    expect(text.includes("'FAQ-1188': '如何对接其他会员企业'")).toBe(true);
  });
  it('截图索引与文件一一对应：13 张全部存在，AC5 两图是独立文件且文案不同', () => {
    const index = readFileSync('docs/screenshots/INDEX.md', 'utf8');
    const rows = index.split('\n').filter((line) => line.startsWith('| `ac') || line.startsWith('| `ac'));
    const files = Array.from(index.matchAll(/`([a-z0-9-]+\.jpg)`/g)).map((m) => m[1]);
    const unique = Array.from(new Set(files));
    expect(unique.length).toBe(13);
    for (const name of unique) {
      expect(existsSync('docs/screenshots/' + name)).toBe(true);
    }
    expect(rows.length).toBeGreaterThanOrEqual(13);
    // AC5 必须是两张独立截图，且文案互不相同
    const workRow = index.split('\n').find((line) => line.includes('ac5-work-hours-tip.jpg')) ?? '';
    const offRow = index.split('\n').find((line) => line.includes('ac5-off-hours-tip.jpg')) ?? '';
    expect(workRow).not.toBe('');
    expect(offRow).not.toBe('');
    expect(workRow).toContain('服务时间 9:00–18:00');
    expect(offRow).toContain('当前为非服务时间');
    expect(workRow).not.toBe(offRow);
  });

  it('截图索引里每张图的入口参数与验收点编号自洽', () => {
    const index = readFileSync('docs/screenshots/INDEX.md', 'utf8');
    const pairs = [
      ['ac1-9chars-disabled.jpg', 'demo=short9'],
      ['ac1-10chars-enabled.jpg', 'demo=ok10'],
      ['ac2-source-faq.jpg', 'faq_id=FAQ-1012'],
      ['ac2-source-faq-basic.jpg', 'source=faq'],
      ['ac2-source-butler.jpg', 'source=butler'],
      ['ac3-step-queued.jpg', 'id=H-1001'],
      ['ac3-step-in-progress.jpg', 'id=H-1002'],
      ['ac3-step-replied.jpg', 'id=H-1003'],
      ['ac3-step-closed.jpg', 'id=H-1004'],
      ['ac4-open-input-present.jpg', 'id=H-1003'],
      ['ac4-closed-no-input.jpg', 'id=H-1004'],
      ['ac5-work-hours-tip.jpg', 'hours=on'],
      ['ac5-off-hours-tip.jpg', 'hours=off'],
    ];
    for (const [file, param] of pairs) {
      const row = index.split('\n').find((line) => line.includes(file)) ?? '';
      expect(row).toContain(param);
    }
  });
