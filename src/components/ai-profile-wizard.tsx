"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { completeAIProfileDraftAction, saveAIProfileDraftAction } from "@/app/actions";
import { AIProfileSummary } from "@/components/ai-profile-summary";
import { StatusChip } from "@/components/status-chip";
import type { JsonObject, WizardFieldStateTree } from "@/lib/ai-profiles";
import {
  createRepeatableItemId,
  getActiveWizardSteps,
  getAIUsageModeFromPayload,
  getRenderableWizardSteps,
  getWizardStepConfig,
  reviewStepKey,
  resolveCompletedAIUsageMode,
  validateWizardForCompletion,
  validateWizardStep,
  wizardRepeatableItemIdKey,
  type WizardFieldConfig,
  type WizardFieldStatePayload,
  type WizardPayload,
  type WizardRepeatableGroupConfig,
  type WizardScalarFieldConfig,
  type WizardStepConfig
} from "@/lib/ai-profile-wizard-contract";

type AIProfileWizardProps = {
  workspaceSlug: string;
  initialDraft: {
    draftSessionId: string | null;
    basedOnAIProfileId: string | null;
    currentStepKey: string;
    draftPayloadJson: WizardPayload;
    fieldStateJson: WizardFieldStatePayload;
    schemaVersion: number;
    lastSavedAt: Date | null;
  };
  latestProfileVersionNumber: number | null;
};

type SaveFeedback =
  | { tone: "neutral"; message: string }
  | { tone: "upcoming"; message: string }
  | { tone: "ready"; message: string }
  | { tone: "error"; message: string };

function getFieldStatus(stateValue: unknown) {
  if (stateValue === "UNKNOWN") {
    return "Unknown";
  }

  if (stateValue === "PROVIDED") {
    return "Provided";
  }

  return "Unanswered";
}

