import type { Feather } from '@expo/vector-icons';

import API from '@/services/api';

/**
 * AI Tools — mirrors the 5 web pages under /ai/* (pages/AI*.jsx). Every tool
 * sends one prompt to the existing backend endpoint:
 *   POST /ai/chat  { prompt }  -> { success, answer, usage }
 *                              -> 400 { success:false, message } (empty prompt)
 *                              -> 500 { success:false, message } (key missing / model error)
 * Prompts, option lists, defaults and validation messages are copied verbatim
 * from the web pages so both clients get the same output. Lead/client insights
 * live in services/leads.ts and services/clients.ts (/ai/lead-insight,
 * /ai/client-insight) and are not duplicated here.
 */

type FeatherName = keyof typeof Feather.glyphMap;

export async function aiChat(prompt: string): Promise<string> {
  const { data } = await API.post('/ai/chat', { prompt });
  // Same guard as the web pages: a 200 without success is still a failure.
  if (!data?.success) throw new Error(data?.message || 'Request failed');
  return String(data.answer || '');
}

export interface AIToolField {
  key: string;
  label: string;
  /** 'select' renders chip options; 'text' / 'multiline' render a text input. */
  kind: 'select' | 'text' | 'multiline';
  options?: readonly string[];
  default?: string;
  placeholder?: string;
}

export interface SEOResult {
  seoScore?: number;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  urlSlug?: string;
  faqs?: { question: string; answer: string }[];
}

export interface AITool {
  key: AIToolKey;
  title: string;
  description: string;
  icon: FeatherName;
  tint: string;
  color: string;
  fields: AIToolField[];
  /** Required text fields + the web toast shown when any is empty. */
  required: string[];
  requiredMessage: string;
  buildPrompt: (v: Record<string, string>) => string;
  /** 'text' shows the answer as-is; 'seo' parses the JSON answer into cards. */
  output: 'text' | 'seo';
}

export type AIToolKey =
  | 'content-generator'
  | 'seo-tool'
  | 'email-generator'
  | 'customer-communication'
  | 'sales-recommendations';

/* ---------- Content Generator (AIContentGenerator.jsx) ---------- */
const CONTENT_TYPES = ['Blog', 'LinkedIn Post', 'Instagram Caption', 'Email', 'Product Description'] as const;
const CONTENT_TONES = ['Professional', 'Friendly', 'Persuasive', 'Casual', 'Enthusiastic', 'Formal'] as const;

/* ---------- Email Generator (AIEmailGenerator.jsx) ---------- */
const EMAIL_TYPES = ['Sales Email', 'Follow-up Email', 'Proposal Email', 'Meeting Request', 'Thank You Email'] as const;
const EMAIL_TONES = ['Professional', 'Friendly', 'Persuasive', 'Formal', 'Concise'] as const;

/* ---------- Customer Communication (AICustomerCommunication.jsx) ---------- */
const CHANNELS = [
  'WhatsApp Message',
  'SMS',
  'Customer Reply',
  'Payment Reminder',
  'Complaint Response',
  'Follow-up Message',
] as const;
const COMM_TONES = ['Professional', 'Friendly', 'Empathetic', 'Concise', 'Persuasive'] as const;

/* ---------- Sales Recommendations (AISalesRecommendations.jsx) ---------- */
const REC_TYPES = [
  'Upsell Suggestions',
  'Cross-sell Suggestions',
  'Next Best Product',
  'Revenue Opportunity Prediction',
  'Sales Insights',
] as const;

