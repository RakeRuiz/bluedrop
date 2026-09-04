import { Memory } from '@mastra/memory';
import { postgresStorage } from '../storage.js';

export const lucyMemory = new Memory({
  storage: postgresStorage,
  options: {
    lastMessages: 20,
  },
});

export function normalizeWhatsappNumber(rawNumber: string): string {
  return rawNumber.replace(/[^\d+]/g, '');
}

export function threadIdForWhatsapp(whatsappNumber: string): string {
  return `wa:${normalizeWhatsappNumber(whatsappNumber)}`;
}
