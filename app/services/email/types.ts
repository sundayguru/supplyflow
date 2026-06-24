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

export type DraftReplyResult = {
  id: string;
  url: string;
};

export type EmailClient = {
  readonly provider: string;
  listMessages: (options: ListMessagesOptions) => Promise<EmailMessage[]>;
  createDraftReply?: (
    input: CreateDraftReplyInput,
  ) => Promise<DraftReplyResult>;
};