export const AI_TOOLS: AITool[] = [
  {
    key: 'content-generator',
    title: 'AI Content Generator',
    description: 'Generate on-brand copy for blogs, social, email and products in seconds.',
    icon: 'pen-tool',
    tint: 'bg-indigo-50',
    color: '#4f46e5',
    fields: [
      { key: 'type', label: 'Content Type', kind: 'select', options: CONTENT_TYPES, default: 'Blog' },
      {
        key: 'topic',
        label: 'Topic',
        kind: 'multiline',
        placeholder: 'e.g. Benefits of a cloud-based CRM for small businesses',
      },
      { key: 'tone', label: 'Tone', kind: 'select', options: CONTENT_TONES, default: 'Professional' },
    ],
    required: ['topic'],
    requiredMessage: 'Please enter a topic',
    buildPrompt: (v) =>
      `Write a ${v.tone.toLowerCase()} ${v.type} about "${v.topic}".
Return clean, well-structured content ready to publish. Use GitHub-flavored Markdown where helpful.`,
    output: 'text',
  },
  {
    key: 'seo-tool',
    title: 'AI SEO Tool',
    description: 'Generate meta tags, keywords, slugs and FAQs optimised for search.',
    icon: 'search',
    tint: 'bg-sky-50',
    color: '#0284c7',
    fields: [
      { key: 'title', label: 'Page / Product Title', kind: 'text', placeholder: 'e.g. Cloud CRM for Small Business' },
      { key: 'keyword', label: 'Primary Keyword', kind: 'text', placeholder: 'e.g. small business CRM' },
    ],
    required: ['title', 'keyword'],
    requiredMessage: 'Enter both a title and a keyword',
    buildPrompt: (v) =>
      `You are an expert SEO strategist. For a page titled "${v.title}" targeting the primary keyword "${v.keyword}", return ONLY valid minified JSON (no markdown, no commentary) with this exact shape:
{"seoScore":<0-100 integer>,"metaTitle":"<=60 chars","metaDescription":"<=160 chars","keywords":["8-10 relevant keywords"],"urlSlug":"kebab-case-slug","faqs":[{"question":"...","answer":"..."}]}
Include 4-5 FAQs.`,
    output: 'seo',
  },
  {
    key: 'email-generator',
    title: 'AI Email Generator',
    description: 'Draft sales, follow-up, proposal and thank-you emails in seconds.',
    icon: 'mail',
    tint: 'bg-violet-50',
    color: '#7c3aed',
    fields: [
      { key: 'type', label: 'Email Type', kind: 'select', options: EMAIL_TYPES, default: 'Sales Email' },
      {
        key: 'ctx',
        label: 'Recipient / Context',
        kind: 'multiline',
        placeholder:
          'e.g. Follow up with Acme Corp after a product demo of our CRM. Decision maker: Sarah, VP Sales.',
      },
      { key: 'tone', label: 'Tone', kind: 'select', options: EMAIL_TONES, default: 'Professional' },
    ],
    required: ['ctx'],
    requiredMessage: 'Please describe the recipient / context',
    buildPrompt: (v) =>
      `You are an expert B2B sales copywriter. Write a ${v.tone.toLowerCase()} "${v.type}" for a CRM user based on this context:
${v.ctx}
Return a ready-to-send email with a compelling Subject line and a clear call to action. Use plain text, no placeholders like [Name] unless required.`,
    output: 'text',
  },
  {
    key: 'customer-communication',
    title: 'AI Customer Communication',
    description: 'Generate WhatsApp, SMS, replies, reminders and complaint responses.',
    icon: 'message-square',
    tint: 'bg-emerald-50',
    color: '#059669',
    fields: [
      { key: 'channel', label: 'Channel / Type', kind: 'select', options: CHANNELS, default: 'WhatsApp Message' },
      {
        key: 'ctx',
        label: 'Customer / Situation',
        kind: 'multiline',
        placeholder: 'e.g. Remind customer Ravi about pending invoice #INV-1042 of ₹25,000 due in 3 days.',
      },
      { key: 'tone', label: 'Tone', kind: 'select', options: COMM_TONES, default: 'Friendly' },
    ],
    required: ['ctx'],
    requiredMessage: 'Please describe the customer / situation',
    buildPrompt: (v) =>
      `You are a CRM customer communication assistant. Write a ${v.tone.toLowerCase()} "${v.channel}" for a customer based on this context:
${v.ctx}

Keep it channel-appropriate (short for SMS/WhatsApp), clear and ready to send. Return only the message text.`,
    output: 'text',
  },
  {
    key: 'sales-recommendations',
    title: 'AI Sales Recommendations',
    description: 'Upsell, cross-sell and revenue opportunities from your CRM data.',
    icon: 'trending-up',
    tint: 'bg-amber-50',
    color: '#d97706',
    fields: [
      { key: 'type', label: 'Recommendation Type', kind: 'select', options: REC_TYPES, default: 'Upsell Suggestions' },
      {
        key: 'ctx',
        label: 'Customer / Product Data',
        kind: 'multiline',
        placeholder:
          'e.g. Customer: Acme Corp, plan: Basic CRM, 40 users, 8 months active. Recently bought Invoicing add-on. Products available: ERP, Analytics, Support Plus.',
      },
    ],
    required: ['ctx'],
    requiredMessage: 'Please add customer / product data',
    buildPrompt: (v) =>
      `You are an AI sales strategist for a CRM. Based on the following customer and product data, generate "${v.type}".
${v.ctx}
Provide clear, actionable recommendations with brief reasoning and, where relevant, an estimated revenue impact. Use concise bullet points.`,
    output: 'text',
  },
];

export const getAITool = (key?: string) => AI_TOOLS.find((t) => t.key === key);

/** Initial form values: select defaults, empty text. */
export const initialValues = (tool: AITool): Record<string, string> =>
  Object.fromEntries(tool.fields.map((f) => [f.key, f.default ?? '']));

/** Web validation: every required field must be non-blank. */
export const validateAIInput = (tool: AITool, v: Record<string, string>) =>
  tool.required.every((k) => v[k]?.trim()) ? null : tool.requiredMessage;

/** Same tolerant JSON extraction as the web SEO tool's parseJSON(). */
export function parseSEO(text: string): SEOResult | null {
  try {
    const s = text.indexOf('{');
    const e = text.lastIndexOf('}');
    return s >= 0 && e > s ? (JSON.parse(text.slice(s, e + 1)) as SEOResult) : null;
  } catch {
    return null;
  }
}

/** Score clamped to 0–100 like the web page. */
export const seoScore = (r: SEOResult | null) => Math.max(0, Math.min(100, Number(r?.seoScore) || 0));