function buildNoticePath(path: string, notice: string) {
  const url = new URL(path, "http://localhost");
  url.searchParams.set("notice", notice);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function findInitialStepIndex(stepKey: string, aiUsageMode: ReturnType<typeof getAIUsageModeFromPayload>) {
  const steps = getRenderableWizardSteps(aiUsageMode);
  const index = steps.findIndex((step) => step.key === stepKey);
  return index >= 0 ? index : 0;
}

function isProvidedValue(field: WizardScalarFieldConfig, value: unknown) {
  if (field.type === "boolean") {
    return typeof value === "boolean";
  }

  if (field.type === "multiSelect") {
    return Array.isArray(value) && value.length > 0;
  }

  return typeof value === "string" && value.trim().length > 0;
}

function nextFieldStateForValue(field: WizardScalarFieldConfig, value: unknown) {
  return isProvidedValue(field, value) ? "PROVIDED" : "UNANSWERED";
}

export function AIProfileWizard(props: AIProfileWizardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draftSessionId, setDraftSessionId] = useState(props.initialDraft.draftSessionId);
  const [basedOnAIProfileId, setBasedOnAIProfileId] = useState(props.initialDraft.basedOnAIProfileId);
  const [payload, setPayload] = useState<WizardPayload>(props.initialDraft.draftPayloadJson);
  const [fieldState, setFieldState] = useState<WizardFieldStatePayload>(props.initialDraft.fieldStateJson);
  const [currentStepIndex, setCurrentStepIndex] = useState(
    findInitialStepIndex(props.initialDraft.currentStepKey, getAIUsageModeFromPayload(props.initialDraft.draftPayloadJson, props.initialDraft.fieldStateJson))
  );
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(props.initialDraft.lastSavedAt);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedback>({
    tone: props.initialDraft.lastSavedAt ? "ready" : "neutral",
    message: props.initialDraft.lastSavedAt ? `Last saved ${props.initialDraft.lastSavedAt.toLocaleString()}` : "Draft not saved yet."
  });

  const aiUsageMode = getAIUsageModeFromPayload(payload, fieldState);
  const activeSteps = getActiveWizardSteps(aiUsageMode);
  const renderableSteps = getRenderableWizardSteps(aiUsageMode);
  const currentStep = renderableSteps[currentStepIndex] ?? renderableSteps[0];

  function currentPersistedStepKey(index = currentStepIndex) {
    const target = renderableSteps[index] ?? renderableSteps[0];
    if (!target || target.key === reviewStepKey) {
      return activeSteps[activeSteps.length - 1]?.key ?? props.initialDraft.currentStepKey;
    }
    return target.key;
  }

  function setScalarValue(field: WizardScalarFieldConfig, value: unknown) {
    setPayload((currentPayload) => ({
      ...currentPayload,
      [field.fieldKey]: value
    }));
    setFieldState((currentFieldState) => ({
      ...currentFieldState,
      [field.fieldKey]: nextFieldStateForValue(field, value)
    }));
    setValidationErrors((current) => {
      const next = { ...current };
      delete next[field.fieldKey];
      return next;
    });
  }

  function setScalarUnknown(field: WizardScalarFieldConfig, unknownSelected: boolean) {
    setPayload((currentPayload) => ({
      ...currentPayload,
      [field.fieldKey]: field.type === "multiSelect" ? [] : undefined
    }));
    setFieldState((currentFieldState) => ({
      ...currentFieldState,
      [field.fieldKey]: unknownSelected ? "UNKNOWN" : "UNANSWERED"
    }));
    setValidationErrors((current) => {
      const next = { ...current };
      delete next[field.fieldKey];
      return next;
    });
  }

  function addRepeatableItem(field: WizardRepeatableGroupConfig) {
    const nextItem = Object.fromEntries([
      [wizardRepeatableItemIdKey, createRepeatableItemId()],
      ...field.fields.map((childField) => [childField.fieldKey, undefined])
    ]);
    const nextItemState = Object.fromEntries(field.fields.map((childField) => [childField.fieldKey, "UNANSWERED"]));

    setPayload((currentPayload) => ({
      ...currentPayload,
      [field.fieldKey]: [...((currentPayload[field.fieldKey] as Record<string, unknown>[]) ?? []), nextItem]
    }));
    setFieldState((currentFieldState) => ({
      ...currentFieldState,
      [field.fieldKey]: [...((currentFieldState[field.fieldKey] as Record<string, string>[]) ?? []), nextItemState]
    }));
    setValidationErrors((current) => {
      const next = { ...current };
      delete next[field.fieldKey];
      return next;
    });
  }

  function removeRepeatableItem(field: WizardRepeatableGroupConfig, index: number) {
    setPayload((currentPayload) => ({
      ...currentPayload,
      [field.fieldKey]: ((currentPayload[field.fieldKey] as Record<string, unknown>[]) ?? []).filter(
        (_, itemIndex) => itemIndex !== index
      )
    }));
    setFieldState((currentFieldState) => ({
      ...currentFieldState,
      [field.fieldKey]: ((currentFieldState[field.fieldKey] as Record<string, string>[]) ?? []).filter(
        (_, itemIndex) => itemIndex !== index
      )
    }));
    setValidationErrors((current) => {
      const next = { ...current };
      Object.keys(next).forEach((key) => {
        if (key === field.fieldKey || key.startsWith(`${field.fieldKey}.${index}.`)) {
          delete next[key];
        }
      });
      return next;
    });
  }

  function setRepeatableFieldValue(
    field: WizardRepeatableGroupConfig,
    index: number,
    childField: WizardScalarFieldConfig,
    value: unknown
  ) {
    setPayload((currentPayload) => {
      const items = [...(((currentPayload[field.fieldKey] as Record<string, unknown>[]) ?? []))];
      const nextItem = { ...(items[index] ?? {}) };
      nextItem[childField.fieldKey] = value;
      items[index] = nextItem;
      return {
        ...currentPayload,
        [field.fieldKey]: items
      };
    });

    setFieldState((currentFieldState) => {
      const items = [...(((currentFieldState[field.fieldKey] as Record<string, string>[]) ?? []))];
      const nextItem = { ...(items[index] ?? {}) };
      nextItem[childField.fieldKey] = nextFieldStateForValue(childField, value);
      items[index] = nextItem;
      return {
        ...currentFieldState,
        [field.fieldKey]: items
      };
    });

    setValidationErrors((current) => {
      const next = { ...current };
      delete next[`${field.fieldKey}.${index}.${childField.fieldKey}`];
      return next;
    });
  }

  function setRepeatableFieldUnknown(
    field: WizardRepeatableGroupConfig,
    index: number,
    childField: WizardScalarFieldConfig,
    unknownSelected: boolean
  ) {
    setPayload((currentPayload) => {
      const items = [...(((currentPayload[field.fieldKey] as Record<string, unknown>[]) ?? []))];
      const nextItem = { ...(items[index] ?? {}) };
      nextItem[childField.fieldKey] = childField.type === "multiSelect" ? [] : undefined;
      items[index] = nextItem;
      return {
        ...currentPayload,
        [field.fieldKey]: items
      };
    });

    setFieldState((currentFieldState) => {
      const items = [...(((currentFieldState[field.fieldKey] as Record<string, string>[]) ?? []))];
      const nextItem = { ...(items[index] ?? {}) };
      nextItem[childField.fieldKey] = unknownSelected ? "UNKNOWN" : "UNANSWERED";
      items[index] = nextItem;
      return {
        ...currentFieldState,
        [field.fieldKey]: items
      };
    });

    setValidationErrors((current) => {
      const next = { ...current };
      delete next[`${field.fieldKey}.${index}.${childField.fieldKey}`];
      return next;
    });
  }

  async function persistDraft(targetStepIndex: number) {
    const result = await saveAIProfileDraftAction({
      workspaceSlug: props.workspaceSlug,
      basedOnAIProfileId,
      currentStepKey: currentPersistedStepKey(targetStepIndex),
      draftPayloadJson: payload as JsonObject,
      fieldStateJson: fieldState as WizardFieldStateTree,
      schemaVersion: props.initialDraft.schemaVersion
    });

    if (result.ok) {
      setDraftSessionId(result.draftSessionId ?? null);
      setBasedOnAIProfileId(result.basedOnAIProfileId ?? null);
      setLastSavedAt(result.lastSavedAt ? new Date(result.lastSavedAt) : null);
      setSaveFeedback({
        tone: "ready",
        message: result.lastSavedAt ? `Saved ${new Date(result.lastSavedAt).toLocaleString()}` : "Draft saved."
      });
    } else {
      setSaveFeedback({
        tone: "error",
        message: result.error ?? "We couldn't save this draft yet."
      });
    }

    return result;
  }

  function handleContinue() {
    if (!currentStep || currentStep.key === reviewStepKey) {
      return;
    }

    const stepErrors = validateWizardStep({
      stepKey: currentStep.key,
      payload,
      fieldState,
      aiUsageMode
    });

    if (Object.keys(stepErrors).length > 0) {
      setValidationErrors(stepErrors);
      setSaveFeedback({
        tone: "error",
        message: "Fix the highlighted fields before continuing."
      });
      return;
    }

    const nextStepIndex = Math.min(currentStepIndex + 1, renderableSteps.length - 1);

    startTransition(async () => {
      setSaveFeedback({
        tone: "upcoming",
        message: "Saving draft..."
      });
      const result = await persistDraft(nextStepIndex);
      if (result.ok) {
        setValidationErrors({});
        setCurrentStepIndex(nextStepIndex);
      }
    });
  }

  function handleSaveAndExit() {
    startTransition(async () => {
      setSaveFeedback({
        tone: "upcoming",
        message: "Saving draft..."
      });
      const result = await persistDraft(currentStepIndex);
      if (result.ok) {
        router.push(buildNoticePath(`/w/${props.workspaceSlug}`, "AI Profile draft saved."));
      }
    });
  }

  function handleComplete() {
    const completionErrors = validateWizardForCompletion(payload, fieldState);

    if (Object.keys(completionErrors).length > 0) {
      setValidationErrors(completionErrors);
      setSaveFeedback({
        tone: "error",
        message: "Resolve the required fields before completing the AI Profile."
      });

      const firstInvalidStep = activeSteps.findIndex(
        (step) =>
          Object.keys(
            validateWizardStep({
              stepKey: step.key,
              payload,
              fieldState,
              aiUsageMode
            })
          ).length > 0
      );

      if (firstInvalidStep >= 0) {
        setCurrentStepIndex(firstInvalidStep);
      }
      return;
    }

    const resolvedCompletionRule = resolveCompletedAIUsageMode(payload, fieldState);
    if (!resolvedCompletionRule.aiUsageMode) {
      setSaveFeedback({
        tone: "error",
        message: resolvedCompletionRule.error ?? "Select the AI usage mode before completing the AI Profile."
      });
      setCurrentStepIndex(renderableSteps.findIndex((step) => step.key === "AI_USAGE_MODE"));
      return;
    }

    startTransition(async () => {
      setSaveFeedback({
        tone: "upcoming",
        message: "Saving and completing AI Profile..."
      });

      const saveResult = await persistDraft(currentStepIndex);
      if (!saveResult.ok || !saveResult.draftSessionId) {
        return;
      }

      const completeResult = await completeAIProfileDraftAction({
        workspaceSlug: props.workspaceSlug,
        draftSessionId: saveResult.draftSessionId
      });

      if (!completeResult.ok) {
        setSaveFeedback({
          tone: "error",
          message: completeResult.error ?? "We couldn't complete this AI Profile yet."
        });
        return;
      }

      router.push(completeResult.redirectTo ?? `/w/${props.workspaceSlug}/trust-packs`);
    });
  }

  function renderScalarField(field: WizardScalarFieldConfig) {
    const stateValue = fieldState[field.fieldKey];
    const value = payload[field.fieldKey];
    const fieldError = validationErrors[field.fieldKey];
    const unknownSelected = stateValue === "UNKNOWN";

    return (
      <div className="field-card stack" key={field.fieldKey}>
        <div className="space-between" style={{ alignItems: "start" }}>
          <div>
            <label className="field-label" htmlFor={field.fieldKey}>
              {field.label}
            </label>
            <div className="muted">
              {field.required ? "Required" : "Optional"}
              {field.allowsUnknown ? " • Unknown allowed" : ""}
            </div>
          </div>
          <span className="pill">{getFieldStatus(stateValue)}</span>
        </div>

        {field.allowsUnknown ? (
          <div className="toolbar">
            <button
              className={unknownSelected ? "button-secondary" : "button"}
              onClick={() => setScalarUnknown(field, false)}
              type="button"
            >
              Provide answer
            </button>
            <button
              className={unknownSelected ? "button" : "button-secondary"}
              onClick={() => setScalarUnknown(field, true)}
              type="button"
            >
              Mark unknown
            </button>
          </div>
        ) : null}

        {field.type === "longText" ? (
          <textarea
            id={field.fieldKey}
            disabled={unknownSelected || isPending}
            onChange={(event) => setScalarValue(field, event.target.value)}
            rows={5}
            value={typeof value === "string" ? value : ""}
          />
        ) : null}

        {field.type === "shortText" || field.type === "url" || field.type === "date" ? (
          <input
            id={field.fieldKey}
            disabled={unknownSelected || isPending}
            onChange={(event) => setScalarValue(field, event.target.value)}
            type={field.type === "date" ? "date" : field.type === "url" ? "url" : "text"}
            value={typeof value === "string" ? value : ""}
          />
        ) : null}

        {field.type === "enum" ? (
          <select
            disabled={unknownSelected || isPending}
            id={field.fieldKey}
            onChange={(event) => setScalarValue(field, event.target.value)}
            value={typeof value === "string" ? value : ""}
          >
            <option value="">Select one</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : null}

        {field.type === "boolean" ? (
          <div className="choice-row">
            <label className="choice">
              <input
                checked={value === true && !unknownSelected}
                disabled={isPending}
                name={field.fieldKey}
                onChange={() => setScalarValue(field, true)}
                type="radio"
              />
              <span>Yes</span>
            </label>
            <label className="choice">
              <input
                checked={value === false && !unknownSelected}
                disabled={isPending}
                name={field.fieldKey}
                onChange={() => setScalarValue(field, false)}
                type="radio"
              />
              <span>No</span>
            </label>
            {field.allowsUnknown ? (
              <label className="choice">
                <input
                  checked={unknownSelected}
                  disabled={isPending}
                  name={field.fieldKey}
                  onChange={() => setScalarUnknown(field, true)}
                  type="radio"
                />
                <span>Unknown</span>
              </label>
            ) : null}
          </div>
        ) : null}

        {field.type === "multiSelect" ? (
          <div className="choice-grid">
            {field.options?.map((option) => {
              const selectedValues = Array.isArray(value) ? (value as string[]) : [];
              return (
                <label className="choice" key={option.value}>
                  <input
                    checked={selectedValues.includes(option.value)}
                    disabled={unknownSelected || isPending}
                    onChange={(event) => {
                      const nextValues = event.target.checked
                        ? [...selectedValues, option.value]
                        : selectedValues.filter((entry) => entry !== option.value);
                      setScalarValue(field, nextValues);
                    }}
                    type="checkbox"
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        ) : null}

        {field.citableInTrustPack ? (
          <p className="muted" style={{ margin: 0 }}>
            Only provided values can be cited later in the Trust Pack.
          </p>
        ) : null}

        {fieldError ? <div className="field-error">{fieldError}</div> : null}
      </div>
    );
  }

  function renderRepeatableGroup(field: WizardRepeatableGroupConfig) {
    const items = Array.isArray(payload[field.fieldKey]) ? (payload[field.fieldKey] as Record<string, unknown>[]) : [];
    const itemStates = Array.isArray(fieldState[field.fieldKey]) ? (fieldState[field.fieldKey] as Record<string, unknown>[]) : [];

    return (
      <div className="stack" key={field.fieldKey}>
        <div className="space-between">
          <div>
            <h3 style={{ marginBottom: 8 }}>{field.label}</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              {field.required ? `Add at least ${field.minItemsWhenActive} ${field.itemLabel.toLowerCase()} entry.` : `Add ${field.itemLabel.toLowerCase()} entries if relevant.`}
            </p>
          </div>
          <button className="button-secondary" onClick={() => addRepeatableItem(field)} type="button">
            Add {field.itemLabel.toLowerCase()}
          </button>
        </div>

        {validationErrors[field.fieldKey] ? <div className="field-error">{validationErrors[field.fieldKey]}</div> : null}

        {items.length === 0 ? (
          <div className="card card-muted">
            <strong>No {field.label.toLowerCase()} yet</strong>
            <p className="muted">Add structured entries here instead of a freeform paragraph.</p>
          </div>
        ) : null}

        {items.map((item, index) => {
          const stateEntry = itemStates[index] ?? {};
          const itemId =
            typeof item?.[wizardRepeatableItemIdKey] === "string" ? String(item[wizardRepeatableItemIdKey]) : `${index}`;
          return (
            <section className="card stack" key={`${field.fieldKey}-${itemId}`}>
              <div className="space-between">
                <div>
                  <span className="eyebrow">
                    {field.itemLabel} {index + 1}
                  </span>
                </div>
                <button className="button-danger" onClick={() => removeRepeatableItem(field, index)} type="button">
                  Remove
                </button>
              </div>

              {field.fields.map((childField) => {
                const childState = stateEntry[childField.fieldKey];
                const childValue = item[childField.fieldKey];
                const childError = validationErrors[`${field.fieldKey}.${index}.${childField.fieldKey}`];
                const unknownSelected = childState === "UNKNOWN";

                return (
                  <div className="field-card stack" key={`${field.fieldKey}-${index}-${childField.fieldKey}`}>
                    <div className="space-between" style={{ alignItems: "start" }}>
                      <div>
                        <label className="field-label">{childField.label}</label>
                        <div className="muted">
                          {childField.required ? "Required" : "Optional"}
                          {childField.allowsUnknown ? " • Unknown allowed" : ""}
                        </div>
                      </div>
                      <span className="pill">{getFieldStatus(childState)}</span>
                    </div>

                    {childField.allowsUnknown ? (
                      <div className="toolbar">
                        <button
                          className={unknownSelected ? "button-secondary" : "button"}
                          onClick={() => setRepeatableFieldUnknown(field, index, childField, false)}
                          type="button"
                        >
                          Provide answer
                        </button>
                        <button
                          className={unknownSelected ? "button" : "button-secondary"}
                          onClick={() => setRepeatableFieldUnknown(field, index, childField, true)}
                          type="button"
                        >
                          Mark unknown
                        </button>
                      </div>
                    ) : null}

                    {childField.type === "longText" ? (
                      <textarea
                        disabled={unknownSelected || isPending}
                        onChange={(event) => setRepeatableFieldValue(field, index, childField, event.target.value)}
                        rows={4}
                        value={typeof childValue === "string" ? childValue : ""}
                      />
                    ) : null}

                    {childField.type === "shortText" || childField.type === "url" || childField.type === "date" ? (
                      <input
                        disabled={unknownSelected || isPending}
                        onChange={(event) => setRepeatableFieldValue(field, index, childField, event.target.value)}
                        type={childField.type === "date" ? "date" : childField.type === "url" ? "url" : "text"}
                        value={typeof childValue === "string" ? childValue : ""}
                      />
                    ) : null}

                    {childField.type === "enum" ? (
                      <select
                        disabled={unknownSelected || isPending}
                        onChange={(event) => setRepeatableFieldValue(field, index, childField, event.target.value)}
                        value={typeof childValue === "string" ? childValue : ""}
                      >
                        <option value="">Select one</option>
                        {childField.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : null}

                    {childField.type === "boolean" ? (
                      <div className="choice-row">
                        <label className="choice">
                          <input
                            checked={childValue === true && !unknownSelected}
                            disabled={isPending}
                            onChange={() => setRepeatableFieldValue(field, index, childField, true)}
                            type="radio"
                          />
                          <span>Yes</span>
                        </label>
                        <label className="choice">
                          <input
                            checked={childValue === false && !unknownSelected}
                            disabled={isPending}
                            onChange={() => setRepeatableFieldValue(field, index, childField, false)}
                            type="radio"
                          />
                          <span>No</span>
                        </label>
                        {childField.allowsUnknown ? (
                          <label className="choice">
                            <input
                              checked={unknownSelected}
                              disabled={isPending}
                              onChange={() => setRepeatableFieldUnknown(field, index, childField, true)}
                              type="radio"
                            />
                            <span>Unknown</span>
                          </label>
                        ) : null}
                      </div>
                    ) : null}

                    {childField.type === "multiSelect" ? (
                      <div className="choice-grid">
                        {childField.options?.map((option) => {
                          const selectedValues = Array.isArray(childValue) ? (childValue as string[]) : [];
                          return (
                            <label className="choice" key={`${field.fieldKey}-${index}-${option.value}`}>
                              <input
                                checked={selectedValues.includes(option.value)}
                                disabled={unknownSelected || isPending}
                                onChange={(event) => {
                                  const nextValues = event.target.checked
                                    ? [...selectedValues, option.value]
                                    : selectedValues.filter((entry) => entry !== option.value);
                                  setRepeatableFieldValue(field, index, childField, nextValues);
                                }}
                                type="checkbox"
                              />
                              <span>{option.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : null}

                    {childError ? <div className="field-error">{childError}</div> : null}
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>
    );
  }

  function renderStepFields(step: WizardStepConfig) {
    return step.fields.map((field: WizardFieldConfig) =>
      field.kind === "scalar" ? renderScalarField(field) : renderRepeatableGroup(field)
    );
  }

  return (
    <div className="stack">
      <section className="card stack">
        <div className="space-between">
          <div>
            <span className="eyebrow">AI Profile Wizard</span>
            <h1 style={{ marginBottom: 8 }}>{currentStep.title}</h1>
            <p className="muted" style={{ marginTop: 0, maxWidth: 720 }}>
              {currentStep.description}
            </p>
          </div>
          <StatusChip tone={saveFeedback.tone}>{saveFeedback.message}</StatusChip>
        </div>

        <div className="stepper-grid">
          {renderableSteps.map((step, index) => (
            <div className={`stepper-item ${index === currentStepIndex ? "stepper-item-active" : ""}`} key={step.key}>
              <strong>
                {index + 1}. {step.title}
              </strong>
              <span className="muted">{index < activeSteps.length ? "Step" : "Review"}</span>
            </div>
          ))}
        </div>

        {aiUsageMode === "NONE" ? (
          <div className="banner banner-notice" role="status">
            No AI in use shortens the path, but this workspace still creates a minimal truthful AI Profile version.
          </div>
        ) : null}

        {props.latestProfileVersionNumber ? (
          <div className="pill">Latest completed version: v{props.latestProfileVersionNumber}</div>
        ) : (
          <div className="pill">No completed AI Profile yet</div>
        )}
      </section>

      <div className="split">
        <section className="card split-main stack">
          <div>
            <span className="eyebrow">{currentStep.key === reviewStepKey ? "Review" : "Current step"}</span>
            <h2 style={{ marginBottom: 8 }}>{currentStep.purpose}</h2>
          </div>

          {currentStep.key === reviewStepKey ? (
            <AIProfileSummary
              description="Review the full attestation before creating a new immutable AI Profile version."
              payload={payload}
              fieldState={fieldState}
              title="Review your answers"
            />
          ) : (
            renderStepFields(getWizardStepConfig(currentStep.key))
          )}

          <div className="toolbar">
            <button className="button-secondary" disabled={currentStepIndex === 0 || isPending} onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))} type="button">
              Back
            </button>
            <button className="button-secondary" disabled={isPending} onClick={handleSaveAndExit} type="button">
              Save and exit
            </button>
            {currentStep.key === reviewStepKey ? (
              <button className="button" disabled={isPending} onClick={handleComplete} type="button">
                Complete AI profile
              </button>
            ) : (
              <button className="button" disabled={isPending} onClick={handleContinue} type="button">
                Continue
              </button>
            )}
          </div>
        </section>

        <aside className="split-side stack">
          <section className="card stack">
            <span className="eyebrow">Save and resume</span>
            <h2 style={{ marginBottom: 8 }}>Progress is workspace-scoped</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Draft edits save into one shared workspace draft session. Completing from review creates a new immutable AI Profile version.
            </p>
            <div className="pill">{draftSessionId ? "Draft session active" : "Draft starts on first save"}</div>
            {lastSavedAt ? <div className="pill">Last saved {lastSavedAt.toLocaleString()}</div> : null}
          </section>

          <section className="card stack">
            <span className="eyebrow">Trust Pack impact</span>
            <h2 style={{ marginBottom: 8 }}>What this unlocks later</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              A completed AI Profile becomes versioned attestation input for the single workspace trust pack. Unknown values stay visible and are not citable.
            </p>
            <div className="pill">
              {aiUsageMode === "NONE" ? "Minimal attestation path active" : "Full AI attestation path active"}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
