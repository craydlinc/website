import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * HubSpot "CLIENT TYPE" contact property:
 * In HubSpot: Settings → Data Management → Properties → Contact → open "CLIENT TYPE"
 * Copy the **Internal name** (often `client_type`) into HUBSPOT_CLIENT_TYPE_PROPERTY if different.
 */
export async function GET() {
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  const propertyInternalName =
    process.env.HUBSPOT_CLIENT_TYPE_PROPERTY?.trim() || 'client_type';

  if (!token) {
    return NextResponse.json(
      { error: 'Missing HUBSPOT_PRIVATE_APP_TOKEN' },
      { status: 503 }
    );
  }

  const cookieStore = cookies();
  const utk = cookieStore.get('hubspotutk')?.value;

  if (!utk) {
    return NextResponse.json({});
  }

  try {
    // Resolve visitor cookie to a contact when HubSpot has identified them
    const url = `https://api.hubapi.com/contacts/v1/contact/utk/${encodeURIComponent(utk)}`;
    const hubRes = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    });

    if (!hubRes.ok) {
      return NextResponse.json({});
    }

    const body = (await hubRes.json()) as {
      properties?: Record<string, { value?: string } | string>;
    };
    const props = body.properties || {};
    const raw =
      typeof props[propertyInternalName] === 'object' &&
      props[propertyInternalName] !== null &&
      'value' in (props[propertyInternalName] as object)
        ? (props[propertyInternalName] as { value?: string }).value
        : typeof props[propertyInternalName] === 'string'
          ? (props[propertyInternalName] as string)
          : '';

    const client_type = raw?.trim() || undefined;
    return NextResponse.json(client_type ? { client_type } : {});
  } catch {
    return NextResponse.json({});
  }
}
