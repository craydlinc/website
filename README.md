# CRAYDL Website

Static rebuild of the CRAYDL site for easy editing in Cursor. No WordPress, no build step—just HTML, CSS, and a small amount of JavaScript.

## Structure

- **index.html** – Home: hero, welcome, who we serve, CTAs, clients, portfolio, FAQs, testimonials
- **services.html** – Full services: Scan to BIM, clash detection, VDC, budgeting, permitting, marketing, production docs, interior design
- **contact.html** – About, who we help, contact form, newsletter signup
- **book-now.html** – Redirects to HubSpot landing (craydl.com/website); keeps old marketing links working
- **css/style.css** – All styles; edit CSS variables at the top for colors/fonts/spacing
- **js/main.js** – Mobile menu toggle only
- **docs/CONTENT_ARCHITECTURE.md** – Lead magnets & social in HubSpot; code/UI in repo; React hero personalization notes
- **Media/** – High-res source images for the AWS pipeline (DAM + WebP per audience); see **docs/AWS_MEDIA_PIPELINE.md**
- **react/** – older standalone snippet (use **craydl-app** for full Next.js + API)
- **craydl-app/** – Next.js app: **AudienceHero** + **GET /api/get-hubspot-contact** + HubSpot tracking; see `craydl-app/README.md` and `docs/HUBSPOT_PRIVATE_APP_SETUP.md`

## Editing in Cursor

1. **Content** – Edit the HTML files directly. Sections are clearly commented or easy to find by heading.
2. **Colors / fonts / spacing** – In `css/style.css`, change the `:root` variables (e.g. `--color-accent`, `--font-sans`).
3. **Links** – External links (meeting landing page, social, YouTube, budget.craydl.com, app.craydl.com) are in the HTML; search for the URL or label to update.
4. **Contact form** – Submissions go to **hello@craydl.com** via [FormSubmit](https://formsubmit.co). On the **first** submission, FormSubmit emails **hello@craydl.com** an activation link—click it to start receiving inquiries. The thank-you message appears on the same page (JS); without JS, users land on `thank-you.html`. Serve the site over **http(s)** (not `file://`) so AJAX works.

## Running locally

**Important:** Run the server from inside the **Web Site** folder so the site renders correctly at the root URL.

```bash
cd "c:\Users\adamj\Desktop\Gemini to Cursor\Web Site"
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

- If port 3000 is already in use, stop the other process using it, or run: `npx serve . -l 5000` and open http://localhost:5000.
- Opening `index.html` directly (file://) may break asset paths; prefer using the local server.

## Deploying

Upload the folder to any static host:

- **Netlify** – Drag the folder into Netlify or connect a Git repo.
- **Vercel** – Import the project; no config needed for static HTML.
- **GitHub Pages** – Push to a repo and enable Pages on the branch.
- **Existing host** – Upload via FTP/SFTP; point the domain at the folder containing `index.html`.

For clean URLs without `.html` (e.g. `/services` instead of `/services.html`), configure rewrites on your host or use a static site generator later.

## Preserved from original site

- All main copy, CTAs, and section structure
- Phone: 480-716-5884
- Address: 23350 N Pima Road, Scottsdale, AZ 85255
- Email: info@craydl.com
- Social: Substack, YouTube, Instagram, Facebook (icon links in header/footer)
- Schedule a meeting (HubSpot landing): craydl.com/website
- Google Calendar scheduling link
- Newsletter: HubSpot form link
- Links to budget.craydl.com and app.craydl.com
- YouTube service video link

Replace or add images (logo, project thumbnails, team photo) by adding an `images/` folder and referencing paths in the HTML.
