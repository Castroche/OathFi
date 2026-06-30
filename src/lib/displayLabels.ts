import type { TFunction } from "i18next";

function normalize(value: string | null | undefined) {
  return String(value ?? "unknown").trim().replace(/\s+/g, "_").toLowerCase();
}

function translateOrFallback(t: TFunction, key: string, fallback: string, options?: Record<string, unknown>) {
  const translated = t(key, { defaultValue: fallback, ...options });
  if (typeof translated === "string" && translated !== key && !translated.startsWith("missing:")) {
    return translated;
  }
  return fallback;
}

function eventKey(eventType?: string | null, title?: string | null) {
  const normalizedType = normalize(eventType);
  const normalizedTitle = normalize(title);
  if (normalizedTitle.includes("acceptance")) return "acceptance";
  if (normalizedTitle.includes("audit_seed")) return "audit_seed";
  if (normalizedTitle.includes("breakout")) return "breakout_watch";
  if (normalizedTitle.includes("liquidity")) return "liquidity_shift";
  if (normalizedTitle.includes("volume")) return "volume_spike";
  if (normalizedTitle.includes("agent")) return "agent_analysis";
  if (normalizedType !== "unknown") return normalizedType;
  return normalizedTitle;
}

export function statusLabel(t: TFunction, value: string | null | undefined) {
  return translateOrFallback(t, `display.status.${normalize(value)}`, String(value ?? "--"));
}

export function decisionLabel(t: TFunction, value: string | null | undefined) {
  return translateOrFallback(t, `display.decision.${normalize(value)}`, String(value ?? "--"));
}

export function eventTypeLabel(t: TFunction, value: string | null | undefined) {
  return translateOrFallback(t, `display.eventType.${normalize(value)}`, String(value ?? "--"));
}

export function actionTypeLabel(t: TFunction, value: string | null | undefined) {
  return translateOrFallback(t, `display.actionType.${normalize(value)}`, String(value ?? "--"));
}

export function entityTypeLabel(t: TFunction, value: string | null | undefined) {
  return translateOrFallback(t, `display.entityType.${normalize(value)}`, String(value ?? "--"));
}

export function actorLabel(t: TFunction, value: string | null | undefined) {
  return translateOrFallback(t, `display.actor.${normalize(value)}`, String(value ?? "--"));
}

export function metricLabel(t: TFunction, value: string | null | undefined) {
  return translateOrFallback(t, `display.metric.${normalize(value)}`, String(value ?? "--"));
}

export function providerStatusLabel(t: TFunction, value: string | null | undefined) {
  return translateOrFallback(t, `display.providerStatus.${normalize(value)}`, String(value ?? "--"));
}

export function riskRuleLabel(t: TFunction, value: string | null | undefined) {
  return translateOrFallback(t, `display.riskRule.${normalize(value)}`, String(value ?? "--"));
}

export function riskRuleMessage(t: TFunction, value: string | null | undefined) {
  return translateOrFallback(t, `display.riskRuleMessage.${normalize(value)}`, riskRuleLabel(t, value));
}

export function riskLevelLabel(t: TFunction, value: string | null | undefined) {
  return translateOrFallback(t, `display.riskLevel.${normalize(value)}`, String(value ?? "--"));
}

export function executionModeLabel(t: TFunction, value: string | null | undefined) {
  return translateOrFallback(t, `display.executionMode.${normalize(value)}`, String(value ?? "--"));
}

export function analysisModeLabel(t: TFunction, value: string | null | undefined) {
  return translateOrFallback(t, `display.analysisMode.${normalize(value)}`, String(value ?? "--"));
}

export function hypothesisTypeLabel(t: TFunction, value: string | null | undefined) {
  return translateOrFallback(t, `display.hypothesisType.${normalize(value)}`, String(value ?? "--"));
}

export function agentHypothesisLabel(_t: TFunction, value: string | null | undefined) {
  return businessCopyLabel(_t, value);
}

export function validityLabel(t: TFunction, value: string | null | undefined) {
  return translateOrFallback(t, `display.validity.${normalize(value)}`, String(value ?? "--"));
}

export function sideLabel(t: TFunction, value: string | null | undefined) {
  return translateOrFallback(t, `display.side.${normalize(value)}`, String(value ?? "--"));
}

