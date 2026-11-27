import { describe, expect, it } from 'vitest';
import {
  SOURCE_LABEL,
  resolveSource,
  resolveSourceFromQuery,
  shouldRenderSource,
  sourceLabel,
  sourceText,
} from '../miniprogram/utils/source';

describe('AC2 从 FAQ 详情进入时来源被带入并显示', () => {
  it('source=faq 时标签为「来自：常见问题」', () => {
    const source = resolveSourceFromQuery({ source: 'faq' });
    expect(source).toBe('faq');
    expect(sourceLabel(source)).toBe('来自：常见问题');
    expect(sourceText(source)).toBe('常见问题');
    expect(shouldRenderSource(source)).toBe(true);
  });

  it('source=butler 时标签为「来自：礼宾对话」', () => {
    const source = resolveSourceFromQuery({ source: 'butler' });
    expect(source).toBe('butler');
    expect(sourceLabel(source)).toBe('来自：礼宾对话');
  });

  it('不带 source 进入时不渲染来源标签（误显示数为 0）', () => {
    const inputs = [{}, null, undefined, { id: 'H-1001' }];
    for (const options of inputs) {
      const source = resolveSourceFromQuery(options as never);
      expect(source).toBeNull();
      expect(shouldRenderSource(source)).toBe(false);
      expect(sourceLabel(source)).toBe('');
    }
  });

  it('非法取值一律当作没有来源，不产生错配文案', () => {
    const bad = ['FAQ', 'faqs', '', ' ', 'faq,butler', 42, null];
    for (const raw of bad) {
      expect(resolveSource(raw)).toBeNull();
    }
    expect(resolveSourceFromQuery({ source: ['faq'] })).toBe('faq');
  });

  it('两个来源的文案互不相同，不存在串台', () => {
    expect(SOURCE_LABEL.faq).not.toBe(SOURCE_LABEL.butler);
    expect(sourceLabel('faq')).toContain('常见问题');
    expect(sourceLabel('butler')).toContain('礼宾对话');
  });

  it('从 from 参数进入同样能带入来源（兼容旧入口链接）', () => {
    expect(resolveSourceFromQuery({ from: 'faq' })).toBe('faq');
  });
});

