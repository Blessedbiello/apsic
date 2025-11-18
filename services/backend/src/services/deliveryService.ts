import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import { Incident } from '../types';

export class DeliveryService {
  private sheetsClient?: any;
  private emailTransporter?: nodemailer.Transporter;

  constructor() {
    this.initializeServices();
  }

  /**
   * Initialize Google Sheets and Email services
   */
  private async initializeServices() {
    // Google Sheets
    if (process.env.GOOGLE_SHEETS_CREDENTIALS) {
      try {
        const auth = new google.auth.GoogleAuth({
          credentials: JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS),
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        this.sheetsClient = google.sheets({ version: 'v4', auth });
        console.log('✅ Google Sheets client initialized');
      } catch (error) {
        console.log('⚠️ Google Sheets not configured (optional)');
      }
    }

    // Email (Nodemailer)
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      try {
        this.emailTransporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        console.log('✅ Email transporter initialized');
      } catch (error) {
        console.log('⚠️ Email not configured (optional)');
      }
    }
  }

  /**
   * Export incident to Google Sheets
   */
  async exportToSheets(incident: any, spreadsheetId?: string): Promise<boolean> {
    if (!this.sheetsClient) {
      console.log('⚠️ Sheets export skipped - not configured');
      return false;
    }

    const sheetId = spreadsheetId || process.env.GOOGLE_SHEETS_ID;

    if (!sheetId) {
      console.log('⚠️ No spreadsheet ID provided');
      return false;
    }

    try {
      await this.sheetsClient.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'Incidents!A:H',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            [
              incident.id,
              incident.severity_label || 'Unknown',
              incident.severity_score || 0,
              incident.route || 'Unknown',
              incident.summary || incident.text.substring(0, 100),
              incident.incident_type || 'other',
              new Date(incident.created_at).toISOString(),
              incident.status,
            ],
          ],
        },
      });

      console.log(`✅ Exported incident ${incident.id} to Google Sheets`);
      return true;
    } catch (error: any) {
      console.error('Sheets export error:', error.message);
      return false;
    }
  }

  /**
   * Export batch results to Google Sheets
   */
  async exportBatchToSheets(
    incidents: any[],
    spreadsheetId?: string
  ): Promise<{ success: number; failed: number }> {
    if (!this.sheetsClient) {
      return { success: 0, failed: 0 };
    }

    const sheetId = spreadsheetId || process.env.GOOGLE_SHEETS_ID;

    if (!sheetId) {
      return { success: 0, failed: 0 };
    }

    try {
      const rows = incidents.map((inc) => [
        inc.id,
        inc.severity_label || 'Unknown',
        inc.severity_score || 0,
        inc.route || 'Unknown',
        inc.summary || inc.text?.substring(0, 100) || '',
        inc.incident_type || 'other',
        new Date(inc.created_at).toISOString(),
        inc.status,
      ]);

      await this.sheetsClient.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'Incidents!A:H',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: rows,
        },
      });

      console.log(`✅ Exported ${incidents.length} incidents to Google Sheets`);
      return { success: incidents.length, failed: 0 };
    } catch (error: any) {
      console.error('Batch sheets export error:', error.message);
      return { success: 0, failed: incidents.length };
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(incident: any, recipients: string[]): Promise<boolean> {
    if (!this.emailTransporter) {
      console.log('⚠️ Email notification skipped - not configured');
      return false;
    }

    try {
      const emailHtml = this.generateEmailHTML(incident);

      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || 'APSIC <noreply@apsic.app>',
        to: recipients.join(', '),
        subject: `🚨 ${incident.severity_label} Severity Incident - ${incident.id}`,
        html: emailHtml,
      });

      console.log(`✅ Email sent for incident ${incident.id} to ${recipients.length} recipients`);
      return true;
    } catch (error: any) {
      console.error('Email send error:', error.message);
      return false;
    }
  }

  /**
   * Generate email HTML template
   */
  private generateEmailHTML(incident: any): string {
    const severityColor =
      incident.severity_label === 'Critical'
        ? '#dc2626'
        : incident.severity_label === 'High'
        ? '#ea580c'
        : incident.severity_label === 'Medium'
        ? '#ca8a04'
        : '#16a34a';

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .severity-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; color: white; background: ${severityColor}; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
    .section { margin-bottom: 25px; }
    .label { font-weight: 600; color: #666; font-size: 14px; }
    .value { color: #111; font-size: 16px; margin-top: 5px; }
    .actions { background: #f9fafb; padding: 15px; border-radius: 8px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ APSIC Incident Alert</h1>
      <p>Incident ID: ${incident.id}</p>
    </div>

    <div class="content">
      <div class="section">
        <span class="severity-badge">${incident.severity_label || 'Unknown'} Severity</span>
        <p style="margin-top: 10px; color: #666;">Score: ${incident.severity_score || 0}/100</p>
      </div>

      <div class="section">
        <div class="label">Type</div>
        <div class="value">${incident.incident_type || 'Unknown'}</div>
      </div>

      <div class="section">
        <div class="label">Route Decision</div>
        <div class="value">${incident.route || 'Pending'}</div>
      </div>

      <div class="section">
        <div class="label">Summary</div>
        <div class="value">${incident.summary || incident.text?.substring(0, 200) || 'N/A'}</div>
      </div>

      ${
        incident.recommended_actions && incident.recommended_actions.length > 0
          ? `
      <div class="section">
        <div class="label">Recommended Actions</div>
        <div class="actions">
          <ul style="margin: 10px 0; padding-left: 20px;">
            ${incident.recommended_actions.map((action: string) => `<li>${action}</li>`).join('')}
          </ul>
        </div>
      </div>
      `
          : ''
      }

      <div class="section">
        <div class="label">Submitted</div>
        <div class="value">${new Date(incident.created_at).toLocaleString()}</div>
      </div>
    </div>

    <div class="footer">
      <p>This is an automated notification from APSIC</p>
      <p>AI Public Safety Intake Commander</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Deliver incident results via all configured channels
   */
  async deliverIncidentResults(incident: any, options: {
    sendEmail?: boolean;
    emailRecipients?: string[];
    exportToSheets?: boolean;
    spreadsheetId?: string;
  } = {}): Promise<{
    email: boolean;
    sheets: boolean;
  }> {
    const results = {
      email: false,
      sheets: false,
    };

    // Email notification
    if (options.sendEmail && options.emailRecipients && options.emailRecipients.length > 0) {
      results.email = await this.sendEmailNotification(incident, options.emailRecipients);
    }

    // Google Sheets export
    if (options.exportToSheets) {
      results.sheets = await this.exportToSheets(incident, options.spreadsheetId);
    }

    return results;
  }
}
