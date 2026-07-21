import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { getPdfRequest, type Invoice } from '@/services/invoices';

/**
 * Downloads the backend-generated invoice PDF (GET /invoices/:id/pdf) with the
 * bearer token, then opens the native share/preview sheet. Reuses the existing
 * backend PDF exactly — no client-side PDF generation.
 */
export async function downloadAndShareInvoicePdf(invoice: Invoice): Promise<void> {
  const { url, headers } = await getPdfRequest(invoice._id);

  const safeName = (invoice.invoiceNumber || invoice._id).replace(/[^\w.-]/g, '_');
  const target = `${FileSystem.cacheDirectory}Invoice-${safeName}.pdf`;

  const { uri, status } = await FileSystem.downloadAsync(url, target, { headers });
  if (status < 200 || status >= 300) {
    throw new Error(`PDF download failed (status ${status})`);
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: `Invoice ${invoice.invoiceNumber ?? ''}`.trim(),
    });
  }
}
