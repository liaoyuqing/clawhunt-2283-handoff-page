/**
 * 服务层：页面只调这里，不直接碰 mock。接后端时把 implementation 换成 wx.request 即可，
 * 页面与纯函数模块的签名不变（README「对接点」一节写了替换位置）。
 */
import {
  mockAppendMessage,
  mockGetTicket,
  mockGetTicketByStatus,
  mockListTickets,
  mockSubmit,
  mockUploadToken,
} from '../mock/support';
import type {
  HandoffStatus,
  HandoffTicket,
  SubmitPayload,
} from '../utils/handoff-types';

/** 预留调用点：订阅消息授权组件由另一工单实现，这里只保留调用位置，不实现授权流程 */
export interface SubscribeNotifier {
  /** 提交成功后请求用户授权「人工回复通知」；组件未接入时为空实现 */
  requestReplyNotice(ticketId: string): void;
}

export const subscribeNotifier: SubscribeNotifier = {
  requestReplyNotice(_ticketId: string): void {
    // 订阅消息授权组件（另单）接入后在此发起订阅；当前为可安全调用的空实现
  },
};

export interface SupportService {
  listTickets(): Promise<HandoffTicket[]>;
  getTicket(id: string): Promise<HandoffTicket | null>;
  getTicketByStatus(status: HandoffStatus): Promise<HandoffTicket | null>;
  submit(payload: SubmitPayload): Promise<HandoffTicket>;
  appendMessage(ticketId: string, text: string): Promise<HandoffTicket | null>;
  uploadAttachment(index: number): Promise<string>;
}

export const supportService: SupportService = {
  listTickets(): Promise<HandoffTicket[]> {
    return Promise.resolve(mockListTickets());
  },
  getTicket(id: string): Promise<HandoffTicket | null> {
    return Promise.resolve(mockGetTicket(id));
  },
  getTicketByStatus(status: HandoffStatus): Promise<HandoffTicket | null> {
    return Promise.resolve(mockGetTicketByStatus(status));
  },
  submit(payload: SubmitPayload): Promise<HandoffTicket> {
    return Promise.resolve(mockSubmit(payload));
  },
  appendMessage(ticketId: string, text: string): Promise<HandoffTicket | null> {
    return Promise.resolve(mockAppendMessage(ticketId, text));
  },
  uploadAttachment(index: number): Promise<string> {
    return Promise.resolve(mockUploadToken(index));
  },
};

