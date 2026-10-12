import { router, type Href } from 'expo-router';

/**
 * Leave a screen after save/delete. Goes back when there is history; when the
 * screen was opened directly (deep link, cold start) it replaces with `fallback`.
 */
export function goBackOr(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
