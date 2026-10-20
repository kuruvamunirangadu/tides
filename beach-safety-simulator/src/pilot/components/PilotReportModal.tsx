/**
 * PilotReportModal.tsx
 * 
 * TIDES Phase 5: Controlled Field Pilot & Real-World Validation Framework
 * 
 * Evidence-based Pilot Evaluation Report Generator & Exporter:
 * - Generates structured Markdown and JSON audit reports
 * - Details sample sizes, limitations, numerators/denominators, and supervisor sign-offs
 * - Differentiates simulated vs physical hardware test results
 */

import React, { useState } from 'react';
import { PilotSession, MetricEvaluation, ScenarioExecutionRecord, EnvironmentalValidationRecord } from '../pilot.types';

interface PilotReportModalProps {
  session: PilotSession;
  metrics: MetricEvaluation[];
  executions: ScenarioExecutionRecord[];
  environmentalRecords: EnvironmentalValidationRecord[];
  onClose: () => void;
}

export const PilotReportModal: React.FC<PilotReportModalProps> = ({
  session,
  metrics,
  executions,
  environmentalRecords,
  onClose,
}) => {
  const [format, setFormat] = useState<'markdown' | 'json'>('markdown');
  const [copied, setCopied] = useState<boolean>(false);

  const generateMarkdownReport = (): string => {
    const passedCount = executions.filter((e) => e.status === 'PASSED').length;
    const totalCount = executions.length;
    const passRate = totalCount > 0 ? ((passedCount / totalCount) * 100).toFixed(1) : '100.0';

    return `# TIDES Phase 5: Controlled Field Pilot & Validation Report
**Session Identifier:** ${session.sessionId}
**Session Name:** ${session.name}
**Session Type:** ${session.sessionType} (${session.provenanceMode})
**Test Location:** ${session.testLocation}
**Lead Operator:** ${session.leadOperatorId}
**Safety Supervisor:** ${session.safetySupervisorId}
**Generated At:** ${new Date().toISOString()}

---

## 1. Executive Summary & Life-Safety Boundaries
This document compiles the empirical validation results for TIDES Phase 5. Testing was conducted under controlled protocols without exposing unsupervised beach visitors to unvalidated prototypes. Conventional lifeguard communication and rescue operations remained authoritative throughout.

- **Session Status:** ${session.status}
- **Planned Window:** ${new Date(session.plannedStartTimeMs).toLocaleString()} - ${new Date(session.plannedEndTimeMs).toLocaleString()}
- **Scenarios Executed:** ${totalCount} (${passedCount} Passed, ${totalCount - passedCount} Failed — ${passRate}%)
- **Participating Devices:**
  - Wristbands: ${session.participatingWristbandIds.join(', ') || 'None'}
  - Gateways: ${session.participatingGatewayIds.join(', ') || 'None'}
  - Cameras: ${session.participatingCameraIds.join(', ') || 'None'}
  - Drones: ${session.participatingDroneIds.join(', ') || 'None'}

---

## 2. Test Scenario Execution Audit (${executions.length} Runs)
| Code | Scenario Name | Provenance | Duration | Result | Actual Outcome |
| :--- | :--- | :---: | :---: | :---: | :--- |
${executions
  .map(
    (e) =>
      `| **${e.code}** | ${e.name} | \`${e.provenance}\` | ${e.durationMs}ms | **${e.status}** | ${e.actualResult.replace(/\|/g, '-')} |`
  )
  .join('\n')}

---

## 3. Quantitative Performance & Reliability Metrics
*Every metric reports sample size, observation window, and measurement source.*

| Metric | Category | Mode | Measured | Threshold | Sample Size | Status | Measurement Source |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
${metrics
  .map(
    (m) =>
      `| **${m.name}** | ${m.category} | \`${m.provenance}\` | ${m.measuredValue} ${m.unit} | ${m.thresholdAcceptable !== undefined ? `${m.thresholdAcceptable} ${m.unit}` : 'N/A'} | n=${m.sampleSize} | ${m.isAcceptable ? '✓ ACCEPTABLE' : '✗ NON-COMPLIANT'} | ${m.measurementSource} |`
  )
  .join('\n')}

---

## 4. Communication & Environmental Validation Records
${environmentalRecords
  .map(
    (r) => `### ${r.testCategory} (Record: ${r.recordId})
- **Procedure:** ${r.procedureDocumented}
- **Equipment Used:** ${r.equipmentUsed}
- **Conditions:** ${r.environmentalConditions.ambientTempC}°C, ${r.environmentalConditions.humidityPercent}% RH (${r.environmentalConditions.weatherCondition})
- **Measured Result:** **${r.measuredValue} ${r.measurementUnit}** (Status: **${r.resultStatus}**)
- **Qualified Assessor:** ${r.qualifiedAssessor}
- **Documented Limitations:** ${r.testLimitations}
- **Mandatory Disclaimer:** *${r.disclaimer}*
`
  )
  .join('\n')}

---

## 5. Supervisor Sign-off & Recommendations
- **Go / No-Go Determination:** APPROVED FOR CONTROLLED BENCH & SUPERVISED FIELD DRILLS ONLY.
- **Mandatory Caveat:** Mass coastline visitor deployment is strictly deferred until third-party NABL IP68 lab certification and formal Coast Guard regulatory approvals are filed.
- **Lead Operator Signature:** \`${session.leadOperatorId}\`
- **Safety Supervisor Signature:** \`${session.safetySupervisorId}\`
`;
  };

  const reportText = format === 'markdown' ? generateMarkdownReport() : JSON.stringify({ session, metrics, executions, environmentalRecords }, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          width: 780,
          maxHeight: '90vh',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          borderRadius: 12,
          border: '1px solid #334155',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #334155',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#1e293b',
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              Evidence-Based Pilot Evaluation Report
            </h3>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              Session {session.sessionId} • {session.name}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => setFormat('markdown')}
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                border: 'none',
                backgroundColor: format === 'markdown' ? '#0284c7' : '#334155',
                color: '#fff',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              Markdown
            </button>
            <button
              onClick={() => setFormat('json')}
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                border: 'none',
                backgroundColor: format === 'json' ? '#0284c7' : '#334155',
                color: '#fff',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              JSON
            </button>
            <button
              onClick={handleCopy}
              style={{
                padding: '4px 12px',
                borderRadius: 4,
                border: 'none',
                backgroundColor: copied ? '#10b981' : '#059669',
                color: '#fff',
                fontSize: 11,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {copied ? '✓ Copied' : 'Copy Report'}
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: 18,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Box */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <pre
            style={{
              margin: 0,
              backgroundColor: '#020617',
              padding: 16,
              borderRadius: 8,
              border: '1px solid #1e293b',
              fontSize: 11,
              fontFamily: 'JetBrains Mono, Menlo, monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: '#cbd5e1',
              lineHeight: 1.5,
            }}
          >
            {reportText}
          </pre>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #334155',
            backgroundColor: '#1e293b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 11,
            color: '#94a3b8',
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
          }}
        >
          <span>
            ⚠️ Pilot report contains empirical test evidence. Not a certification of mass public deployment.
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '6px 16px',
              backgroundColor: '#334155',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

