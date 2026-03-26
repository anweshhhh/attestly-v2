export const trustPackSectionCatalog = [
  {
    key: "company_snapshot",
    title: "Company Snapshot",
    orderIndex: 1
  },
  {
    key: "product_data_boundary",
    title: "Product / Data Boundary",
    orderIndex: 2
  },
  {
    key: "security_baseline",
    title: "Security Baseline",
    orderIndex: 3
  },
  {
    key: "ai_systems_inventory",
    title: "AI Systems Inventory",
    orderIndex: 4
  },
  {
    key: "ai_data_usage",
    title: "AI Data Usage And Retention",
    orderIndex: 5
  },
  {
    key: "ai_risk_controls",
    title: "AI Risk Controls / Human Oversight",
    orderIndex: 6
  },
  {
    key: "evidence_appendix",
    title: "Evidence Appendix",
    orderIndex: 7
  }
] as const;

export type TrustPackSectionCatalogKey = (typeof trustPackSectionCatalog)[number]["key"];

export const trustPackClaimCatalog = [
  {
    key: "company_snapshot.company_identity",
    sectionKey: "company_snapshot",
    orderIndex: 1,
    prompt: "Identify the vendor and product in a buyer-readable opening statement."
  },
  {
    key: "company_snapshot.product_summary",
    sectionKey: "company_snapshot",
    orderIndex: 2,
    prompt: "Explain what the product does in one concise claim."
  },
  {
    key: "company_snapshot.deployment_model",
    sectionKey: "company_snapshot",
    orderIndex: 3,
    prompt: "State whether the product is SaaS, managed service, self-hosted, or mixed."
  },
  {
    key: "product_data_boundary.customer_data_scope",
    sectionKey: "product_data_boundary",
    orderIndex: 1,
    prompt: "Describe whether customer data enters the platform and what broad categories are handled."
  },
  {
    key: "product_data_boundary.system_boundary",
    sectionKey: "product_data_boundary",
    orderIndex: 2,
    prompt: "Explain the high-level product boundary and what sits inside versus outside the system."
  },
  {
    key: "product_data_boundary.operator_access_boundary",
    sectionKey: "product_data_boundary",
    orderIndex: 3,
    prompt: "Describe whether internal operators can access production systems or customer data and at a high level under what conditions."
  },
  {
    key: "security_baseline.access_control_baseline",
    sectionKey: "security_baseline",
    orderIndex: 1,
    prompt: "Summarize the baseline access-control posture for users and internal admins."
  },
  {
    key: "security_baseline.encryption_baseline",
    sectionKey: "security_baseline",
    orderIndex: 2,
    prompt: "Summarize encryption posture for data in transit and at rest."
  },
  {
    key: "security_baseline.logging_monitoring_baseline",
    sectionKey: "security_baseline",
    orderIndex: 3,
    prompt: "State whether key activity and system events are logged or monitored."
  },
  {
    key: "security_baseline.backup_recovery_baseline",
    sectionKey: "security_baseline",
    orderIndex: 4,
    prompt: "Describe the existence of backup or recovery posture at a high level."
  },
  {
    key: "security_baseline.secure_development_baseline",
    sectionKey: "security_baseline",
    orderIndex: 5,
    prompt: "Describe the basic secure development or vulnerability-management posture."
  },
  {
    key: "ai_systems_inventory.ai_usage_mode",
    sectionKey: "ai_systems_inventory",
    orderIndex: 1,
    prompt: "State whether AI is used and whether use is internal, customer-facing, or both."
  },
  {
    key: "ai_systems_inventory.ai_feature_inventory",
    sectionKey: "ai_systems_inventory",
    orderIndex: 2,
    prompt: "List the major AI-enabled workflows or product features in scope."
  },
  {
    key: "ai_systems_inventory.model_vendor_inventory",
    sectionKey: "ai_systems_inventory",
    orderIndex: 3,
    prompt: "Identify the main model providers or AI vendors involved."
  },
  {
    key: "ai_data_usage.customer_data_to_ai",
    sectionKey: "ai_data_usage",
    orderIndex: 1,
    prompt: "Explain whether customer data is sent to AI systems and at what level."
  },
  {
    key: "ai_data_usage.training_usage",
    sectionKey: "ai_data_usage",
    orderIndex: 2,
    prompt: "State whether customer data is used for model training."
  },
  {
    key: "ai_data_usage.retention_posture",
    sectionKey: "ai_data_usage",
    orderIndex: 3,
    prompt: "Explain the high-level retention or deletion posture for data sent to AI systems."
  },
  {
    key: "ai_data_usage.customer_control_posture",
    sectionKey: "ai_data_usage",
    orderIndex: 4,
    prompt: "Describe any customer-facing control, exclusion, opt-out, or tenant-handling posture related to AI data use."
  },
  {
    key: "ai_risk_controls.human_review_posture",
    sectionKey: "ai_risk_controls",
    orderIndex: 1,
    prompt: "Describe whether human review or approval exists in AI-assisted workflows."
  },
  {
    key: "ai_risk_controls.access_and_release_controls",
    sectionKey: "ai_risk_controls",
    orderIndex: 2,
    prompt: "Describe access restrictions or release controls around AI capabilities."
  },
  {
    key: "ai_risk_controls.monitoring_and_quality_controls",
    sectionKey: "ai_risk_controls",
    orderIndex: 3,
    prompt: "Describe how the team monitors or checks AI output quality, safety, or abuse."
  },
  {
    key: "ai_risk_controls.fallback_and_escalation",
    sectionKey: "ai_risk_controls",
    orderIndex: 4,
    prompt: "Describe what happens when AI output is wrong, unsafe, or insufficient."
  },
  {
    key: "evidence_appendix.source_document_index",
    sectionKey: "evidence_appendix",
    orderIndex: 1,
    prompt: "List the key source documents used by the current version."
  },
  {
    key: "evidence_appendix.attestation_version_index",
    sectionKey: "evidence_appendix",
    orderIndex: 2,
    prompt: "Show which wizard attestation version was used for the current version."
  }
] as const;

export type TrustPackClaimCatalogKey = (typeof trustPackClaimCatalog)[number]["key"];

export function getTrustPackSectionCatalogEntry(sectionKey: TrustPackSectionCatalogKey) {
  const entry = trustPackSectionCatalog.find((section) => section.key === sectionKey);
  if (!entry) {
    throw new Error(`Unknown trust-pack section catalog key: ${sectionKey}`);
  }
  return entry;
}
