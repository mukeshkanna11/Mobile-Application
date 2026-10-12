import API from '@/services/api';

/**
 * Support enquiry — mirrors web services/chatSupport.js + ChatSupportWidget.jsx.
 *   POST /chat { name, email, phone, company, category, subject, message, source, priority }
 *     -> 201 { success, ... }   backend creates the Chat, the Lead and sends the company email
 *     -> 400 { success:false, message }  (name / email / message missing)
 * Public endpoint (same as the website); no extra auth handling here.
 */

export const SUPPORT_CATEGORIES = [
  'CRM Demo',
  'ERP Demo',
  'CRM & ERP',
  'Pricing Enquiry',
  'Technical Support',
  'General Enquiry',
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export interface EnquiryForm {
  name: string;
  email: string;
  phone: string;
  company: string;
  category: string;
  message: string;
}

export const emptyEnquiry: EnquiryForm = { name: '', email: '', phone: '', company: '', category: '', message: '' };

/** Web getSubject(). */
export function subjectFor(category: string): string {
  switch (category) {
    case 'CRM Demo':
      return 'CRM Demo Request';
    case 'ERP Demo':
      return 'ERP Demo Request';
    case 'CRM & ERP':
      return 'CRM & ERP Enquiry';
    case 'Pricing Enquiry':
      return 'Pricing Enquiry';
    case 'Technical Support':
      return 'Technical Support Request';
    default:
      return 'General Enquiry';
  }
}

/** Web handleSubmit validation, same messages and order. */
export function validateEnquiry(f: EnquiryForm): string | null {
  if (!f.name.trim()) return 'Please enter your name.';
  if (!f.email.trim()) return 'Please enter your email address.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim().toLowerCase())) return 'Please enter a valid email address.';
  if (!f.phone.trim()) return 'Please enter your phone number.';
  if (!f.company.trim()) return 'Please enter your company name.';
  if (!f.category.trim()) return 'Please select your requirement.';
  if (!f.message.trim()) return 'Please enter your message.';
  return null;
}

/** Same payload as the web widget (source "Website", priority "Medium"). */
export async function submitEnquiry(f: EnquiryForm): Promise<void> {
  const category = f.category.trim();
  const { data } = await API.post('/chat', {
    name: f.name.trim(),
    email: f.email.trim().toLowerCase(),
    phone: f.phone.trim(),
    company: f.company.trim(),
    category,
    subject: subjectFor(category),
    message: f.message.trim(),
    source: 'Website',
    priority: 'Medium',
  });
  if (!data?.success) throw new Error(data?.message || 'Failed to submit enquiry.');
}
