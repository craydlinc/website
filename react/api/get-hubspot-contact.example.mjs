/**
 * Example: Vercel / Netlify / Node serverless handler
 *
 * 1. Create a HubSpot Private App with scope: crm.objects.contacts.read
 * 2. Set env: HUBSPOT_PRIVATE_APP_TOKEN
 * 3. In HubSpot, create contact property internal name: customer_type (single-line text or dropdown)
 * 4. Rename/copy to your framework's API route (e.g. pages/api/get-hubspot-contact.js for Next.js)
 *
 * HubSpot identifies known visitors via cookie hubspotutk — pass it only server-side.
 */

function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1].trim()) : null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'Server misconfiguration' });
    return;
  }

  const utk = getCookieValue(req.headers.cookie || '', 'hubspotutk');
  if (!utk) {
    res.status(200).json({});
    return;
  }

  try {
    // Legacy Contacts API: resolve visitor token to contact (when contact is known)
    const url = `https://api.hubapi.com/contacts/v1/contact/utk/${encodeURIComponent(utk)}`;
    const hubRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!hubRes.ok) {
      res.status(200).json({});
      return;
    }

    const body = await hubRes.json();
    const props = body.properties || {};
    const raw =
      props.customer_type?.value ??
      props.customer_type ??
      '';

    res.status(200).json({
      customer_type: raw || undefined,
    });
  } catch {
    res.status(200).json({});
  }
}

/* Vercel: export as default from api/get-hubspot-contact.js
 * Next.js App Router: adapt to route handler, use cookies() from 'next/headers'
 */
