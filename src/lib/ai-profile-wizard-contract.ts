import {
  AIUsageMode,
  WizardFieldState,
  type AIUsageMode as AIUsageModeValue,
  type WizardFieldState as WizardFieldStateValue,
  type WizardStepKey as WizardStepKeyValue
} from "@/lib/domain";

export type WizardFieldType = "shortText" | "longText" | "url" | "enum" | "boolean" | "multiSelect" | "date";
export type WizardReviewStepKey = "REVIEW_SUMMARY";
export type WizardRenderableStepKey = WizardStepKeyValue | WizardReviewStepKey;
export type WizardPayload = Record<string, unknown>;
export type WizardFieldStatePayload = Record<string, unknown>;
export type WizardRepeatableItem = Record<string, unknown> & {
  _itemId: string;
};

export type WizardOption = {
  value: string;
  label: string;
};

export type WizardScalarFieldConfig = {
  kind: "scalar";
  fieldKey: string;
  label: string;
  type: WizardFieldType;
  required: boolean;
  repeatable: false;
  allowsUnknown: boolean;
  citableInTrustPack: boolean;
  notes?: string;
  options?: WizardOption[];
};

export type WizardRepeatableGroupConfig = {
  kind: "repeatableGroup";
  fieldKey: string;
  label: string;
  required: boolean;
  repeatable: true;
  allowsUnknown: false;
  citableInTrustPack: false;
  minItemsWhenActive: number;
  itemLabel: string;
  fields: WizardScalarFieldConfig[];
};

export type WizardFieldConfig = WizardScalarFieldConfig | WizardRepeatableGroupConfig;

export type WizardStepConfig = {
  key: WizardStepKeyValue;
  title: string;
  purpose: string;
  description: string;
  fields: WizardFieldConfig[];
};

export type WizardReviewConfig = {
  key: WizardReviewStepKey;
  title: string;
  purpose: string;
  description: string;
};

export const reviewStepKey: WizardReviewStepKey = "REVIEW_SUMMARY";
export const wizardRepeatableItemIdKey = "_itemId";

const deploymentOptions: WizardOption[] = [
  { value: "SAAS", label: "SaaS" },
  { value: "MANAGED_SERVICE", label: "Managed service" },
  { value: "SELF_HOSTED", label: "Self-hosted" },
  { value: "HYBRID", label: "Hybrid" }
];

const hostingModeOptions: WizardOption[] = [
  { value: "VENDOR_HOSTED", label: "Vendor-hosted" },
  { value: "SELF_MANAGED", label: "Self-managed" },
  { value: "MIXED", label: "Mixed" }
];

const aiTrainingUsageOptions: WizardOption[] = [
  { value: "NO", label: "No" },
  { value: "YES", label: "Yes" },
  { value: "LIMITED_OR_CONDITIONAL", label: "Limited / conditional" }
];

const aiInternalUseAreaOptions: WizardOption[] = [
  { value: "SUPPORT", label: "Support" },
  { value: "SALES", label: "Sales" },
  { value: "CODING", label: "Coding" },
  { value: "OPERATIONS", label: "Operations" },
  { value: "OTHER", label: "Other" }
];

const aiDataCategoryOptions: WizardOption[] = [
  { value: "PROMPTS", label: "Prompts" },
  { value: "SUPPORT_TICKETS", label: "Support tickets" },
  { value: "DOCUMENTS", label: "Documents" },
  { value: "TELEMETRY", label: "Telemetry" },
  { value: "METADATA", label: "Metadata" },
  { value: "OTHER", label: "Other" }
];

const openGapCategoryOptions: WizardOption[] = [
  { value: "OPEN_QUESTION", label: "Open question" },
  { value: "MISSING_DOCUMENTATION", label: "Missing documentation" },
  { value: "VENDOR_UNKNOWN", label: "Vendor unknown" },
  { value: "CONTROL_GAP", label: "Control gap" }
];

