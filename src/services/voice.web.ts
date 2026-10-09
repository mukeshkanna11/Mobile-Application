import API from '@/services/api';

import type { ActiveCall, CallHandlers, CallState } from './voice';

export type { ActiveCall, CallHandlers, CallState } from './voice';

/**
 * Twilio Voice — web build. Same flow as the web CRM (Leads.jsx startCall):
 *   GET /voip/token -> Device(token) -> device.connect({ params: { To, leadId } })
 * The backend TwiML app normalizes the number and logs the call Activity.
 */
export const VOICE_SUPPORTED = true;

const describe = (err: any): string => {
  const e = err?.twilioError || err;
  const code = e?.code ?? e?.originalError?.code;
  const msg =
    err?.response?.data?.message || e?.description || e?.message || 'Call failed';
  return code ? `${msg} (${code})` : msg;
};

export async function startLeadCall(
  lead: { _id: string; phone?: string },
  { onState, onError }: CallHandlers
): Promise<ActiveCall | null> {
  let device: any = null;

  const destroy = () => {
    try {
      device?.disconnectAll?.();
      device?.destroy?.();
    } catch {
      /* already gone */
    }
    device = null;
  };

  const fail = (err: unknown) => {
    onError(describe(err));
    onState('failed');
    destroy();
  };

  try {
    onState('connecting');

    const { data } = await API.get('/voip/token');
    const token: string | undefined = data?.data?.token;
    if (!token) throw new Error('No Twilio token returned');

    const { Device } = await import('@twilio/voice-sdk');

    device = new Device(token, {
      codecPreferences: ['opus', 'pcmu'] as any,
      disableAudioContextSounds: true,
      enableImprovedSignalingErrorPrecision: true,
    });

    device.on('error', fail);

    const call = await device.connect({
      params: { To: String(lead.phone), leadId: String(lead._id) },
    });

    const set = (s: CallState) => onState(s);
    call.on('ringing', () => set('ringing'));
    call.on('accept', () => set('connected'));
    call.on('disconnect', () => {
      set('completed');
      destroy();
    });
    call.on('cancel', () => {
      set('completed');
      destroy();
    });
    call.on('error', fail);

    const status = call.status?.();
    if (status === 'open') set('connected');
    else if (status === 'ringing') set('ringing');

    return { hangup: () => (call.disconnect?.(), destroy()) };
  } catch (err) {
    fail(err);
    return null;
  }
}
