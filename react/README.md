# CRAYDL React snippets

## `components/AudienceHero.jsx`

Drop into a React app (Create React App, Vite, Next.js). Wire styles via your design system (e.g. match `hero-container` to your site CSS).

**Requirements**

- Same-site API route **`GET /api/get-hubspot-contact`** that returns JSON `{ customer_type?: string }`.
- HubSpot tracking script on the site so `hubspotutk` cookie exists for returning visitors.

## `api/get-hubspot-contact.example.mjs`

Copy into your host’s serverless API pattern:

| Platform   | Typical path                          |
|-----------|----------------------------------------|
| Next.js   | `pages/api/get-hubspot-contact.js`     |
| Next.js 13+ | `app/api/get-hubspot-contact/route.ts` |
| Vercel    | `api/get-hubspot-contact.js`           |

Set **`HUBSPOT_PRIVATE_APP_TOKEN`** in project env (never in client bundles).

If HubSpot deprecates the legacy UTK endpoint, switch to the current CRM search/identify flow documented in [HubSpot API docs](https://developers.hubspot.com/docs/api/overview).

## Content strategy

See **`../docs/CONTENT_ARCHITECTURE.md`**: lead magnets and social assets in HubSpot; code/UI in this repo.
