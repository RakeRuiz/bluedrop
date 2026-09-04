const ZERNIO_BASE_URL = 'https://zernio.com/api/v1';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

async function zernioFetch<T>(path: string, init: RequestInit = {}, attempt = 1): Promise<T> {
  const apiKey = requireEnv('ZERNIO_API_KEY');

  const response = await fetch(`${ZERNIO_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (response.status === 429 && attempt <= 3) {
    const resetHeader = response.headers.get('X-RateLimit-Reset');
    const resetAt = resetHeader ? Number(resetHeader) * 1000 : Date.now() + 1000;
    const waitMs = Math.max(resetAt - Date.now(), 1000);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return zernioFetch<T>(path, init, attempt + 1);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Zernio ${init.method ?? 'GET'} ${path} -> ${response.status}: ${body}`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export interface ZernioContact {
  id: string;
  name?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

export async function findContactByWhatsapp(whatsappNumber: string): Promise<ZernioContact | null> {
  const accountId = process.env.ZERNIO_ACCOUNT_ID;
  const profileId = process.env.ZERNIO_PROFILE_ID;
  const params = new URLSearchParams({ platform: 'whatsapp', search: whatsappNumber, limit: '10' });
  if (accountId) params.set('accountId', accountId);
  if (profileId) params.set('profileId', profileId);

  const result = await zernioFetch<{ contacts: ZernioContact[] }>(`/contacts?${params.toString()}`);
  return result.contacts?.[0] ?? null;
}

export async function upsertContact(whatsappNumber: string, name?: string): Promise<ZernioContact> {
  const existing = await findContactByWhatsapp(whatsappNumber);
  if (existing) return existing;

  const accountId = requireEnv('ZERNIO_ACCOUNT_ID');
  const profileId = requireEnv('ZERNIO_PROFILE_ID');

  return zernioFetch<ZernioContact>('/contacts', {
    method: 'POST',
    body: JSON.stringify({
      profileId,
      accountId,
      platform: 'whatsapp',
      platformIdentifier: whatsappNumber,
      name: name ?? whatsappNumber,
    }),
  });
}

export async function setCustomField(contactId: string, slug: string, value: string | number | boolean): Promise<void> {
  await zernioFetch(`/contacts/${contactId}/fields/${slug}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
}

export async function updateContactName(contactId: string, name: string): Promise<void> {
  await zernioFetch(`/contacts/${contactId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

export async function addTag(contactId: string, tag: string): Promise<void> {
  const contact = await zernioFetch<ZernioContact>(`/contacts/${contactId}`);
  const tags = Array.from(new Set([...(contact.tags ?? []), tag]));
  await zernioFetch(`/contacts/${contactId}`, {
    method: 'PATCH',
    body: JSON.stringify({ tags }),
  });
}

export async function sendInboxMessage(conversationId: string, message: string): Promise<void> {
  const accountId = requireEnv('ZERNIO_ACCOUNT_ID');
  await zernioFetch(`/inbox/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ accountId, message }),
  });
}
