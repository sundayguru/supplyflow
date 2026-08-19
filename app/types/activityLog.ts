export const activityLogSourceTypes = [
  'rfq',
  'purchase_order',
  'vendor_purchase_order',
  'vendor_purchase_order_acknowledgement',
] as const;

export const activityLogActions = ['created', 'updated', 'deleted'] as const;

export type ActivityLogSourceType = (typeof activityLogSourceTypes)[number];
export type ActivityLogAction = (typeof activityLogActions)[number];

export type ActivityLogRecord = {
  id: string;
  organizationId: string | null;
  actorUserId: string;
  actor: {
    id: string;
    name: string;
    email: string;
  };
  sourceType: ActivityLogSourceType;
  sourceId: string;
  sourceReference: string;
  action: ActivityLogAction;
  fieldPath: string;
  previousValue: unknown;
  newValue: unknown;
  createdAt: string;
};

export type ActivityLogInput = {
  organizationId: string;
  actorUserId: string;
  sourceType: ActivityLogSourceType;
  sourceId: string;
  sourceReference: string;
  action: ActivityLogAction;
  fieldPath: string;
  previousValue: unknown;
  newValue: unknown;
};
