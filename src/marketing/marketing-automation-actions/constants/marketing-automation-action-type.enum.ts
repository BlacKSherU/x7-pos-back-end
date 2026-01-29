export enum MarketingAutomationActionType {
  SEND_EMAIL = 'send_email',
  SEND_SMS = 'send_sms',
  SEND_PUSH = 'send_push',

  ASSIGN_COUPON = 'assign_coupon',
  REMOVE_COUPON = 'remove_coupon',

  ADD_TO_SEGMENT = 'add_to_segment',
  REMOVE_FROM_SEGMENT = 'remove_from_segment',

  ADD_LOYALTY_POINTS = 'add_loyalty_points',

  NOTIFY_MANAGER = 'notify_manager',

  WEBHOOK = 'webhook',
}
