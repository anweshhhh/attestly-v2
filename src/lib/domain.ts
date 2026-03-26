export const MembershipRole = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  REVIEWER: "REVIEWER",
  VIEWER: "VIEWER"
} as const;

export type MembershipRole = (typeof MembershipRole)[keyof typeof MembershipRole];

export const membershipRoles: MembershipRole[] = [
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
  MembershipRole.REVIEWER,
  MembershipRole.VIEWER
];

export function isMembershipRole(value: string): value is MembershipRole {
  return membershipRoles.includes(value as MembershipRole);
}

export function asMembershipRole(value: string): MembershipRole {
  if (!isMembershipRole(value)) {
    throw new Error(`Unknown membership role: ${value}`);
  }

  return value;
}

export const AIUsageMode = {
  NONE: "NONE",
  INTERNAL_ONLY: "INTERNAL_ONLY",
  CUSTOMER_FACING: "CUSTOMER_FACING",
  BOTH: "BOTH"
} as const;

export type AIUsageMode = (typeof AIUsageMode)[keyof typeof AIUsageMode];

export const aiUsageModes: AIUsageMode[] = [
  AIUsageMode.NONE,
  AIUsageMode.INTERNAL_ONLY,
  AIUsageMode.CUSTOMER_FACING,
  AIUsageMode.BOTH
];

export function isAIUsageMode(value: string): value is AIUsageMode {
  return aiUsageModes.includes(value as AIUsageMode);
}

export function asAIUsageMode(value: string): AIUsageMode {
  if (!isAIUsageMode(value)) {
    throw new Error(`Unknown AI usage mode: ${value}`);
  }

  return value;
}

export const WizardDraftStatus = {
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  ABANDONED: "ABANDONED"
} as const;

export type WizardDraftStatus = (typeof WizardDraftStatus)[keyof typeof WizardDraftStatus];

export const wizardDraftStatuses: WizardDraftStatus[] = [
  WizardDraftStatus.IN_PROGRESS,
  WizardDraftStatus.COMPLETED,
  WizardDraftStatus.ABANDONED
];

export function isWizardDraftStatus(value: string): value is WizardDraftStatus {
  return wizardDraftStatuses.includes(value as WizardDraftStatus);
}

export function asWizardDraftStatus(value: string): WizardDraftStatus {
  if (!isWizardDraftStatus(value)) {
    throw new Error(`Unknown wizard draft status: ${value}`);
  }

  return value;
}

export const WizardStepKey = {
  COMPANY_PRODUCT_BASICS: "COMPANY_PRODUCT_BASICS",
  AI_USAGE_MODE: "AI_USAGE_MODE",
  MODELS_VENDORS: "MODELS_VENDORS",
  DATA_USAGE_TRAINING: "DATA_USAGE_TRAINING",
  SAFEGUARDS_HUMAN_OVERSIGHT: "SAFEGUARDS_HUMAN_OVERSIGHT",
  OPEN_GAPS: "OPEN_GAPS"
} as const;

export type WizardStepKey = (typeof WizardStepKey)[keyof typeof WizardStepKey];

export const wizardStepKeys: WizardStepKey[] = [
  WizardStepKey.COMPANY_PRODUCT_BASICS,
  WizardStepKey.AI_USAGE_MODE,
  WizardStepKey.MODELS_VENDORS,
  WizardStepKey.DATA_USAGE_TRAINING,
  WizardStepKey.SAFEGUARDS_HUMAN_OVERSIGHT,
  WizardStepKey.OPEN_GAPS
];

export const firstWizardStepKey = WizardStepKey.COMPANY_PRODUCT_BASICS;

export function isWizardStepKey(value: string): value is WizardStepKey {
  return wizardStepKeys.includes(value as WizardStepKey);
}

export function asWizardStepKey(value: string): WizardStepKey {
  if (!isWizardStepKey(value)) {
    throw new Error(`Unknown wizard step key: ${value}`);
  }

  return value;
}

export const WizardFieldState = {
  PROVIDED: "PROVIDED",
  UNKNOWN: "UNKNOWN",
  UNANSWERED: "UNANSWERED"
} as const;

export type WizardFieldState = (typeof WizardFieldState)[keyof typeof WizardFieldState];

export const wizardFieldStates: WizardFieldState[] = [
  WizardFieldState.PROVIDED,
  WizardFieldState.UNKNOWN,
  WizardFieldState.UNANSWERED
];

export function isWizardFieldState(value: string): value is WizardFieldState {
  return wizardFieldStates.includes(value as WizardFieldState);
}

