/**
 * 接口桩：转人工相关的全部数据都在这一层内存里，页面只依赖 services/support.ts 的签名。
 * 真实后端接入时替换 services 里的实现即可，页面与纯函数模块不用改。
 * 所有内容为虚构测试数据，不含任何真实个人信息与企业信息。
 */
import type {
  HandoffMessage,
  HandoffStatus,
  HandoffTicket,
  SubmitPayload,
} from '../utils/handoff-types';

/** 服务时间口径的可配置项：默认 9:00–18:00、法定节假日不计入工作时间 */
export const MOCK_IN_WORK_HOURS = true;

const BUTLER_NAME = '礼宾团队';

function message(id: string, side: 'member' | 'butler', text: string, time: string): HandoffMessage {
  return { id, side, text, time };
}

const TICKETS: HandoffTicket[] = [
  {
    id: 'H-1001',
    category: 'space_facility',
    description: '三楼靠窗的独立工位最近空调出风很小，下午有点闷，想请物业看一下。',
    source: 'faq',
    status: 'queued',
    createdAt: '2026-11-24T09:12:00+08:00',
    messages: [
      message('M-1', 'member', '三楼靠窗的独立工位最近空调出风很小，下午有点闷，想请物业看一下。', '2026-11-24T09:12:00+08:00'),
    ],
  },
  {
    id: 'H-1002',
    category: 'member_benefit',
    description: '企业会员权益里的会议室免费时长，本月是否还能再用两次？',
    source: 'butler',
    status: 'in_progress',
    createdAt: '2026-11-23T14:05:00+08:00',
    messages: [
      message('M-1', 'member', '企业会员权益里的会议室免费时长，本月是否还能再用两次？', '2026-11-23T14:05:00+08:00'),
      message('M-2', 'butler', '已收到，正在核对您企业本月的会议室使用记录，稍后回复。', '2026-11-23T14:38:00+08:00'),
    ],
  },
  {
    id: 'H-1003',
    category: 'event_signup',
    description: '上周报名的产业链闭门会没有收到确认，想确认一下名额是否生效。',
    source: null,
    status: 'replied',
    createdAt: '2026-11-21T10:30:00+08:00',
    messages: [
      message('M-1', 'member', '上周报名的产业链闭门会没有收到确认，想确认一下名额是否生效。', '2026-11-21T10:30:00+08:00'),
      message('M-2', 'butler', '您的名额已生效，签到码会在活动前一天通过小程序消息发出。', '2026-11-21T11:02:00+08:00'),
      message('M-3', 'member', '好的，谢谢。', '2026-11-21T11:15:00+08:00'),
      message('M-4', 'butler', '已为您备注，如需调整参会人请在本周内告知。', '2026-11-21T11:20:00+08:00'),
    ],
  },
  {
    id: 'H-1004',
    category: 'resource_match',
    description: '想对接做工业视觉检测的会员企业，我们是做产线集成的，希望有机会交流。',
    source: 'faq',
    status: 'closed',
    createdAt: '2026-11-18T16:40:00+08:00',
    messages: [
      message('M-1', 'member', '想对接做工业视觉检测的会员企业，我们是做产线集成的，希望有机会交流。', '2026-11-18T16:40:00+08:00'),
      message('M-2', 'butler', '已为您匹配到两家会员企业，对接方式已在小程序消息中发送。', '2026-11-19T09:26:00+08:00'),
      message('M-3', 'member', '收到，已经联系上了。', '2026-11-19T10:02:00+08:00'),
      message('M-4', 'butler', '本次对接已完成，工单关闭。后续如需继续沟通可重新提交。', '2026-11-19T10:10:00+08:00'),
    ],
  },
];

/** 提交页顶部「我的咨询」用：未关闭数量按 status!==closed 统计 */
export function mockListTickets(): HandoffTicket[] {
  return TICKETS.map((ticket) => ({ ...ticket, messages: ticket.messages.slice() }));
}

export function mockGetTicket(id: string): HandoffTicket | null {
  const hit = TICKETS.find((ticket) => ticket.id === id);
  if (!hit) {
    return null;
  }
  return { ...hit, messages: hit.messages.slice() };
}

/** 详情页支持按状态直达（用于 4 种状态各截一张图），id 优先 */
export function mockGetTicketByStatus(status: HandoffStatus): HandoffTicket | null {
  const hit = TICKETS.find((ticket) => ticket.status === status);
  if (!hit) {
    return null;
  }
  return { ...hit, messages: hit.messages.slice() };
}

let seq = 0;

/** 提交工单：返回新建工单，状态固定 queued */
export function mockSubmit(payload: SubmitPayload): HandoffTicket {
  seq += 1;
  const id = `H-2${String(100 + seq)}`;
  const now = new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace('Z', '+08:00');
  const ticket: HandoffTicket = {
    id,
    category: payload.category,
    description: payload.description,
    source: payload.source,
    status: 'queued',
    createdAt: now,
    messages: [message('M-1', 'member', payload.description, now)],
  };
  TICKETS.unshift(ticket);
  return { ...ticket, messages: ticket.messages.slice() };
}

export function mockAppendMessage(ticketId: string, text: string): HandoffTicket | null {
  const hit = TICKETS.find((ticket) => ticket.id === ticketId);
  if (!hit || hit.status === 'closed') {
    return null;
  }
  const now = new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace('Z', '+08:00');
  hit.messages.push(message(`M-${hit.messages.length + 1}`, 'member', text, now));
  return { ...hit, messages: hit.messages.slice() };
}

/** 上传凭证：真实上传服务未接入，这里按时间戳生成一个占位凭证串 */
export function mockUploadToken(index: number): string {
  return `mock-token-${Date.now().toString(36)}-${index}`;
}

export { BUTLER_NAME };

