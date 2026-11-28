import { describe, expect, it } from 'vitest';
import {
  SOURCE_LABEL,
  normalizeFaqEntry,
  resolveFaqEntry,
  resolveSource,
  resolveSourceFromQuery,
  shouldRenderSource,
  sourceFromOptions,
  sourceLabel,
  sourceText,
} from '../miniprogram/utils/source';

const lookup = (faqId: string): string | null =>
  faqId === 'FAQ-1012' ? '工位空调出风小如何报修' : null;

describe('AC2 从 FAQ 详情进入时来源被带入并显示', () => {
  it('source=faq 时标签为「来自：常见问题」', () => {
    const source = resolveSourceFromQuery({ source: 'faq' });
    expect(source).toBe('faq');
    expect(sourceLabel(source)).toBe('来自：常见问题');
    expect(sourceText(source)).toBe('常见问题');
    expect(shouldRenderSource(source)).toBe(true);
  });

  it('source=butler 时标签为「来自：管家对话」', () => {
    const source = resolveSourceFromQuery({ source: 'butler' });
    expect(source).toBe('butler');
    expect(sourceLabel(source)).toBe('来自：管家对话');
  });

  it('FAQ 入口带上条目标题时显示「来自：FAQ 某条」', () => {
    const options = { source: 'faq', faq_title: '工位空调出风小如何报修' };
    const source = sourceFromOptions(options);
    expect(source).toBe('faq');
    const entry = resolveFaqEntry(options, lookup);
    expect(entry).toBe('工位空调出风小如何报修');
    expect(sourceText(source, entry)).toBe('FAQ 工位空调出风小如何报修');
    expect(sourceLabel(source, entry)).toBe('来自：FAQ 工位空调出风小如何报修');
  });

  it('FAQ 入口只带 faq_id 时按字典查出条目并显示', () => {
    const options = { faq_id: 'FAQ-1012' };
    expect(sourceFromOptions(options)).toBe('faq');
    const entry = resolveFaqEntry(options, lookup);
    expect(entry).toBe('工位空调出风小如何报修');
    expect(sourceLabel('faq', entry)).toBe('来自：FAQ 工位空调出风小如何报修');
  });

  it('取不到条目时退回类别文案「来自：常见问题」且不编造条目', () => {
    expect(resolveFaqEntry({ faq_id: 'FAQ-9999' }, lookup)).toBe('');
    expect(resolveFaqEntry({ faq_id: '  ' }, lookup)).toBe('');
    expect(resolveFaqEntry({ faq_title: '   ' }, lookup)).toBe('');
    expect(sourceLabel('faq', resolveFaqEntry({ faq_id: 'FAQ-9999' }, lookup))).toBe('来自：常见问题');
    expect(sourceText('faq', '')).toBe('常见问题');
  });

  it('条目名清洗：压缩空白并截断到 40 字', () => {
    expect(normalizeFaqEntry('  工位   空调  ')).toBe('工位 空调');
    expect(normalizeFaqEntry(42 as never)).toBe('');
    expect(normalizeFaqEntry('条'.repeat(60))).toHaveLength(40);
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
    expect(sourceLabel('butler')).toContain('管家对话');
  });

  it('从 from 参数进入同样能带入来源（兼容旧入口链接）', () => {
    expect(resolveSourceFromQuery({ from: 'faq' })).toBe('faq');
  });
});