export function asWizardFieldState(value: string): WizardFieldState {
  if (!isWizardFieldState(value)) {
    throw new Error(`Unknown wizard field state: ${value}`);
  }

  return value;
}

export const PackStatus = {
  DRAFT: "DRAFT",
  READY_FOR_REVIEW: "READY_FOR_REVIEW",
  APPROVED: "APPROVED",
  STALE: "STALE",
  EXPORTED: "EXPORTED"
} as const;

export type PackStatus = (typeof PackStatus)[keyof typeof PackStatus];

export const packStatuses: PackStatus[] = [
  PackStatus.DRAFT,
  PackStatus.READY_FOR_REVIEW,
  PackStatus.APPROVED,
  PackStatus.STALE,
  PackStatus.EXPORTED
];

export function isPackStatus(value: string): value is PackStatus {
  return packStatuses.includes(value as PackStatus);
}

export function asPackStatus(value: string): PackStatus {
  if (!isPackStatus(value)) {
    throw new Error(`Unknown pack status: ${value}`);
  }

  return value;
}

export const ClaimStatus = {
  FOUND: "FOUND",
  PARTIAL: "PARTIAL",
  NOT_FOUND: "NOT_FOUND"
} as const;

export type ClaimStatus = (typeof ClaimStatus)[keyof typeof ClaimStatus];

export const claimStatuses: ClaimStatus[] = [
  ClaimStatus.FOUND,
  ClaimStatus.PARTIAL,
  ClaimStatus.NOT_FOUND
];

export function isClaimStatus(value: string): value is ClaimStatus {
  return claimStatuses.includes(value as ClaimStatus);
}

export function asClaimStatus(value: string): ClaimStatus {
  if (!isClaimStatus(value)) {
    throw new Error(`Unknown claim status: ${value}`);
  }

  return value;
}

export const CitationSourceType = {
  DOCUMENT: "DOCUMENT",
  WIZARD_ATTESTATION: "WIZARD_ATTESTATION"
} as const;

export type CitationSourceType = (typeof CitationSourceType)[keyof typeof CitationSourceType];

export const citationSourceTypes: CitationSourceType[] = [
  CitationSourceType.DOCUMENT,
  CitationSourceType.WIZARD_ATTESTATION
];

export function isCitationSourceType(value: string): value is CitationSourceType {
  return citationSourceTypes.includes(value as CitationSourceType);
}

export function asCitationSourceType(value: string): CitationSourceType {
  if (!isCitationSourceType(value)) {
    throw new Error(`Unknown citation source type: ${value}`);
  }

  return value;
}

export const ExportFormat = {
  MARKDOWN: "MARKDOWN",
  DOCX: "DOCX",
  PDF: "PDF"
} as const;

export type ExportFormat = (typeof ExportFormat)[keyof typeof ExportFormat];

export const exportFormats: ExportFormat[] = [
  ExportFormat.MARKDOWN,
  ExportFormat.DOCX,
  ExportFormat.PDF
];

export function isExportFormat(value: string): value is ExportFormat {
  return exportFormats.includes(value as ExportFormat);
}

export function asExportFormat(value: string): ExportFormat {
  if (!isExportFormat(value)) {
    throw new Error(`Unknown export format: ${value}`);
  }

  return value;
}

export const ClaimOrigin = {
  GENERATED: "GENERATED",
  MANUAL_EDIT: "MANUAL_EDIT"
} as const;

export type ClaimOrigin = (typeof ClaimOrigin)[keyof typeof ClaimOrigin];

export const claimOrigins: ClaimOrigin[] = [
  ClaimOrigin.GENERATED,
  ClaimOrigin.MANUAL_EDIT
];

export function isClaimOrigin(value: string): value is ClaimOrigin {
  return claimOrigins.includes(value as ClaimOrigin);
}

export function asClaimOrigin(value: string): ClaimOrigin {
  if (!isClaimOrigin(value)) {
    throw new Error(`Unknown claim origin: ${value}`);
  }

  return value;
}

export const DocumentStatus = {
  UPLOADED: "UPLOADED",
  CHUNKED: "CHUNKED",
  ERROR: "ERROR",
  ARCHIVED: "ARCHIVED"
} as const;

export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const documentStatuses: DocumentStatus[] = [
  DocumentStatus.UPLOADED,
  DocumentStatus.CHUNKED,
  DocumentStatus.ERROR,
  DocumentStatus.ARCHIVED
];

export function isDocumentStatus(value: string): value is DocumentStatus {
  return documentStatuses.includes(value as DocumentStatus);
}

export function asDocumentStatus(value: string): DocumentStatus {
  if (!isDocumentStatus(value)) {
    throw new Error(`Unknown document status: ${value}`);
  }

  return value;
}