export function riskValueLabel(t: TFunction, value: string | null | undefined) {
  const raw = String(value ?? "--");
  return translateOrFallback(t, `display.riskValue.${normalize(raw)}`, raw);
}

export function sourceLabel(t: TFunction, value: string | null | undefined) {
  const raw = String(value ?? "--");
  return translateOrFallback(t, `display.source.${normalize(raw)}`, raw);
}

export function signalLabel(t: TFunction, value: string | null | undefined) {
  const raw = String(value ?? "--");
  return translateOrFallback(t, `display.signal.${normalize(raw)}`, riskValueLabel(t, raw));
}

export function businessCopyLabel(_t: TFunction, value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  return raw || "--";
}

export function marketEventTitle(
  t: TFunction,
  event: { event_type?: string | null; title?: string | null; symbol?: string | null },
) {
  const key = eventKey(event.event_type, event.title);
  return translateOrFallback(t, `display.marketEventTitle.${key}`, eventTypeLabel(t, key), { symbol: event.symbol ?? "HTX" });
}

export function marketEventSummary(
  t: TFunction,
  event: { event_type?: string | null; title?: string | null; summary?: string | null; symbol?: string | null },
) {
  const key = eventKey(event.event_type, event.title);
  return translateOrFallback(t, `display.marketEventSummary.${key}`, event.summary ?? eventTypeLabel(t, key), { symbol: event.symbol ?? "HTX" });
}

export function auditStepTitle(t: TFunction, stepKey: string | null | undefined, fallback?: string | null) {
  const key = normalize(stepKey);
  return translateOrFallback(t, `display.auditStepTitle.${key}`, fallback ?? statusLabel(t, key));
}

export function auditStepSummary(
  t: TFunction,
  event: { step_key?: string | null; entity_type?: string | null; status?: string | null; summary?: string | null },
) {
  const key = normalize(event.step_key);
  return translateOrFallback(t, `display.auditStepSummary.${key}`, event.summary ?? statusLabel(t, event.status), {
    entity: entityTypeLabel(t, event.entity_type),
    status: statusLabel(t, event.status),
  });
}

export function evidenceTitle(
  t: TFunction,
  evidence: { evidence_type?: string | null; entity_type?: string | null; title?: string | null },
) {
  const titleKey = normalize(evidence.title);
  const entityKey = normalize(evidence.entity_type);
  return translateOrFallback(
    t,
    `display.evidenceTitle.${titleKey}`,
    translateOrFallback(t, `display.evidenceTitle.${entityKey}`, evidence.title ?? entityTypeLabel(t, evidence.entity_type)),
  );
}

export function evidenceSummary(
  t: TFunction,
  evidence: { evidence_type?: string | null; entity_type?: string | null; summary?: string | null },
) {
  const entityKey = normalize(evidence.entity_type);
  return translateOrFallback(t, `display.evidenceSummary.${entityKey}`, evidence.summary ?? entityTypeLabel(t, evidence.entity_type), {
    entity: entityTypeLabel(t, evidence.entity_type),
  });
}

export function paperLogMessage(
  t: TFunction,
  log: { event_type?: string | null; status?: string | null; message?: string | null },
) {
  const key = normalize(log.event_type);
  return translateOrFallback(t, `display.paperLogMessage.${key}`, log.message ?? statusLabel(t, log.status), {
    status: statusLabel(t, log.status),
  });
}

export function actionLogMessage(
  t: TFunction,
  log: { action_type?: string | null; entity_type?: string | null; status?: string | null; message?: string | null },
) {
  const key = normalize(log.action_type);
  return translateOrFallback(t, `display.actionLogMessage.${key}`, log.message ?? actionTypeLabel(t, log.action_type), {
    action: actionTypeLabel(t, log.action_type),
    entity: entityTypeLabel(t, log.entity_type),
    status: statusLabel(t, log.status),
  });
}

export function agentDisplayText(
  _t: TFunction,
  _language: string,
  _field: "summary" | "trigger" | "invalidation" | "risk" | "backtest_rule" | "suggested_action" | "current_task" | "output_mode" | "confidence_calibration",
  value: string | null | undefined,
  _context?: { symbol?: string | null; direction?: string | null; type?: string | null; status?: string | null },
) {
  const raw = String(value ?? "").trim();
  return raw || "--";
}
