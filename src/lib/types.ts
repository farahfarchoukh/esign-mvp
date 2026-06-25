// Shared field/recipient shapes used across editor, signing page and API.

export type FieldType = "SIGNATURE" | "CHECKBOX" | "TEXT" | "RADIO" | "DATE";

export interface FieldData {
  id?: string;
  recipientId: string | null;
  type: FieldType;
  page: number;
  xFrac: number;
  yFrac: number;
  wFrac: number;
  hFrac: number;
  value: string | null;
  required: boolean;
  groupName: string | null;
  optionLabel: string | null;
  // null = manual entry; otherwise "NAME" | "EMAIL" | "DATE" auto-populated value.
  autoFill?: string | null;
}

export interface RecipientData {
  id?: string;
  name: string;
  email: string;
}
