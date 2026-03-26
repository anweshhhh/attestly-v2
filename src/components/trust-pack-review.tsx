"use client";

import { useState } from "react";
import { StatusChip } from "@/components/status-chip";
import type { TrustPackDetailPageData } from "@/lib/trust-pack-generation";

type CurrentVersion = NonNullable<TrustPackDetailPageData["currentVersion"]>;

type TrustPackReviewProps = {
  currentVersion: CurrentVersion;
};

function getStatusTone(status: CurrentVersion["sections"][number]["claims"][number]["status"]) {
  switch (status) {
    case "FOUND":
      return "ready";
    case "PARTIAL":
      return "upcoming";
    case "NOT_FOUND":
      return "error";
    default:
      return "neutral";
  }
}

function getCitationTone(sourceType: CurrentVersion["sections"][number]["claims"][number]["citations"][number]["sourceType"]) {
  return sourceType === "DOCUMENT" ? "ready" : "upcoming";
}

export function TrustPackReview(props: TrustPackReviewProps) {
  const flatClaims = props.currentVersion.sections.flatMap((section) =>
    section.claims.map((claim) => ({
      ...claim,
      sectionKey: section.key,
      sectionTitle: section.title
    }))
  );
  const [selectedClaimId, setSelectedClaimId] = useState<string>(flatClaims[0]?.id ?? "");
  const selectedClaim = flatClaims.find((claim) => claim.id === selectedClaimId) ?? flatClaims[0] ?? null;

  return (
    <div className="trust-pack-review">
      <aside className="trust-pack-nav card">
        <div className="stack">
          <div>
            <span className="eyebrow">Sections</span>
            <h3 style={{ marginBottom: 8 }}>Catalog order</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              This draft follows the fixed phase-1 Trust Pack catalog. Claims stay grouped in canonical section order.
            </p>
          </div>

          <nav className="trust-pack-section-list">
            {props.currentVersion.sections.map((section) => (
              <a className="trust-pack-section-link" href={`#section-${section.key}`} key={section.id}>
                <strong>{section.title}</strong>
                <span className="muted">{section.summaryText}</span>
              </a>
            ))}
          </nav>
        </div>
      </aside>

      <div className="trust-pack-main">
        {props.currentVersion.sections.map((section) => (
          <section className="card stack" id={`section-${section.key}`} key={section.id}>
            <div className="space-between">
              <div>
                <span className="eyebrow">{section.title}</span>
                <h3 style={{ marginBottom: 8 }}>{section.title}</h3>
                <p className="muted" style={{ marginTop: 0 }}>
                  {section.summaryText}
                </p>
              </div>
              <span className="pill">{section.claims.length} claims</span>
            </div>

            <div className="stack">
              {section.claims.map((claim) => (
                <button
                  className={`claim-card ${selectedClaim?.id === claim.id ? "claim-card-active" : ""}`}
                  key={claim.id}
                  onClick={() => setSelectedClaimId(claim.id)}
                  type="button"
                >
                  <div className="space-between">
                    <div>
                      <strong>{claim.prompt}</strong>
                      <p className="muted" style={{ marginBottom: 0 }}>
                        {claim.answerText ?? "No grounded answer could be generated for this claim yet."}
                      </p>
                    </div>
                    <StatusChip tone={getStatusTone(claim.status)}>{claim.status}</StatusChip>
                  </div>

                  <div className="toolbar" style={{ justifyContent: "space-between" }}>
                    <span className="pill">{claim.citationCount} citation(s)</span>
                    {claim.missingDetailsText ? <span className="pill">Missing detail recorded</span> : null}
                  </div>

                  {claim.missingDetailsText ? (
                    <p className="claim-missing-details">{claim.missingDetailsText}</p>
                  ) : null}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      <aside className="trust-pack-provenance card">
        {selectedClaim ? (
          <div className="stack">
            <div>
              <span className="eyebrow">Claim provenance</span>
              <h3 style={{ marginBottom: 8 }}>{selectedClaim.prompt}</h3>
              <p className="muted" style={{ marginTop: 0 }}>
                {selectedClaim.sectionTitle} · {selectedClaim.status} · {selectedClaim.citationCount} citation(s)
              </p>
            </div>

            {selectedClaim.answerText ? (
              <section className="card card-muted stack">
                <strong>Generated answer</strong>
                <p className="muted" style={{ margin: 0 }}>
                  {selectedClaim.answerText}
                </p>
                {selectedClaim.missingDetailsText ? (
                  <p className="claim-missing-details" style={{ margin: 0 }}>
                    Missing detail: {selectedClaim.missingDetailsText}
                  </p>
                ) : null}
              </section>
            ) : null}

            {selectedClaim.citations.length > 0 ? (
              <div className="stack">
                {selectedClaim.citations.map((citation) => (
                  <section className="card card-muted stack" key={citation.id}>
                    <div className="space-between">
                      <strong>{citation.sourceType === "DOCUMENT" ? "Document citation" : "Wizard attestation"}</strong>
                      <StatusChip tone={getCitationTone(citation.sourceType)}>
                        {citation.sourceType === "DOCUMENT" ? "DOCUMENT" : "WIZARD_ATTESTATION"}
                      </StatusChip>
                    </div>
                    <p className="muted" style={{ margin: 0 }}>
                      {citation.locator ?? "No locator recorded."}
                    </p>
                    {citation.sourceDocumentName ? (
                      <p className="muted" style={{ margin: 0 }}>
                        Source document: {citation.sourceDocumentName}
                        {typeof citation.sourceChunkIndex === "number" ? ` · chunk ${citation.sourceChunkIndex + 1}` : ""}
                      </p>
                    ) : null}
                    {typeof citation.sourceAIProfileVersionNumber === "number" ? (
                      <p className="muted" style={{ margin: 0 }}>
                        AI Profile version: v{citation.sourceAIProfileVersionNumber}
                        {citation.sourceFieldPath ? ` · ${citation.sourceFieldPath}` : ""}
                      </p>
                    ) : null}
                    {citation.quotedSnippet ? (
                      <blockquote className="citation-quote">{citation.quotedSnippet}</blockquote>
                    ) : null}
                  </section>
                ))}
              </div>
            ) : (
              <section className="card card-muted stack">
                <strong>No citations on this claim</strong>
                <p className="muted" style={{ margin: 0 }}>
                  <code>NOT_FOUND</code> claims stay visible and intentionally carry zero citations until grounded
                  support exists.
                </p>
              </section>
            )}
          </div>
        ) : (
          <div className="stack">
            <span className="eyebrow">Claim provenance</span>
            <h3 style={{ marginBottom: 8 }}>No claims yet</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Generate the first draft version to inspect grounded claims and citations.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
