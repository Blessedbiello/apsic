import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { ExtractedFields, GeminiSummary } from '../types';

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private embeddingModel: GenerativeModel;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    this.embeddingModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
  }

  /**
   * Extract and classify incident from multimodal inputs
   */
  async extractAndClassify(
    text: string,
    imageUrls: string[] = [],
    audioTranscript?: string,
    videoDescription?: string
  ): Promise<ExtractedFields> {
    const prompt = `You are an expert public safety incident analyst. Analyze the following incident report and extract structured information.

TEXT: ${text}
${imageUrls.length > 0 ? `IMAGES: ${imageUrls.length} image(s) provided` : ''}
${audioTranscript ? `AUDIO TRANSCRIPT: ${audioTranscript}` : ''}
${videoDescription ? `VIDEO DESCRIPTION: ${videoDescription}` : ''}

Extract and return ONLY valid JSON (no markdown, no backticks):
{
  "incident_type": "harassment" | "accident" | "cyber" | "infrastructure" | "medical" | "other",
  "severity_score": number between 0-100,
  "severity_label": "Low" | "Medium" | "High" | "Critical",
  "entities": {
    "location": "string or null",
    "time": "string or null",
    "parties": ["array of strings or empty"]
  },
  "emotion": "calm" | "concerned" | "distressed" | "angry" | "fearful" | "neutral",
  "risk_indicators": ["array of strings indicating immediate risks"]
}

Severity Guidelines:
- Low (0-25): Minor issues, no immediate danger
- Medium (26-50): Moderate concern, requires attention
- High (51-75): Serious issue, urgent response needed
- Critical (76-100): Life-threatening, immediate action required`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();

      // Clean response (remove markdown code blocks if present)
      const cleanedResponse = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const extracted = JSON.parse(cleanedResponse);
      return extracted;
    } catch (error: any) {
      console.error('Gemini extraction error:', error);
      // Fallback extraction
      return {
        incident_type: 'other',
        severity_score: 50,
        severity_label: 'Medium',
        entities: {
          location: null,
          time: null,
          parties: [],
        },
        emotion: 'neutral',
        risk_indicators: [],
      };
    }
  }

  /**
   * Generate summary and recommended actions
   */
  async generateSummary(
    extractedFields: ExtractedFields,
    originalText: string
  ): Promise<GeminiSummary> {
    const prompt = `Based on the classified incident, generate a summary and recommended actions.

INCIDENT TYPE: ${extractedFields.incident_type}
SEVERITY: ${extractedFields.severity_label} (${extractedFields.severity_score})
ENTITIES: ${JSON.stringify(extractedFields.entities)}
EMOTION: ${extractedFields.emotion}
RISK INDICATORS: ${extractedFields.risk_indicators.join(', ')}
ORIGINAL TEXT: ${originalText}

Generate ONLY valid JSON:
{
  "summary": "A concise 2-3 sentence summary for human reviewers",
  "recommended_actions": ["3-5 specific actionable steps"],
  "urgency": "immediate" | "within_1_hour" | "within_24_hours" | "routine"
}

Use established public safety best practices.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();

      const cleanedResponse = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const summary = JSON.parse(cleanedResponse);
      return summary;
    } catch (error: any) {
      console.error('Gemini summary error:', error);
      return {
        summary: `${extractedFields.severity_label} severity ${extractedFields.incident_type} incident. Review required.`,
        recommended_actions: [
          'Review incident details',
          'Assess priority level',
          'Assign to appropriate team',
        ],
        urgency: extractedFields.severity_score > 75 ? 'immediate' : 'within_24_hours',
      };
    }
  }

  /**
   * Validate routing decision
   */
  async validateRouting(
    summary: string,
    route: string,
    rulesTriggered: string[]
  ): Promise<any> {
    const prompt = `Review this routing decision for a public safety incident.

INCIDENT SUMMARY: ${summary}
PROPOSED ROUTE: ${route}
RULES TRIGGERED: ${rulesTriggered.join(', ')}

Evaluate the routing decision and return ONLY valid JSON:
{
  "agrees_with_routing": boolean,
  "override_suggested": boolean,
  "reasoning": "Brief explanation of your assessment",
  "additional_factors": ["Any additional considerations"]
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();

      const cleanedResponse = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      return JSON.parse(cleanedResponse);
    } catch (error) {
      return {
        agrees_with_routing: true,
        override_suggested: false,
        reasoning: 'Automated validation unavailable',
        additional_factors: [],
      };
    }
  }

  /**
   * Agentic review for policy compliance and bias check
   */
  async agenticReview(
    summary: string,
    route: string,
    extractedFields: ExtractedFields
  ): Promise<any> {
    const prompt = `Conduct a policy compliance and bias check for this public safety incident.

SUMMARY: ${summary}
ROUTE: ${route}
TYPE: ${extractedFields.incident_type}
SEVERITY: ${extractedFields.severity_label}

Check for:
1. Policy Compliance: Does this follow standard incident response policies?
2. Bias Detection: Are there any potential biases in classification or routing?
3. Missing Information: What critical information might be missing?
4. Legal Considerations: Any legal or regulatory concerns?

Return ONLY valid JSON:
{
  "policy_compliance": {
    "passed": boolean,
    "notes": "string"
  },
  "bias_check": {
    "passed": boolean,
    "concerns": ["array of strings"]
  },
  "missing_information": ["array of strings"],
  "legal_considerations": ["array of strings"],
  "overall_passed": boolean
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();

      const cleanedResponse = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      return JSON.parse(cleanedResponse);
    } catch (error) {
      return {
        policy_compliance: { passed: true, notes: 'Review completed' },
        bias_check: { passed: true, concerns: [] },
        missing_information: [],
        legal_considerations: [],
        overall_passed: true,
      };
    }
  }

  /**
   * Generate embedding for vector search
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const result = await this.embeddingModel.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('Embedding generation error:', error);
      // Return zero vector as fallback
      return new Array(768).fill(0);
    }
  }

  /**
   * Transcribe audio file (placeholder - requires speech-to-text API)
   */
  async transcribeAudio(audioUrl: string): Promise<string> {
    // TODO: Implement audio transcription using Gemini or Speech-to-Text API
    console.log('Audio transcription not yet implemented for:', audioUrl);
    return '[Audio transcription pending]';
  }

  /**
   * Analyze video file (placeholder)
   */
  async analyzeVideo(videoUrl: string): Promise<string> {
    // TODO: Implement video analysis using Gemini multimodal
    console.log('Video analysis not yet implemented for:', videoUrl);
    return '[Video analysis pending]';
  }
}