export const wizardStepConfigs: WizardStepConfig[] = [
  {
    key: "COMPANY_PRODUCT_BASICS",
    title: "Company / Product Basics",
    purpose: "Capture the baseline identity and product context needed to frame the trust pack.",
    description: "Keep this founder-fast. These answers become the baseline company and product framing later.",
    fields: [
      {
        kind: "scalar",
        fieldKey: "company_legal_name",
        label: "Company legal name",
        type: "shortText",
        required: true,
        repeatable: false,
        allowsUnknown: false,
        citableInTrustPack: true
      },
      {
        kind: "scalar",
        fieldKey: "product_name",
        label: "Product name",
        type: "shortText",
        required: true,
        repeatable: false,
        allowsUnknown: false,
        citableInTrustPack: true
      },
      {
        kind: "scalar",
        fieldKey: "primary_domain",
        label: "Website or primary domain",
        type: "url",
        required: false,
        repeatable: false,
        allowsUnknown: false,
        citableInTrustPack: false
      },
      {
        kind: "scalar",
        fieldKey: "product_summary",
        label: "Product summary",
        type: "longText",
        required: true,
        repeatable: false,
        allowsUnknown: true,
        citableInTrustPack: true
      },
      {
        kind: "scalar",
        fieldKey: "deployment_model",
        label: "Deployment model",
        type: "enum",
        required: true,
        repeatable: false,
        allowsUnknown: true,
        citableInTrustPack: true,
        options: deploymentOptions
      },
      {
        kind: "scalar",
        fieldKey: "primary_customer_type",
        label: "Primary customer type",
        type: "shortText",
        required: false,
        repeatable: false,
        allowsUnknown: true,
        citableInTrustPack: false
      },
      {
        kind: "scalar",
        fieldKey: "internal_trust_owner",
        label: "Primary trust owner",
        type: "shortText",
        required: false,
        repeatable: false,
        allowsUnknown: false,
        citableInTrustPack: false
      }
    ]
  },
  {
    key: "AI_USAGE_MODE",
    title: "AI Usage Mode",
    purpose: "State whether and where AI is used in the product or internal workflow.",
    description: "This decision shapes the rest of the wizard. NONE is a valid truthful path and still creates an attestation.",
    fields: [
      {
        kind: "scalar",
        fieldKey: "ai_usage_mode",
        label: "How is AI used today?",
        type: "enum",
        required: true,
        repeatable: false,
        allowsUnknown: true,
        citableInTrustPack: true,
        options: [
          { value: AIUsageMode.NONE, label: "No AI in use" },
          { value: AIUsageMode.INTERNAL_ONLY, label: "Internal only" },
          { value: AIUsageMode.CUSTOMER_FACING, label: "Customer-facing" },
          { value: AIUsageMode.BOTH, label: "Both internal and customer-facing" }
        ]
      },
      {
        kind: "scalar",
        fieldKey: "ai_usage_summary",
        label: "Short summary of AI usage",
        type: "longText",
        required: false,
        repeatable: false,
        allowsUnknown: true,
        citableInTrustPack: true
      },
      {
        kind: "scalar",
        fieldKey: "ai_output_visible_to_end_users",
        label: "Is AI output visible to end users?",
        type: "boolean",
        required: false,
        repeatable: false,
        allowsUnknown: true,
        citableInTrustPack: true
      },
      {
        kind: "scalar",
        fieldKey: "ai_internal_use_areas",
        label: "Internal AI use areas",
        type: "multiSelect",
        required: false,
        repeatable: false,
        allowsUnknown: true,
        citableInTrustPack: true,
        options: aiInternalUseAreaOptions
      }
    ]
  },
  {
    key: "MODELS_VENDORS",
    title: "Models / Vendors",
    purpose: "Create a clear inventory of AI systems involved in the product or internal operations.",
    description: "List the concrete systems involved. Keep it honest and operational, not polished.",
    fields: [
      {
        kind: "repeatableGroup",
        fieldKey: "ai_systems",
        label: "AI systems",
        required: true,
        repeatable: true,
        allowsUnknown: false,
        citableInTrustPack: false,
        minItemsWhenActive: 1,
        itemLabel: "AI system",
        fields: [
          {
            kind: "scalar",
            fieldKey: "provider_name",
            label: "Provider or vendor name",
            type: "shortText",
            required: true,
            repeatable: false,
            allowsUnknown: true,
            citableInTrustPack: true
          },
          {
            kind: "scalar",
            fieldKey: "model_or_service",
            label: "Model family or service type",
            type: "shortText",
            required: true,
            repeatable: false,
            allowsUnknown: true,
            citableInTrustPack: true
          },
          {
            kind: "scalar",
            fieldKey: "use_case",
            label: "Primary use case",
            type: "longText",
            required: true,
            repeatable: false,
            allowsUnknown: true,
            citableInTrustPack: true
          },
          {
            kind: "scalar",
            fieldKey: "hosting_mode",
            label: "Hosting mode",
            type: "enum",
            required: true,
            repeatable: false,
            allowsUnknown: true,
            citableInTrustPack: true,
            options: hostingModeOptions
          },
          {
            kind: "scalar",
            fieldKey: "customer_data_sent",
            label: "Does customer data reach this system?",
            type: "boolean",
            required: true,
            repeatable: false,
            allowsUnknown: true,
            citableInTrustPack: true
          },
          {
            kind: "scalar",
            fieldKey: "notes",
            label: "Additional notes",
            type: "longText",
            required: false,
            repeatable: false,
            allowsUnknown: true,
            citableInTrustPack: false
          }
        ]
      }
    ]
  },
  {
    key: "DATA_USAGE_TRAINING",
    title: "Customer Data / Training",
    purpose: "Capture how customer data interacts with AI systems and what retention or training posture exists.",
    description: "This is where buyer questions usually sharpen. Unknown is better than pretending.",
    fields: [
      {
        kind: "scalar",
        fieldKey: "ai_data_categories",
        label: "Data categories sent to AI systems",
        type: "multiSelect",
        required: false,
        repeatable: false,
        allowsUnknown: true,
        citableInTrustPack: true,
        options: aiDataCategoryOptions
      },
      {
        kind: "scalar",
        fieldKey: "ai_customer_content_in_scope",
        label: "Can customer content be included?",
        type: "boolean",
        required: false,
        repeatable: false,
        allowsUnknown: true,
        citableInTrustPack: true
      },
      {
        kind: "scalar",
        fieldKey: "ai_pii_in_scope",
        label: "Can PII be included?",
        type: "boolean",
        required: false,
        repeatable: false,
        allowsUnknown: true,
        citableInTrustPack: true
      },
      {
        kind: "scalar",
        fieldKey: "ai_training_usage",
        label: "Is customer data used for model training?",
        type: "enum",
        required: true,
        repeatable: false,
        allowsUnknown: true,
        citableInTrustPack: true,
        options: aiTrainingUsageOptions
      },
      {
        kind: "scalar",
        fieldKey: "ai_retention_posture",
        label: "Retention or deletion posture",
        type: "longText",
        required: false,
        repeatable: false,
        allowsUnknown: true,
        citableInTrustPack: true
      },
      {
        kind: "scalar",
        fieldKey: "ai_deletion_or_opt_out_posture",
        label: "Customer control or opt-out posture",
        type: "longText",
        required: false,
        repeatable: false,
        allowsUnknown: true,
        citableInTrustPack: true
      },
      {
        kind: "scalar",
        fieldKey: "ai_vendor_handling_unknowns",
        label: "Unresolved vendor handling questions",
        type: "longText",
        required: false,
        repeatable: false,
        allowsUnknown: false,
        citableInTrustPack: false
      }
    ]
  },
  {
    key: "SAFEGUARDS_HUMAN_OVERSIGHT",
    title: "Safeguards / Human Oversight",
    purpose: "Capture the operational controls that make AI use credible and reviewable.",
    description: "Keep the attestation honest. This step should help a reviewer trust what is truly in place today.",
    fields: [
      {
        kind: "scalar",
        fieldKey: "ai_human_review_exists",
        label: "Is there any human review or approval in AI workflows?",
        type: "boolean",
        required: false,
        repeatable: false,
        allowsUnknown: true,
        citableInTrustPack: true
      },
      {
        kind: "scalar",
        fieldKey: "ai_human_review_description",
        label: "Describe human review or approval points",
        type: "longText",
        required: false,
        repeatable: false,
        allowsUnknown: true,
        citableInTrustPack: true
      },
      {
        kind: "scalar",
        fieldKey: "ai_fallback_behavior",
        label: "What happens when AI output is weak or unavailable?",
        type: "longText",
        required: false,
        repeatable: false,
        allowsUnknown: true,
        citableInTrustPack: true
      },
      {
        kind: "scalar",
        fieldKey: "ai_monitoring_and_logging",
        label: "Monitoring or logging for AI usage",
        type: "longText",
        required: false,
        repeatable: false,
        allowsUnknown: true,
        citableInTrustPack: true
      },
      {
        kind: "scalar",
        fieldKey: "ai_access_controls",
        label: "Access or release controls around AI features",
        type: "longText",
        required: false,
        repeatable: false,
        allowsUnknown: true,
        citableInTrustPack: true
      },
      {
        kind: "scalar",
        fieldKey: "ai_evaluation_or_qa",
        label: "Evaluation or QA checks for AI systems",
        type: "longText",
        required: false,
        repeatable: false,
        allowsUnknown: true,
        citableInTrustPack: true
      },
      {
        kind: "scalar",
        fieldKey: "ai_incident_escalation",
        label: "Incident or escalation path for unsafe output",
        type: "longText",
        required: false,
        repeatable: false,
        allowsUnknown: true,
        citableInTrustPack: true
      }
    ]
  },
  {
    key: "OPEN_GAPS",
    title: "Open Gaps",
    purpose: "Record incomplete or unresolved areas without blocking forward motion.",
    description: "Visible gaps help the product stay honest later. They are not a failure state.",
    fields: [
      {
        kind: "repeatableGroup",
        fieldKey: "open_gaps",
        label: "Open gaps",
        required: false,
        repeatable: true,
        allowsUnknown: false,
        citableInTrustPack: false,
        minItemsWhenActive: 0,
        itemLabel: "Open gap",
        fields: [
          {
            kind: "scalar",
            fieldKey: "category",
            label: "Gap category",
            type: "enum",
            required: true,
            repeatable: false,
            allowsUnknown: false,
            citableInTrustPack: false,
            options: openGapCategoryOptions
          },
          {
            kind: "scalar",
            fieldKey: "description",
            label: "Gap description",
            type: "longText",
            required: true,
            repeatable: false,
            allowsUnknown: false,
            citableInTrustPack: false
          },
          {
            kind: "scalar",
            fieldKey: "owner",
            label: "Follow-up owner",
            type: "shortText",
            required: false,
            repeatable: false,
            allowsUnknown: false,
            citableInTrustPack: false
          },
          {
            kind: "scalar",
            fieldKey: "target_date",
            label: "Target date",
            type: "date",
            required: false,
            repeatable: false,
            allowsUnknown: false,
            citableInTrustPack: false
          }
        ]
      }
    ]
  }
];

