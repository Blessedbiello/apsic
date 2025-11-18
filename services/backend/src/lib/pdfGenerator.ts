import puppeteer from 'puppeteer';
import { AuditLogData } from '../types';

export class PDFGenerator {
  /**
   * Generate PDF audit report from audit log data
   */
  async generateAuditPDF(auditLog: AuditLogData): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();

      // Generate HTML content
      const html = this.generateHTML(auditLog);

      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Generate PDF
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
      });

      return pdf;
    } finally {
      await browser.close();
    }
  }

  /**
   * Generate HTML for PDF
   */
  private generateHTML(auditLog: AuditLogData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>APSIC Audit Report - ${auditLog.incident_id}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
      background: white;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      margin-bottom: 30px;
    }

    .header h1 {
      font-size: 24pt;
      margin-bottom: 10px;
    }

    .header .meta {
      font-size: 10pt;
      opacity: 0.9;
    }

    .section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }

    .section-title {
      font-size: 16pt;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 2px solid #667eea;
    }

    .subsection {
      margin-bottom: 15px;
    }

    .subsection-title {
      font-size: 12pt;
      font-weight: 600;
      color: #555;
      margin-bottom: 8px;
    }

    .field {
      margin-bottom: 8px;
    }

    .field-label {
      font-weight: 600;
      color: #666;
      display: inline-block;
      min-width: 150px;
    }

    .field-value {
      color: #333;
    }

    .severity-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 10pt;
    }

    .severity-low { background: #d4edda; color: #155724; }
    .severity-medium { background: #fff3cd; color: #856404; }
    .severity-high { background: #f8d7da; color: #721c24; }
    .severity-critical { background: #dc3545; color: white; }

    .list {
      list-style: none;
      padding-left: 0;
    }

    .list li {
      padding: 6px 0 6px 20px;
      position: relative;
    }

    .list li:before {
      content: "•";
      position: absolute;
      left: 0;
      color: #667eea;
      font-weight: bold;
    }

    .timeline {
      border-left: 3px solid #667eea;
      padding-left: 20px;
      margin-left: 10px;
    }

    .timeline-item {
      margin-bottom: 15px;
      position: relative;
    }

    .timeline-item:before {
      content: "";
      position: absolute;
      left: -26px;
      top: 5px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #667eea;
      border: 3px solid white;
    }

    .timeline-time {
      font-size: 9pt;
      color: #888;
      font-weight: 600;
    }

    .similar-incident {
      background: #f8f9fa;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 10px;
      border-left: 4px solid #667eea;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 9pt;
      color: #666;
      text-align: center;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
    }

    th, td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }

    th {
      background: #f8f9fa;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🛡️ APSIC Audit Report</h1>
    <div class="meta">
      <div>Incident ID: ${auditLog.incident_id}</div>
      <div>Generated: ${new Date(auditLog.timestamp).toLocaleString()}</div>
      <div>Version: ${auditLog.version}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">📥 Incident Input</div>
    <div class="field">
      <span class="field-label">Reporter Wallet:</span>
      <span class="field-value"><code>${auditLog.input.reporter_wallet}</code></span>
    </div>
    <div class="field">
      <span class="field-label">Submitted:</span>
      <span class="field-value">${new Date(auditLog.input.submission_timestamp).toLocaleString()}</span>
    </div>
    <div class="subsection">
      <div class="subsection-title">Incident Description:</div>
      <p>${auditLog.input.text}</p>
    </div>
    ${auditLog.input.media_urls.length > 0 ? `
    <div class="subsection">
      <div class="subsection-title">Media Attachments:</div>
      <ul class="list">
        ${auditLog.input.media_urls.map((url: string) => `<li>${url}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
  </div>

  <div class="section">
    <div class="section-title">🎯 Analysis Results</div>
    <div class="field">
      <span class="field-label">Incident Type:</span>
      <span class="field-value">${auditLog.processing_pipeline.understand.gemini_extraction.incident_type}</span>
    </div>
    <div class="field">
      <span class="field-label">Severity:</span>
      <span class="severity-badge severity-${auditLog.final_decision.severity.toLowerCase()}">
        ${auditLog.final_decision.severity} (${auditLog.processing_pipeline.understand.gemini_extraction.severity_score}/100)
      </span>
    </div>
    <div class="field">
      <span class="field-label">Urgency:</span>
      <span class="field-value">${auditLog.processing_pipeline.understand.gemini_summary.urgency}</span>
    </div>
    <div class="subsection">
      <div class="subsection-title">AI Summary:</div>
      <p>${auditLog.processing_pipeline.understand.gemini_summary.summary}</p>
    </div>
    <div class="subsection">
      <div class="subsection-title">Recommended Actions:</div>
      <ul class="list">
        ${auditLog.final_decision.recommended_actions.map((action: string) => `<li>${action}</li>`).join('')}
      </ul>
    </div>
  </div>

  <div class="section">
    <div class="section-title">🔄 Processing Pipeline</div>
    <div class="timeline">
      <div class="timeline-item">
        <div class="timeline-time">${new Date(auditLog.processing_pipeline.intake.timestamp).toLocaleTimeString()}</div>
        <div><strong>Intake Stage</strong> - Data normalized and validated</div>
      </div>
      <div class="timeline-item">
        <div class="timeline-time">${new Date(auditLog.processing_pipeline.understand.timestamp).toLocaleTimeString()}</div>
        <div><strong>Understanding Stage</strong> - Gemini multimodal analysis completed</div>
      </div>
      <div class="timeline-item">
        <div class="timeline-time">${new Date(auditLog.processing_pipeline.decide.timestamp).toLocaleTimeString()}</div>
        <div><strong>Decision Stage</strong> - Routing decision: ${auditLog.final_decision.route}</div>
        <div style="font-size: 9pt; color: #666; margin-top: 4px;">
          Rules triggered: ${auditLog.processing_pipeline.decide.rules_triggered.join(', ')}
        </div>
      </div>
      <div class="timeline-item">
        <div class="timeline-time">${new Date(auditLog.processing_pipeline.review.timestamp).toLocaleTimeString()}</div>
        <div><strong>Review Stage</strong> - Quality assurance completed</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">✅ Review & Compliance</div>
    <div class="field">
      <span class="field-label">Policy Compliance:</span>
      <span class="field-value">${auditLog.processing_pipeline.review.agentic_review.policy_compliance.passed ? '✅ Passed' : '❌ Failed'}</span>
    </div>
    <div class="field">
      <span class="field-label">Bias Check:</span>
      <span class="field-value">${auditLog.processing_pipeline.review.agentic_review.bias_check.passed ? '✅ Passed' : '❌ Failed'}</span>
    </div>
    ${auditLog.processing_pipeline.review.agentic_review.legal_considerations.length > 0 ? `
    <div class="subsection">
      <div class="subsection-title">⚖️ Legal Considerations:</div>
      <ul class="list">
        ${auditLog.processing_pipeline.review.agentic_review.legal_considerations.map((item: string) => `<li>${item}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
  </div>

  ${auditLog.similar_incidents.length > 0 ? `
  <div class="section">
    <div class="section-title">🔍 Similar Historical Incidents</div>
    ${auditLog.similar_incidents.map((incident: any) => `
      <div class="similar-incident">
        <div><strong>Incident ${incident.incident_id}</strong> (${(incident.similarity_score * 100).toFixed(1)}% similarity)</div>
        <div style="font-size: 10pt; color: #666; margin-top: 4px;">
          ${incident.severity_label} severity • ${new Date(incident.timestamp).toLocaleDateString()}
        </div>
        <div style="margin-top: 6px;">${incident.summary}</div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">📊 Metadata</div>
    <table>
      <tr>
        <th>Field</th>
        <th>Value</th>
      </tr>
      <tr>
        <td>Processing Time</td>
        <td>${auditLog.processing_time_ms}ms</td>
      </tr>
      <tr>
        <td>Credits Used</td>
        <td>${auditLog.credits_used}</td>
      </tr>
      <tr>
        <td>Assigned To</td>
        <td>${auditLog.final_decision.assigned_to}</td>
      </tr>
      <tr>
        <td>Priority Tier</td>
        <td>${auditLog.final_decision.priority}</td>
      </tr>
    </table>
  </div>

  <div class="footer">
    <div><strong>APSIC - AI Public Safety Intake Commander</strong></div>
    <div>Powered by Gemini • Opus • Qdrant • Solana</div>
    <div style="margin-top: 10px; font-size: 8pt;">
      This audit report is cryptographically verifiable and immutable.
    </div>
  </div>
</body>
</html>
    `;
  }
}
