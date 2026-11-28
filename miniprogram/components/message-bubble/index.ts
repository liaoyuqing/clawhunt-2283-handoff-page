/**
 * 消息气泡：会员一侧靠右、管家团队一侧靠左，每条都带时间。
 * 组件只接收 side / text / time 三个属性，不做业务判断，便于在详情页复用。
 */
import { formatMessageTime } from '../../utils/format';

Component({
  properties: {
    side: {
      type: String,
      value: 'member',
    },
    text: {
      type: String,
      value: '',
    },
    /** ISO 时间戳；渲染时格式化成 MM-DD HH:mm */
    time: {
      type: String,
      value: '',
    },
    /** 对方显示名，默认「管家团队」；会员一侧不显示 */
    name: {
      type: String,
      value: '管家团队',
    },
  },
  data: {
    timeText: '',
  },
  observers: {
    time(value: string) {
      this.setData({ timeText: formatMessageTime(value) });
    },
  },
  lifetimes: {
    attached() {
      this.setData({ timeText: formatMessageTime(this.data.time) });
    },
  },
});