export const wizardReviewConfig: WizardReviewConfig = {
  key: reviewStepKey,
  title: "Review summary",
  purpose: "Review the attestation before creating a new immutable AI Profile version.",
  description: "Completion always happens from this summary step. Unknowns stay explicit and uncited."
};

export function getWizardStepConfig(stepKey: WizardStepKeyValue) {
  const step = wizardStepConfigs.find((entry) => entry.key === stepKey);
  if (!step) {
    throw new Error(`Unknown wizard step: ${stepKey}`);
  }
  return step;
}

export function getActiveWizardSteps(aiUsageMode: AIUsageModeValue | null | undefined): WizardStepConfig[] {
  if (aiUsageMode === AIUsageMode.NONE) {
    return wizardStepConfigs.filter(
      (step) =>
        step.key === "COMPANY_PRODUCT_BASICS" || step.key === "AI_USAGE_MODE" || step.key === "OPEN_GAPS"
    );
  }

  return wizardStepConfigs;
}

export function getRenderableWizardSteps(aiUsageMode: AIUsageModeValue | null | undefined) {
  return [...getActiveWizardSteps(aiUsageMode), wizardReviewConfig];
}

export function createEmptyWizardPayload(): WizardPayload {
  return {
    ai_systems: [],
    open_gaps: []
  };
}

