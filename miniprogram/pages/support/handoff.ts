import { supportService, subscribeNotifier } from '../../services/support';
import { HANDOFF_CATEGORIES } from '../../utils/handoff-types';
import type { HandoffAttachment, HandoffSource, HandoffStatus, HandoffTicket } from '../../utils/handoff-types';
import { countUnclosed, groupByStatus } from '../../utils/format';
import { ATTACHMENT_MAX, ATTACHMENT_MAX_TIP, checkDescription, submitGate } from '../../utils/validation';
import { resolveSourceFromQuery, sourceLabel } from '../../utils/source';
import { STATUS_LABEL, STATUS_SEQUENCE, workHoursTip } from '../../utils/status';
import { resolveCategoryParam, resolveDemoParam, resolveWorkHoursParam } from '../../utils/query';
import { MOCK_IN_WORK_HOURS } from '../../mock/support';

interface TicketGroup {
  status: HandoffStatus;
  label: string;
  items: Array<HandoffTicket & { statusLabel: string }>;
}

interface PageData {
  inWorkHours: boolean;
  workTip: string;
  source: HandoffSource | null;
  sourceLabel: string;
  showSource: boolean;
  categories: Array<{ key: string; label: string }>;
  category: string;
  description: string;
  descLength: number;
  descTip: string;
  tipVisible: boolean;
  attachments: HandoffAttachment[];
  attachmentMax: number;
  attachmentTip: string;
  attachmentTipVisible: boolean;
  submitEnabled: boolean;
  submitReason: string;
  showList: boolean;
  unclosedCount: number;
  groups: TicketGroup[];
  submitting: boolean;
}

Page<PageData, WechatMiniprogram.Page.CustomOption>({
  data: {
    inWorkHours: MOCK_IN_WORK_HOURS,
    workTip: workHoursTip(MOCK_IN_WORK_HOURS).text,
    source: null,
    sourceLabel: '',
    showSource: false,
    categories: HANDOFF_CATEGORIES.map((item) => ({ key: item.key as string, label: item.label })),
    category: '',
    description: '',
    descLength: 0,
    descTip: '',
    tipVisible: false,
    attachments: [],
    attachmentMax: ATTACHMENT_MAX,
    attachmentTip: ATTACHMENT_MAX_TIP,
    attachmentTipVisible: false,
    submitEnabled: false,
    submitReason: '请选择问题分类',
    showList: false,
    unclosedCount: 0,
    groups: [],
    submitting: false,
  },

  onLoad(options: Record<string, unknown>) {
    const source = resolveSourceFromQuery(options);
    const inWorkHours = resolveWorkHoursParam(options, MOCK_IN_WORK_HOURS);
    this.setData({
      source,
      sourceLabel: sourceLabel(source),
      showSource: source !== null,
      inWorkHours,
      workTip: workHoursTip(inWorkHours).text,
    });
    this.loadTickets();
    // 演示与截图取证的预填（demo=short9 / demo=ok10）；预填值同样走 10–500 字校验
    const demo = resolveDemoParam(options);
    if (demo) {
      this.setData({ category: demo.category, description: demo.description });
      this.refreshGate();
    } else {
      const presetCategory = resolveCategoryParam(options);
      if (presetCategory) {
        this.setData({ category: presetCategory });
        this.refreshGate();
      }
    }
  },

  loadTickets() {
    supportService.listTickets().then((tickets) => {
      const groups: TicketGroup[] = groupByStatus(tickets, STATUS_SEQUENCE).map((group) => ({
        status: group.status as HandoffStatus,
        label: STATUS_LABEL[group.status as HandoffStatus],
        items: group.items.map((ticket) => ({
          ...ticket,
          statusLabel: STATUS_LABEL[ticket.status],
        })),
      }));
      this.setData({
        unclosedCount: countUnclosed(tickets.map((ticket) => ticket.status)),
        groups,
      });
    });
  },

  toggleList() {
    this.setData({ showList: !this.data.showList });
  },

  onCategoryChange(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({ category: event.detail.value });
    this.refreshGate();
  },

  onDescriptionInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({ description: event.detail.value });
    this.refreshGate();
  },

  refreshGate() {
    const check = checkDescription(this.data.description);
    const gate = submitGate({
      category: (this.data.category || null) as never,
      description: this.data.description,
      attachmentCount: this.data.attachments.length,
    });
    this.setData({
      descLength: check.length,
      descTip: check.tip || '',
      tipVisible: check.tip !== null,
      submitEnabled: gate.enabled,
      submitReason: gate.reason || '',
      attachmentTipVisible: this.data.attachments.length >= ATTACHMENT_MAX,
    });
  },

  onChooseMedia() {
    const remain = ATTACHMENT_MAX - this.data.attachments.length;
    if (remain <= 0) {
      this.setData({ attachmentTipVisible: true });
      return;
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const picked = res.tempFiles.map((file, index) => ({
          path: file.tempFilePath,
          token: '',
          sizeBytes: file.size,
          index,
        }));
        this.uploadPicked(picked);
      },
      fail: () => {
        // 用户取消选图时不做任何提示，避免打扰
      },
    });
  },

  uploadPicked(picked: Array<HandoffAttachment & { index: number }>) {
    Promise.all(
      picked.map((item) =>
        supportService.uploadAttachment(item.index).then((token) => ({
          path: item.path,
          token,
          sizeBytes: item.sizeBytes,
        })),
      ),
    ).then((uploaded) => {
      this.setData({
        attachments: this.data.attachments.concat(uploaded).slice(0, ATTACHMENT_MAX),
      });
      this.refreshGate();
    });
  },

  onRemoveAttachment(event: WechatMiniprogram.BaseEvent) {
    const index = Number(event.currentTarget.dataset.index);
    const next = this.data.attachments.filter((_, i) => i !== index);
    this.setData({ attachments: next });
    this.refreshGate();
  },

  onSubmit() {
    const gate = submitGate({
      category: (this.data.category || null) as never,
      description: this.data.description,
      attachmentCount: this.data.attachments.length,
    });
    if (!gate.enabled) {
      wx.showToast({ title: gate.reason || '请完善信息', icon: 'none' });
      return;
    }
    if (this.data.submitting) {
      return;
    }
    this.setData({ submitting: true });
    supportService
      .submit({
        category: this.data.category as never,
        description: this.data.description,
        source: this.data.source,
        attachmentTokens: this.data.attachments.map((item) => item.token),
      })
      .then((ticket) => {
        // 订阅消息授权组件由另一工单实现，这里只保留调用点
        subscribeNotifier.requestReplyNotice(ticket.id);
        wx.navigateTo({ url: `/pages/support/handoff-detail?id=${ticket.id}` });
        this.setData({ submitting: false });
      });
  },

  openDetail(event: WechatMiniprogram.BaseEvent) {
    const id = String(event.currentTarget.dataset.id || '');
    wx.navigateTo({ url: `/pages/support/handoff-detail?id=${id}` });
  },
});
