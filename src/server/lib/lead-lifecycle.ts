import { upsertLeadSkeleton, setLeadZernioContactId, type Lead } from './supabase-client.js';
import { upsertContact } from './zernio-client.js';

export async function ensureLead(whatsappNumber: string): Promise<Lead> {
  const lead = await upsertLeadSkeleton(whatsappNumber);

  if (!lead.zernio_contact_id) {
    try {
      const contact = await upsertContact(whatsappNumber);
      await setLeadZernioContactId(lead.id, contact.id);
      lead.zernio_contact_id = contact.id;
    } catch (error) {
      console.error('[lead-lifecycle] No se pudo sincronizar el contacto en Zernio', error);
    }
  }

  return lead;
}
