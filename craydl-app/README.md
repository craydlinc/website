# CRAYDL Next.js app (AudienceHero + HubSpot API)

## 1. Install & run

```bash
cd craydl-app
npm install
cp .env.local.example .env.local
# Edit .env.local — add HUBSPOT_PRIVATE_APP_TOKEN (see ../docs/HUBSPOT_PRIVATE_APP_SETUP.md)
npm run dev
```

Open **http://localhost:3000**

- **AudienceHero** is on the home page.
- **GET /api/get-hubspot-contact** returns `{ "client_type": "..." }` when `hubspotutk` matches a known contact and **CLIENT TYPE** is set.

## 2. HubSpot setup

Read **`../docs/HUBSPOT_PRIVATE_APP_SETUP.md`**.  
You do **not** create a legacy “API key” — you create a **Private App** and use its **access token** in `HUBSPOT_PRIVATE_APP_TOKEN`.

## 3. CLIENT TYPE values

Match your HubSpot dropdown options to hero logic (case/spacing normalized):

| Typical value   | Hero shown        |
|----------------|-------------------|
| Developer      | Developer headline |
| Homeowner      | Homeowner         |
| Builder        | Builder           |
| Owner’s rep / Owners representative | Owner’s rep headline |
| (empty / unknown) | Generic           |

If a value doesn’t match, the generic hero shows. Adjust `normalizeClientType` in `components/AudienceHero.tsx` if needed.