export function createEmptyWizardFieldState(): WizardFieldStatePayload {
  const fieldState: WizardFieldStatePayload = {
    ai_systems: [],
    open_gaps: []
  };

  for (const step of wizardStepConfigs) {
    for (const field of step.fields) {
      if (field.kind === "scalar") {
        fieldState[field.fieldKey] = WizardFieldState.UNANSWERED;
        continue;
      }

      fieldState[field.fieldKey] = [];
    }
  }

  return fieldState;
}

export function createRepeatableItemId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `wizard-item-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeRepeatableItems(value: unknown, field: WizardRepeatableGroupConfig) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => {
    const nextEntry: Record<string, unknown> = {
      [wizardRepeatableItemIdKey]:
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? String((entry as Record<string, unknown>)[wizardRepeatableItemIdKey] || createRepeatableItemId())
          : createRepeatableItemId()
    };
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      for (const childField of field.fields) {
        nextEntry[childField.fieldKey] = (entry as Record<string, unknown>)[childField.fieldKey];
      }
    }
    return nextEntry;
  });
}

function normalizeRepeatableFieldStates(value: unknown, field: WizardRepeatableGroupConfig) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => {
    const nextEntry: Record<string, WizardFieldStateValue> = {};
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      for (const childField of field.fields) {
        const rawValue = (entry as Record<string, unknown>)[childField.fieldKey];
        nextEntry[childField.fieldKey] =
          rawValue === WizardFieldState.PROVIDED ||
          rawValue === WizardFieldState.UNKNOWN ||
          rawValue === WizardFieldState.UNANSWERED
            ? (rawValue as WizardFieldStateValue)
            : WizardFieldState.UNANSWERED;
      }
    } else {
      for (const childField of field.fields) {
        nextEntry[childField.fieldKey] = WizardFieldState.UNANSWERED;
      }
    }
    return nextEntry;
  });
}

export function hydrateWizardPayload(payload: unknown): WizardPayload {
  const source = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as WizardPayload) : {};
  const nextPayload = createEmptyWizardPayload();

  for (const step of wizardStepConfigs) {
    for (const field of step.fields) {
      if (field.kind === "scalar") {
        nextPayload[field.fieldKey] = source[field.fieldKey];
        continue;
      }

      nextPayload[field.fieldKey] = normalizeRepeatableItems(source[field.fieldKey], field);
    }
  }

  return nextPayload;
}

export function hydrateWizardFieldState(fieldState: unknown): WizardFieldStatePayload {
  const source =
    fieldState && typeof fieldState === "object" && !Array.isArray(fieldState)
      ? (fieldState as WizardFieldStatePayload)
      : {};
  const nextFieldState = createEmptyWizardFieldState();

  for (const step of wizardStepConfigs) {
    for (const field of step.fields) {
      if (field.kind === "scalar") {
        const rawValue = source[field.fieldKey];
        nextFieldState[field.fieldKey] =
          rawValue === WizardFieldState.PROVIDED ||
          rawValue === WizardFieldState.UNKNOWN ||
          rawValue === WizardFieldState.UNANSWERED
            ? (rawValue as WizardFieldStateValue)
            : WizardFieldState.UNANSWERED;
        continue;
      }

      nextFieldState[field.fieldKey] = normalizeRepeatableFieldStates(source[field.fieldKey], field);
    }
  }

  return nextFieldState;
}

export function getAIUsageModeFromPayload(payload: WizardPayload, fieldState: WizardFieldStatePayload) {
  if (fieldState.ai_usage_mode !== WizardFieldState.PROVIDED) {
    return null;
  }

  const value = payload.ai_usage_mode;
  if (value === AIUsageMode.NONE || value === AIUsageMode.INTERNAL_ONLY || value === AIUsageMode.CUSTOMER_FACING || value === AIUsageMode.BOTH) {
    return value;
  }

  return null;
}

export function resolveCompletedAIUsageMode(payload: WizardPayload, fieldState: WizardFieldStatePayload) {
  if (fieldState.ai_usage_mode === WizardFieldState.UNKNOWN) {
    return {
      aiUsageMode: null,
      error: "Resolve the AI usage mode before completing the AI Profile. Unknown is allowed in draft state only."
    };
  }

  if (fieldState.ai_usage_mode !== WizardFieldState.PROVIDED) {
    return {
      aiUsageMode: null,
      error: "Select the AI usage mode before completing the AI Profile."
    };
  }

  const aiUsageMode = getAIUsageModeFromPayload(payload, fieldState);
  if (!aiUsageMode) {
    return {
      aiUsageMode: null,
      error: "Select one canonical AI usage mode before completing the AI Profile."
    };
  }

  return {
    aiUsageMode,
    error: null
  };
}

function hasProvidedValue(field: WizardScalarFieldConfig, value: unknown) {
  if (field.type === "boolean") {
    return typeof value === "boolean";
  }

  if (field.type === "multiSelect") {
    return Array.isArray(value) && value.length > 0;
  }

  return typeof value === "string" && value.trim().length > 0;
}

function isFieldSatisfied(field: WizardScalarFieldConfig, value: unknown, fieldStateValue: unknown) {
  if (fieldStateValue === WizardFieldState.UNKNOWN && field.allowsUnknown) {
    return true;
  }

  return fieldStateValue === WizardFieldState.PROVIDED && hasProvidedValue(field, value);
}

export function validateWizardStep(params: {
  stepKey: WizardStepKeyValue;
  payload: WizardPayload;
  fieldState: WizardFieldStatePayload;
  aiUsageMode: AIUsageModeValue | null | undefined;
}) {
  const step = getWizardStepConfig(params.stepKey);
  const errors: Record<string, string> = {};

  for (const field of step.fields) {
    if (field.kind === "scalar") {
      if (!field.required) {
        continue;
      }

      if (!isFieldSatisfied(field, params.payload[field.fieldKey], params.fieldState[field.fieldKey])) {
        errors[field.fieldKey] = `${field.label} is required for this step.`;
      }
      continue;
    }

    const items = Array.isArray(params.payload[field.fieldKey]) ? (params.payload[field.fieldKey] as Record<string, unknown>[]) : [];
    const itemStates = Array.isArray(params.fieldState[field.fieldKey])
      ? (params.fieldState[field.fieldKey] as Record<string, unknown>[])
      : [];

    if (field.minItemsWhenActive > 0 && items.length < field.minItemsWhenActive) {
      errors[field.fieldKey] = `Add at least ${field.minItemsWhenActive} ${field.itemLabel.toLowerCase()} entry.`;
      continue;
    }

    items.forEach((item, index) => {
      const stateEntry = itemStates[index] ?? {};
      field.fields.forEach((childField) => {
        if (!childField.required) {
          return;
        }

        if (!isFieldSatisfied(childField, item?.[childField.fieldKey], stateEntry?.[childField.fieldKey])) {
          errors[`${field.fieldKey}.${index}.${childField.fieldKey}`] = `${childField.label} is required.`;
        }
      });
    });
  }

  return errors;
}

export function validateWizardForCompletion(payload: WizardPayload, fieldState: WizardFieldStatePayload) {
  const completionRule = resolveCompletedAIUsageMode(payload, fieldState);
  const aiUsageMode = completionRule.aiUsageMode;
  const errors: Record<string, string> = {};

  if (completionRule.error) {
    errors.ai_usage_mode = completionRule.error;
  }

  for (const step of getActiveWizardSteps(aiUsageMode)) {
    Object.assign(
      errors,
      validateWizardStep({
        stepKey: step.key,
        payload,
        fieldState,
        aiUsageMode
      })
    );
  }

  return errors;
}

function getScalarFieldConfig(fieldKey: string) {
  for (const step of wizardStepConfigs) {
    for (const field of step.fields) {
      if (field.kind === "scalar" && field.fieldKey === fieldKey) {
        return field;
      }
    }
  }

  return null;
}

function getRepeatableGroupConfig(groupFieldKey: string) {
  for (const step of wizardStepConfigs) {
    for (const field of step.fields) {
      if (field.kind === "repeatableGroup" && field.fieldKey === groupFieldKey) {
        return field;
      }
    }
  }

  return null;
}

export function buildWizardProvenancePath(params: {
  fieldKey: string;
  itemId?: string | null;
  childFieldKey?: string | null;
}) {
  if (params.itemId && params.childFieldKey) {
    return `${params.fieldKey}[${params.itemId}].${params.childFieldKey}`;
  }

  return params.fieldKey;
}

export type WizardProvenanceResolution = {
  path: string;
  topLevelFieldKey: string;
  itemId: string | null;
  childFieldKey: string | null;
  value: unknown;
  fieldState: WizardFieldStateValue | null;
  citableInTrustPack: boolean;
};

export function resolveWizardProvenancePath(params: {
  payload: WizardPayload;
  fieldState: WizardFieldStatePayload;
  path: string;
}): WizardProvenanceResolution | null {
  const repeatableMatch = params.path.match(/^([a-z_]+)\[([A-Za-z0-9-]+)\]\.([a-z_]+)$/);
  if (repeatableMatch) {
    const [, groupFieldKey, itemId, childFieldKey] = repeatableMatch;
    const groupField = getRepeatableGroupConfig(groupFieldKey);
    if (!groupField) {
      return null;
    }

    const items = Array.isArray(params.payload[groupFieldKey]) ? (params.payload[groupFieldKey] as WizardRepeatableItem[]) : [];
    const itemStates = Array.isArray(params.fieldState[groupFieldKey])
      ? (params.fieldState[groupFieldKey] as Record<string, unknown>[])
      : [];
    const itemIndex = items.findIndex((item) => item?.[wizardRepeatableItemIdKey] === itemId);
    if (itemIndex < 0) {
      return null;
    }

    const childField = groupField.fields.find((field) => field.fieldKey === childFieldKey);
    if (!childField) {
      return null;
    }

    const fieldStateValue = itemStates[itemIndex]?.[childFieldKey];

    return {
      path: params.path,
      topLevelFieldKey: groupFieldKey,
      itemId,
      childFieldKey,
      value: items[itemIndex]?.[childFieldKey],
      fieldState:
        fieldStateValue === WizardFieldState.PROVIDED ||
        fieldStateValue === WizardFieldState.UNKNOWN ||
        fieldStateValue === WizardFieldState.UNANSWERED
          ? (fieldStateValue as WizardFieldStateValue)
          : null,
      citableInTrustPack: childField.citableInTrustPack
    };
  }

  const scalarField = getScalarFieldConfig(params.path);
  if (!scalarField) {
    return null;
  }

  const fieldStateValue = params.fieldState[params.path];
  return {
    path: params.path,
    topLevelFieldKey: params.path,
    itemId: null,
    childFieldKey: null,
    value: params.payload[params.path],
    fieldState:
      fieldStateValue === WizardFieldState.PROVIDED ||
      fieldStateValue === WizardFieldState.UNKNOWN ||
      fieldStateValue === WizardFieldState.UNANSWERED
        ? (fieldStateValue as WizardFieldStateValue)
        : null,
    citableInTrustPack: scalarField.citableInTrustPack
  };
}
