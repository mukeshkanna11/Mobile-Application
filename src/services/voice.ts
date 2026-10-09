/**
 * Twilio Voice — native (Android / iOS) build.
 *
 * The existing CRM Voice flow uses the browser SDK (@twilio/voice-sdk), which
 * needs WebRTC and only runs on web (see voice.web.ts). Native calling would
 * require Twilio's native Voice SDK and a new dev build, so it is reported as
 * unsupported here instead of falling back to the device dialer.
 */
export type CallState = 'idle' | 'connecting' | 'ringing' | 'connected' | 'completed' | 'failed';

export interface CallHandlers {
  onState: (state: CallState) => void;
  onError: (message: string) => void;
}

export interface ActiveCall {
  hangup: () => void;
}

export const VOICE_SUPPORTED = false;

export async function startLeadCall(
  _lead: { _id: string; phone?: string },
  handlers: CallHandlers
): Promise<ActiveCall | null> {
  handlers.onError('In-app calling is available on the web app only for now.');
  handlers.onState('failed');
  return null;
}
