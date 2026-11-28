/** 转人工工单的领域类型。页面、mock、纯函数模块共用这一份定义。 */

export const HANDOFF_CATEGORIES = [
  { key: 'member_benefit', label: '会员权益' },
  { key: 'space_facility', label: '空间与设施' },
  { key: 'event_signup', label: '活动报名' },
  { key: 'resource_match', label: '资源对接' },
  { key: 'account_privacy', label: '账号与隐私' },
  { key: 'other', label: '其他' },
] as const;

export type HandoffCategory = (typeof HANDOFF_CATEGORIES)[number]['key'];

export type HandoffSource = 'faq' | 'butler';

export type HandoffStatus = 'queued' | 'in_progress' | 'replied' | 'closed';

export type MessageSide = 'member' | 'butler';

export interface HandoffMessage {
  id: string;
  side: MessageSide;
  text: string;
  /** ISO 8601 时间戳；渲染时统一按 Asia/Shanghai 格式化为 MM-DD HH:mm */
  time: string;
}

export interface HandoffTicket {
  id: string;
  category: HandoffCategory;
  description: string;
  source: HandoffSource | null;
  /** 来源条目：FAQ 入口带出的具体问答标题；没有则为空串 */
  sourceDetail: string;
  status: HandoffStatus;
  createdAt: string;
  messages: HandoffMessage[];
}

export interface HandoffAttachment {
  path: string;
  /** 上传凭证；真实上传服务接入后由后端返回，当前由 mock 生成 */
  token: string;
  sizeBytes: number;
}

export interface HandoffDraft {
  category: HandoffCategory | null;
  description: string;
  attachments: HandoffAttachment[];
  source: HandoffSource | null;
  sourceDetail: string;
}

export interface SubmitPayload {
  category: HandoffCategory;
  description: string;
  source: HandoffSource | null;
  /** FAQ 入口带出的具体条目，用于详情页显示「来自：FAQ 某条」 */
  sourceDetail: string;
  attachmentTokens: string[];
}

export function categoryLabel(key: HandoffCategory): string {
  const hit = HANDOFF_CATEGORIES.find((item) => item.key === key);
  return hit ? hit.label : '';
}
