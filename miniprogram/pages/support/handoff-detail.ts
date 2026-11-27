import { supportService } from '../../services/support';
import type { HandoffMessage, HandoffStatus, HandoffTicket } from '../../utils/handoff-types';
import { categoryLabel } from '../../utils/handoff-types';
import { formatMessageTime } from '../../utils/format';
import { buildSteps, canAppendMessage, closedView, STATUS_LABEL, statusIndex } from '../../utils/status';
import { sourceText } from '../../utils/source';
import { resolveStatusParam } from '../../utils/query';

interface BubbleView extends HandoffMessage {
  timeText: string;
}

interface PageData {
  id: string;
  loaded: boolean;
  status: HandoffStatus;
  categoryText: string;
  sourceText: string;
  showSource: boolean;
  statusLabel: string;
  /** 步骤条当前段序号（1–4），模板按它渲染高亮 */
  stepIndex: number;
  steps: Array<{ status: string; label: string; visual: string }>;
  bubbles: BubbleView[];
  showInput: boolean;
  showClosedTip: boolean;
  closedTip: string;
  draft: string;
  sending: boolean;
}

Page<PageData, WechatMiniprogram.Page.CustomOption>({
  data: {
    id: '',
    loaded: false,
    status: 'queued',
    categoryText: '',
    sourceText: '',
    showSource: false,
    statusLabel: '',
    stepIndex: 1,
    steps: [],
    bubbles: [],
    showInput: true,
    showClosedTip: false,
    closedTip: '',
    draft: '',
    sending: false,
  },

  onLoad(options: Record<string, unknown>) {
    const id = typeof options.id === 'string' ? options.id : '';
    const statusParam = resolveStatusParam(options);
    const load = id
      ? supportService.getTicket(id)
      : statusParam
        ? supportService.getTicketByStatus(statusParam)
        : supportService.getTicket('H-1001');
    load.then((ticket) => {
      if (!ticket) {
        wx.showToast({ title: '未找到该咨询', icon: 'none' });
        return;
      }
      this.render(ticket);
    });
  },

  render(ticket: HandoffTicket) {
    const view = closedView(ticket.status);
    this.setData({
      id: ticket.id,
      loaded: true,
      status: ticket.status,
      categoryText: categoryLabel(ticket.category),
      sourceText: sourceText(ticket.source),
      showSource: ticket.source !== null,
      statusLabel: STATUS_LABEL[ticket.status],
      stepIndex: statusIndex(ticket.status) + 1,
      steps: buildSteps(ticket.status).map((step) => ({
        status: step.status,
        label: step.label,
        visual: step.visual,
      })),
      bubbles: ticket.messages.map((message) => ({
        ...message,
        timeText: formatMessageTime(message.time),
      })),
      showInput: view.showInput,
      showClosedTip: view.showClosedTip,
      closedTip: view.closedTip,
    });
  },

  onDraftInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({ draft: event.detail.value });
  },

  onSend() {
    if (!canAppendMessage(this.data.status)) {
      return;
    }
    const text = this.data.draft.trim();
    if (!text) {
      wx.showToast({ title: '请先输入内容', icon: 'none' });
      return;
    }
    if (this.data.sending) {
      return;
    }
    this.setData({ sending: true });
    supportService.appendMessage(this.data.id, text).then((ticket) => {
      if (!ticket) {
        wx.showToast({ title: '本次服务已结束', icon: 'none' });
        this.setData({ sending: false });
        return;
      }
      this.setData({ draft: '' });
      this.render(ticket);
      this.setData({ sending: false });
    });
  },
});

