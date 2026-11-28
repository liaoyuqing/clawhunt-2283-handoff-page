import { describe, expect, it, vi } from 'vitest';
import { resolveDemoParam, DEMO_PRESETS } from '../miniprogram/utils/query';
import {
  ATTACHMENT_MAX,
  CATEGORY_REQUIRED_TIP,
  DESCRIPTION_MAX,
  DESCRIPTION_MAX_TIP,
  DESCRIPTION_MIN_TIP,
  checkDescription,
  countChars,
  submitGate,
  submitOrBlock,
} from '../miniprogram/utils/validation';

/** 生成长度为 n 的中文描述；用真实中文避免把「字数」误当成字节数 */
function desc(n: number): string {
  const unit = '会员空间问题描述';
  let out = '';
  while (out.length < n) {
    out += unit;
  }
  return out.slice(0, n);
}

describe('AC1 描述少于 10 字时无法提交并给出提示', () => {
  it('9 个字：不足下限，按钮禁用，给出下限提示', () => {
    const text = desc(9);
    const check = checkDescription(text);
    expect(check.length).toBe(9);
    expect(check.enough).toBe(false);
    expect(check.tip).toBe(DESCRIPTION_MIN_TIP);
    const gate = submitGate({ category: 'member_benefit', description: text, attachmentCount: 0 });
    expect(gate.enabled).toBe(false);
    expect(gate.reason).toBe(DESCRIPTION_MIN_TIP);
  });

  it('10 个字：达到下限，按钮可提交', () => {
    const check = checkDescription(desc(10));
    expect(check.length).toBe(10);
    expect(check.enough).toBe(true);
    expect(check.tip).toBeNull();
    const gate = submitGate({ category: 'member_benefit', description: desc(10), attachmentCount: 0 });
    expect(gate.enabled).toBe(true);
    expect(gate.reason).toBeNull();
  });

  it('500 字可提交、501 字被拦下并提示上限', () => {
    const ok = submitGate({ category: 'member_benefit', description: desc(DESCRIPTION_MAX), attachmentCount: 0 });
    expect(ok.enabled).toBe(true);
    const over = checkDescription(desc(DESCRIPTION_MAX + 1));
    expect(over.tooLong).toBe(true);
    expect(over.tip).toBe(DESCRIPTION_MAX_TIP);
    const blocked = submitGate({ category: 'member_benefit', description: desc(DESCRIPTION_MAX + 1), attachmentCount: 0 });
    expect(blocked.enabled).toBe(false);
    expect(blocked.reason).toBe(DESCRIPTION_MAX_TIP);
  });

  it('未选分类时即使描述够长也不可提交', () => {
    const gate = submitGate({ category: null, description: desc(20), attachmentCount: 0 });
    expect(gate.enabled).toBe(false);
    expect(gate.reason).toBe(CATEGORY_REQUIRED_TIP);
  });

  it('截图超过 3 张时不可提交', () => {
    const gate = submitGate({ category: 'other', description: desc(20), attachmentCount: ATTACHMENT_MAX + 1 });
    expect(gate.enabled).toBe(false);
  });

  it('禁用状态下点击提交不发出任何请求（请求计数为 0）', async () => {
    const send = vi.fn(() => Promise.resolve('sent'));
    const result = await submitOrBlock(
      { category: 'member_benefit', description: desc(9), attachmentCount: 0 },
      send,
    );
    expect(send).toHaveBeenCalledTimes(0);
    expect(result.ok).toBe(false);
    const okResult = await submitOrBlock(
      { category: 'member_benefit', description: desc(10), attachmentCount: 0 },
      send,
    );
    expect(send).toHaveBeenCalledTimes(1);
    expect(okResult.ok).toBe(true);
  });

  it('计数按 Unicode 码点，首尾空白不计入', () => {
    expect(countChars('  会员空间  ')).toBe(4);
    expect(countChars('   abcdefghij   ')).toBe(10);
  });

  it('空描述不给下限提示（避免刚进页面就报错），但提交仍被拦下', () => {
    const check = checkDescription('');
    expect(check.length).toBe(0);
    expect(check.tip).toBeNull();
    expect(submitGate({ category: 'other', description: '', attachmentCount: 0 }).enabled).toBe(false);
  });
});

describe('AC1 截图入口 demo 不绕过 10–500 字校验（同一套函数）', () => {
  it('demo=short9 的预填文本按码点正好 9 字，且被同一套校验判为不可提交', () => {
    const preset = resolveDemoParam({ demo: 'short9' });
    expect(preset).not.toBeNull();
    expect(countChars(preset!.description)).toBe(9);
    const check = checkDescription(preset!.description);
    expect(check.enough).toBe(false);
    expect(check.tip).toBe(DESCRIPTION_MIN_TIP);
    const gate = submitGate({
      category: preset!.category,
      description: preset!.description,
      attachmentCount: 0,
    });
    expect(gate.enabled).toBe(false);
    expect(gate.reason).toBe(DESCRIPTION_MIN_TIP);
  });

  it('demo=ok10 的预填文本正好 10 字，同一套校验判为可提交', () => {
    const preset = resolveDemoParam({ demo: 'ok10' });
    expect(countChars(preset!.description)).toBe(10);
    const gate = submitGate({
      category: preset!.category,
      description: preset!.description,
      attachmentCount: 0,
    });
    expect(gate.enabled).toBe(true);
    expect(gate.reason).toBeNull();
  });

  it('demo 只认两个固定取值，其它值一律忽略（不会造出任意预填状态）', () => {
    expect(Object.keys(DEMO_PRESETS).sort()).toEqual(['ok10', 'short9']);
    const ignored = [{ demo: 'short8' }, { demo: '' }, { demo: 9 }, { demo: null }, {}, null];
    for (const options of ignored) {
      expect(resolveDemoParam(options as never)).toBeNull();
    }
  });

  it('预填文本增删一字即翻转判定，说明走的仍是 10 字下限', () => {
    const nine = DEMO_PRESETS.short9.description;
    const ten = DEMO_PRESETS.ok10.description;
    expect(submitGate({ category: 'space_facility', description: nine, attachmentCount: 0 }).enabled).toBe(false);
    expect(submitGate({ category: 'space_facility', description: ten, attachmentCount: 0 }).enabled).toBe(true);
    expect(submitGate({ category: 'space_facility', description: ten.slice(0, 9), attachmentCount: 0 }).enabled).toBe(false);
  });
});
