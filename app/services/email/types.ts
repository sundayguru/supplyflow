export type EmailAddress = {
  name: string | null;
  address: string;
};

export type EmailMessage = {
  id: string;
  threadId: string | null;
  subject: string;
  from: EmailAddress;
  to: EmailAddress[];
  receivedAt: Date;
  text: string;
  attachments: EmailAttachment[];
};

export type EmailAttachment = {
  id: string;
  filename: string;
  contentType: string;
  bytes: ArrayBuffer;
};

export type ListMessagesOptions = {
  receivedAfter: Date;
  limit: number;
  folder?: string;
  unread?: boolean;
};

export type CreateDraftReplyInput = {
  originalMessageId: string;
  threadId: string | null;
  accountEmail: string;
  to: string;
  subject: string;
  bodyText: string;
  attachment: {
    filename: string;
    contentType: string;
    bytes: Uint8Array;
  };
};

export type CreateDraftEmailInput = Omit<
  CreateDraftReplyInput,
  'originalMessageId' | 'threadId'
>;

export type SendReplyInput = {
  originalMessageId: string;
  threadId: string | null;
  to: string;
  subject: string;
  bodyText: string;
};

export type UpdateDraftReplyInput = CreateDraftReplyInput & {
  draftId: string;
};

export type DraftReplyResult = {
  id: string;
  url: string;
  threadId?: string | null;
};

export type DraftSentStatusInput = {
  draftId: string;
  threadId: string | null;
  sentAfter: Date;
};

export type EmailClient = {
  readonly provider: string;
  listMessages: (options: ListMessagesOptions) => Promise<EmailMessage[]>;
  listThreadMessages?: (threadId: string) => Promise<EmailMessage[]>;
  getMessage?: (id: string) => Promise<EmailMessage>;
  createDraftReply?: (
    input: CreateDraftReplyInput,
  ) => Promise<DraftReplyResult>;
  createDraftEmail?: (
    input: CreateDraftEmailInput,
  ) => Promise<DraftReplyResult>;
  updateDraftReply?: (
    input: UpdateDraftReplyInput,
  ) => Promise<DraftReplyResult>;
  sendReply?: (input: SendReplyInput) => Promise<void>;
  isDraftSent?: (input: DraftSentStatusInput) => Promise<boolean>;
};
