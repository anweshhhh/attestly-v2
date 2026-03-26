import {
  getActiveWizardSteps,
  getAIUsageModeFromPayload,
  wizardRepeatableItemIdKey,
  type WizardFieldStatePayload,
  type WizardPayload
} from "@/lib/ai-profile-wizard-contract";

function renderValue(value: unknown) {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "None selected";
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  return "Unanswered";
}

function renderStateLabel(fieldState: unknown) {
  if (fieldState === "UNKNOWN") {
    return "Unknown";
  }

  if (fieldState === "PROVIDED") {
    return "Provided";
  }

  return "Unanswered";
}

type AIProfileSummaryProps = {
  payload: WizardPayload;
  fieldState: WizardFieldStatePayload;
  title?: string;
  description?: string;
};

export function AIProfileSummary(props: AIProfileSummaryProps) {
  const aiUsageMode = getAIUsageModeFromPayload(props.payload, props.fieldState);
  const steps = getActiveWizardSteps(aiUsageMode);

  return (
    <div className="stack">
      {props.title ? (
        <div>
          <h2 style={{ marginBottom: 8 }}>{props.title}</h2>
          {props.description ? (
            <p className="muted" style={{ marginTop: 0 }}>
              {props.description}
            </p>
          ) : null}
        </div>
      ) : null}

      {steps.map((step) => (
        <section className="card card-muted stack" key={step.key}>
          <div>
            <span className="eyebrow">{step.title}</span>
            <p className="muted" style={{ marginBottom: 0 }}>
              {step.purpose}
            </p>
          </div>

          {step.fields.map((field) => {
            if (field.kind === "scalar") {
              return (
                <div className="summary-row" key={field.fieldKey}>
                  <div>
                    <strong>{field.label}</strong>
                    <div className="muted">{renderValue(props.payload[field.fieldKey])}</div>
                  </div>
                  <span className="pill">{renderStateLabel(props.fieldState[field.fieldKey])}</span>
                </div>
              );
            }

            const items = Array.isArray(props.payload[field.fieldKey]) ? (props.payload[field.fieldKey] as Record<string, unknown>[]) : [];
            const itemStates = Array.isArray(props.fieldState[field.fieldKey])
              ? (props.fieldState[field.fieldKey] as Record<string, unknown>[])
              : [];

            return (
              <div className="stack" key={field.fieldKey}>
                <div className="summary-row">
                  <div>
                    <strong>{field.label}</strong>
                    <div className="muted">
                      {items.length > 0 ? `${items.length} ${field.itemLabel.toLowerCase()} entr${items.length === 1 ? "y" : "ies"}` : "No entries yet"}
                    </div>
                  </div>
                </div>

                {items.map((item, index) => {
                  const stateEntry = itemStates[index] ?? {};
                  const itemId =
                    typeof item?.[wizardRepeatableItemIdKey] === "string"
                      ? String(item[wizardRepeatableItemIdKey])
                      : `${index}`;
                  return (
                    <div className="card" key={`${field.fieldKey}-${itemId}`}>
                      <div className="space-between" style={{ marginBottom: 12 }}>
                        <strong>
                          {field.itemLabel} {index + 1}
                        </strong>
                        <span className="pill">Reviewable later</span>
                      </div>
                      <div className="stack">
                        {field.fields.map((childField) => (
                          <div className="summary-row" key={`${field.fieldKey}-${index}-${childField.fieldKey}`}>
                            <div>
                              <strong>{childField.label}</strong>
                              <div className="muted">{renderValue(item?.[childField.fieldKey])}</div>
                            </div>
                            <span className="pill">{renderStateLabel(stateEntry?.[childField.fieldKey])}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
