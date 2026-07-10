import OpenAI from 'openai';
import { RawLeadRecord } from './parser';

export interface CrmLeadRecord {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: 'GOOD_LEAD_FOLLOW_UP' | 'DID_NOT_CONNECT' | 'BAD_LEAD' | 'SALE_DONE';
  crm_note: string;
  data_source: 'leads_on_demand' | 'meridian_tower' | 'eden_park' | 'varah_swamy' | 'sarjapur_plots' | '';
  possession_time: string;
  description: string;
}

export interface ProcessingResult {
  status: 'success' | 'skipped';
  skip_reason: string | null;
  data: Partial<CrmLeadRecord> & { original_row: number };
}

const ALLOWED_STATUSES = ['GOOD_LEAD_FOLLOW_UP', 'DID_NOT_CONNECT', 'BAD_LEAD', 'SALE_DONE'];
const ALLOWED_SOURCES = ['leads_on_demand', 'meridian_tower', 'eden_park', 'varah_swamy', 'sarjapur_plots'];

let openaiInstance: OpenAI | null = null;

function getOpenaiClient(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.GEN_AI;
    if (!apiKey) {
      console.warn('Warning: GEN_AI environment variable is not defined.');
    }
    openaiInstance = new OpenAI({
      apiKey: apiKey || '',
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }
  return openaiInstance;
}

function getModelName(): string {
  return process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
}
/**
 * Clean and validate a single mapped record based on rules.
 */
export function validateAndCleanRecord(
  data: any,
  originalRowNumber: number
): ProcessingResult {
  const email = (data.email || '').trim();
  const mobile = (data.mobile_without_country_code || '').toString().trim();

  // Rule: Skip if neither email nor mobile number exists
  if (!email && !mobile) {
    return {
      status: 'skipped',
      skip_reason: 'Missing both email and mobile number',
      data: { original_row: originalRowNumber, name: data.name },
    };
  }

  // Validate date format
  let createdAt = data.created_at || '';
  if (createdAt) {
    const parsedDate = new Date(createdAt);
    if (isNaN(parsedDate.getTime())) {
      // Fallback if AI produced invalid date format, use current date
      createdAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
    } else {
      // Ensure it is in YYYY-MM-DD HH:mm:ss format or standard ISO
      createdAt = parsedDate.toISOString().replace('T', ' ').substring(0, 19);
    }
  } else {
    createdAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
  }

  // Validate CRM status
  let status = data.crm_status;
  if (!ALLOWED_STATUSES.includes(status)) {
    // If AI failed or matched incorrectly, default based on common patterns or BAD_LEAD
    status = 'GOOD_LEAD_FOLLOW_UP';
  }

  // Validate Data Source
  let source = data.data_source || '';
  if (source && !ALLOWED_SOURCES.includes(source)) {
    source = ''; // If none match confidently, leave blank
  }

  // Handle multiple emails/mobiles if we find them inside the primary fields
  let note = data.crm_note || '';
  let finalEmail = email;
  let finalMobile = mobile;

  // If email field has multiple emails (comma separated, etc.)
  if (email.includes(',')) {
    const emails = email.split(',').map((e: string) => e.trim());
    finalEmail = emails[0];
    const extraEmails = emails.slice(1).join(', ');
    note = note ? `${note} | Extra emails: ${extraEmails}` : `Extra emails: ${extraEmails}`;
  }

  // If mobile field has multiple numbers
  if (mobile.includes(',')) {
    const numbers = mobile.split(',').map((n: string) => n.trim());
    finalMobile = numbers[0];
    const extraMobiles = numbers.slice(1).join(', ');
    note = note ? `${note} | Extra mobiles: ${extraMobiles}` : `Extra mobiles: ${extraMobiles}`;
  }

  return {
    status: 'success',
    skip_reason: null,
    data: {
      original_row: originalRowNumber,
      created_at: createdAt,
      name: data.name || '',
      email: finalEmail,
      country_code: data.country_code || '',
      mobile_without_country_code: finalMobile,
      company: data.company || '',
      city: data.city || '',
      state: data.state || '',
      country: data.country || '',
      lead_owner: data.lead_owner || '',
      crm_status: status,
      crm_note: note,
      data_source: source,
      possession_time: data.possession_time || '',
      description: data.description || '',
    },
  };
}

/**
 * Call LLM helper with retry capability.
 */
async function callLlmWithRetry(
  prompt: string,
  systemPrompt: string,
  retries = 3,
  delay = 1000
): Promise<string> {
  let attempt = 1;
  while (attempt <= retries) {
    try {
      const response = await getOpenaiClient().chat.completions.create({
        model: getModelName(),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1, // Low temperature for high deterministic schema mapping
        response_format: { type: 'json_object' }, // Enforce JSON response
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from LLM');
      }
      return content;
    } catch (error: any) {
      console.error(`AI batch mapping error (attempt ${attempt}/${retries}):`, error.message);
      if (attempt === retries) {
        throw error;
      }
      // Wait with backoff
      await new Promise((resolve) => setTimeout(resolve, delay * attempt));
      attempt++;
    }
  }
  throw new Error('All LLM retries failed');
}

/**
 * Maps a batch of raw records into the target CRM format.
 */
export async function mapBatchWithAi(
  batch: { rowNumber: number; data: RawLeadRecord }[]
): Promise<ProcessingResult[]> {
  const systemPrompt = `You are an expert CRM Lead Data Engineer. Your task is to intelligently parse, normalize, and map an array of raw CSV-extracted records into the GrowEasy CRM schema.

The target CRM schema fields are:
- created_at: Lead creation date. Must be a date string convertible by JS "new Date(created_at)".
- name: Full name of the lead.
- email: Primary email. If multiple emails exist in the record, use the first one, and append the remaining emails to "crm_note".
- country_code: Country phone code (e.g. "+91", "+1").
- mobile_without_country_code: Mobile number without country code. If multiple phone numbers exist in the record, use the first, and append the remaining to "crm_note".
- company: Company name.
- city: City.
- state: State.
- country: Country.
- lead_owner: Lead owner email or name.
- crm_status: Strictly choose one of: "GOOD_LEAD_FOLLOW_UP", "DID_NOT_CONNECT", "BAD_LEAD", "SALE_DONE".
- crm_note: General notes, remarks, extra phone numbers, extra emails, or any info that doesn't fit another field.
- data_source: Strictly choose one of: "leads_on_demand", "meridian_tower", "eden_park", "varah_swamy", "sarjapur_plots" (or set to empty string "" if none match confidently).
- possession_time: Possession timeline info (if any).
- description: Additional descriptions.

Rules for Extraction:
1. "crm_status" mapping: Map raw lead status, interest levels, or notes into one of the four allowed values.
2. "data_source" mapping: Match the input data context (e.g. project name, location context, campaign tags) to one of the five allowed sources. If no confident match, use "".
3. Multiple values: If you detect multiple emails or phone numbers, follow the extraction rules (first in the field, rest in "crm_note").
4. CSV Row Integrity: Ensure all fields remain clean strings, escaping any internal line breaks as "\\n".
5. Skipped logic: If a record contains NEITHER an email NOR a mobile number, mark its status as "skipped" and provide a "skip_reason".

Your output MUST be a JSON object with a single root key "results" containing an array of objects.
Each object in the "results" array must match this schema:
{
  "rowNumber": number (the corresponding rowNumber from the input),
  "status": "success" | "skipped",
  "skip_reason": string or null,
  "data": {
    // mapped CRM fields matching the schema. Use null or empty string for missing fields.
  }
}
Always return a valid JSON object. Do not include markdown code block syntax outside of JSON.`;

  const inputJson = JSON.stringify(batch, null, 2);

  try {
    const rawResponse = await callLlmWithRetry(inputJson, systemPrompt);
    const parsedResponse = JSON.parse(rawResponse);

    if (!parsedResponse.results || !Array.isArray(parsedResponse.results)) {
      throw new Error('Invalid response structure: expected results array');
    }

    const processedResults: ProcessingResult[] = [];

    // Map and validate each result
    for (const item of parsedResponse.results) {
      const matchInput = batch.find((b) => b.rowNumber === item.rowNumber);
      const rowNumber = item.rowNumber || (matchInput ? matchInput.rowNumber : 0);

      if (item.status === 'skipped') {
        processedResults.push({
          status: 'skipped',
          skip_reason: item.skip_reason || 'AI skipped record',
          data: { original_row: rowNumber, name: item.data?.name || '' },
        });
      } else {
        // Run code-level validation as a backup guardrail
        const validated = validateAndCleanRecord(item.data, rowNumber);
        processedResults.push(validated);
      }
    }

    return processedResults;
  } catch (error: any) {
    console.error('Failed to map batch with AI:', error.message);
    // If the LLM call failed completely, fallback to skipping all records in this batch or throwing
    // We throw so the calling routes can handle retrying or report errors
    throw error;
  }
}
