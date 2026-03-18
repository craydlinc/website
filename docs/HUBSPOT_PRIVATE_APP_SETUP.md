# HubSpot: Should I create an API key?

**No.** HubSpot has **retired API keys** for new integrations.

Use a **Private App** instead. It gives you a **secret access token** (like an API key, but scoped and revocable) that you use **only on your server** — never in the browser.

---

## Step-by-step: Private App for `/api/get-hubspot-contact`

### 1. Create the Private App

1. Log in to **HubSpot**.
2. Click the **settings gear** (top right).
3. In the left sidebar: **Integrations** → **Private Apps**.
4. Click **Create a private app**.
5. Name it e.g. `CRAYDL website – contact read`.
6. Open the **Scopes** tab.
7. Under **CRM**, enable at least:
   - **`crm.objects.contacts.read`** (read contacts)
8. Save. HubSpot will show an **Access token** — copy it once (you can’t see it again; you can regenerate if lost).

### 2. Put the token in `.env.local`

In `craydl-app/.env.local`:

```env
HUBSPOT_PRIVATE_APP_TOKEN=paste-your-token-here
```

Restart `npm run dev` after changing env vars.

### 3. Confirm **CLIENT TYPE** internal name

1. **Settings** → **Data Management** → **Properties**.
2. **Contact** → search **CLIENT TYPE**.
3. Open the property. Note **Internal name** (e.g. `client_type`).
4. If it’s not `client_type`, set in `.env.local`:

```env
HUBSPOT_CLIENT_TYPE_PROPERTY=your_internal_name_here
```

### 4. Tracking script (cookie `hubspotutk`)

The hero only personalizes when the visitor has been tracked by HubSpot and linked to a contact.

- In `craydl-app`, set `NEXT_PUBLIC_HUBSPOT_PORTAL_ID` to your portal ID (same number as in `js.hs-scripts.com/XXXXX.js`).
- The layout loads that script so **first-party** `hubspotutk` is set on **your domain** (localhost works for testing in some cases; production must use your real site URL).

### 5. If the API returns empty `{}`

Common reasons:

| Issue | What to do |
|-------|------------|
| No `hubspotutk` cookie | Visit site with HubSpot tracking on; submit a form or identify the visitor. |
| Contact not merged to this visitor | HubSpot must associate the browser with a contact (form, email click, etc.). |
| Legacy UTK endpoint restricted | Some accounts may need a different HubSpot workflow (e.g. pass segment server-side). Check [HubSpot API changelog](https://developers.hubspot.com/changelog) or support. |
| Wrong property internal name | Fix `HUBSPOT_CLIENT_TYPE_PROPERTY`. |

---

## Security checklist

- ✅ Token only in **server** env (`HUBSPOT_PRIVATE_APP_TOKEN`).
- ✅ Never commit `.env.local`.
- ✅ Private App scoped to **minimum** scopes (contacts read only if that’s all you need).

---

## Summary

| Question | Answer |
|----------|--------|
| Create an API key? | **No** — use a **Private App access token**. |
| Where does the token go? | **`craydl-app/.env.local`** as `HUBSPOT_PRIVATE_APP_TOKEN`. |
| What property is read? | **CLIENT TYPE** (internal name in env as `HUBSPOT_CLIENT_TYPE_PROPERTY`). |
