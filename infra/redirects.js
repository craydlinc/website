// CloudFront Function: redirects + directory index rewrite (/articles/ → /articles/index.html, /blog/ → /articles/)
// Attached to viewer-request event on the CloudFront distribution.
// CloudFront Functions use ES 5.1 syntax (no let/const, no arrow functions, no template literals).

// --- Exact page redirects (old WordPress path → new path) ---
var pageRedirects = {
  '/custom-home-building-blog':       '/articles/',
  '/custom-home-building-blog/':      '/articles/',
  '/contact-craydl':                  '/contact.html',
  '/contact-craydl/':                 '/contact.html',
  '/about-craydl':                    '/contact.html',
  '/about-craydl/':                   '/contact.html',
  '/craydl-services':                 '/services.html',
  '/craydl-services/':                '/services.html',
  '/remodel':                         '/services.html',
  '/remodel/':                        '/services.html',
  '/new-construction':                '/services.html',
  '/new-construction/':               '/services.html',
  '/architects':                      '/architects.html',
  '/architects/':                     '/architects.html',
  '/builders':                        '/builders.html',
  '/builders/':                       '/builders.html',
  '/developers':                      '/developers.html',
  '/developers/':                     '/developers.html',
  '/interior-designers':              '/interior-designers.html',
  '/interior-designers/':             '/interior-designers.html',
  '/-interiordesigners':              '/interior-designers.html',
  '/-interiordesigners/':             '/interior-designers.html',
  '/homeowners':                      '/homeowners.html',
  '/homeowners/':                     '/homeowners.html',
  '/confident-home-design-with-virtual-construction-craydl': '/homeowners.html',
  '/confident-home-design-with-virtual-construction-craydl/': '/homeowners.html',
  '/owners-rep':                      '/owners-rep.html',
  '/owners-rep/':                     '/owners-rep.html',
  '/owners-representative':           '/owners-rep.html',
  '/owners-representative/':          '/owners-rep.html',
  '/who-we-serve':                    '/',
  '/who-we-serve/':                   '/',
  '/why-craydl':                      '/',
  '/why-craydl/':                     '/',
  '/project-samples':                 '/#new-home-tours',
  '/project-samples/':                '/#new-home-tours',
  '/calculator':                      'https://budget.craydl.com/',
  '/calculator/':                     'https://budget.craydl.com/',
  '/builder-intake-form':             '/contact.html',
  '/builder-intake-form/':            '/contact.html',
  '/homeowner-intake-form':           '/contact.html',
  '/homeowner-intake-form/':          '/contact.html',
  '/interior-designer-intake-form':   '/contact.html',
  '/interior-designer-intake-form/':  '/contact.html',
  '/thank-you-for-downloading':       '/thank-you.html',
  '/thank-you-for-downloading/':      '/thank-you.html',
  '/blog':                            '/articles/',
  '/blog/':                           '/articles/'
};

// Blog post slugs that exist on the new site (WordPress: /slug/ → new: /articles/posts/slug.html)
var blogSlugs = [
  'architecture-vs-interior-design-home-design',
  'benefits-accessory-dwelling-units-adus',
  'beyond-the-render-mastering-the-digital-twin-model-in-2026',
  'bi-bim-for-custom-home-builders',
  'bim-for-residential-architects-the-2026-guide-to-digital-precision-and-design-freedom',
  'bim-in-interior-design-implementation',
  'bim-in-residential-construction-outcomes',
  'bim-vdc-custom-home-design-build',
  'bim-vs-traditional-methods',
  'builder-interview-questions-luxury-home-remodel',
  'builders-speeding-up-home-design-projects',
  'california-wildfires-impact-arizona-nevada-real-estate',
  'choose-right-builder-custom-home',
  'clash-detection-in-bim-eliminating-construction-conflicts-in-luxury-residential-projects',
  'craydl-bim-services-for-architects',
  'custom-luxury-homes-ai',
  'designing-building-custom-hillside-homes',
  'digital-twin-construction-management-the-2026-guide-to-precision-building',
  'digital-twin-for-luxury-real-estate-the-2026-pre-construction-standard',
  'digital-twin-meaning-the-2026-guide-to-virtual-prototypes-in-construction',
  'digital-twin-technology-the-2026-guide-to-luxury-residential-construction',
  'digital-twinning-in-2026-the-new-standard-for-luxury-residential-construction',
  'drafting-chaos-architecture-firms',
  'embracing-change-architecture-construction',
  'future-of-connected-construction',
  'home-renovation-feasibility',
  'how-to-prevent-construction-change-orders-the-digital-first-strategy-for-2026',
  'intelligent-home-construction-bim',
  'luxury-home-pre-construction-checklist-2026-the-digital-first-guide',
  'mastering-clash-detection-protecting-luxury-custom-builds-in-2026',
  'pre-construction-planning-the-digital-blueprint-for-luxury-residential-success',
  'programmatic-approach-home-construction',
  'programmatic-home-construction-good-program',
  'residential-bim-services-scottsdale-the-luxury-builders-2026-guide',
  'revolutionizing-preconstruction-the-visionary-founder-of-craydl',
  'super-bim-scan-to-bim-construction-audit-arizona',
  'the-largest-homebuilder-youve-never-heard-of',
  'vdc-for-luxury-home-builders-the-2026-strategic-guide-to-virtual-precision',
  'vdc-services-for-custom-home-builders-the-2026-guide-to-zero-rework-luxury-construction',
  'virtual-reality-walkthroughs-the-future-of-luxury-pre-construction-in-2026',
  'what-is-a-digital-twin-the-living-blueprint-of-modern-construction',
  'why-custom-home-projects-stall'
];

// Build a lookup object for O(1) blog slug matching
var blogLookup = {};
for (var i = 0; i < blogSlugs.length; i++) {
  blogLookup[blogSlugs[i]] = true;
}

function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // 1. Check exact page redirects
  if (pageRedirects.hasOwnProperty(uri)) {
    var target = pageRedirects[uri];
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: target } }
    };
  }

  // 2. Redirect old /blog/* paths to /articles/*
  if (uri.indexOf('/blog/') === 0) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: uri.replace('/blog/', '/articles/') } }
    };
  }

  // 3. Check blog post redirects: /slug/ → /articles/posts/slug.html
  //    Strip leading slash and trailing slash to get the slug
  var slug = uri.replace(/^\//, '').replace(/\/$/, '');
  if (slug && blogLookup.hasOwnProperty(slug)) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: '/articles/posts/' + slug + '.html' } }
    };
  }

  // 3. Catch-all: redirect /category/* /tag/* /author/* to /articles/
  if (uri.indexOf('/category/') === 0 || uri.indexOf('/tag/') === 0 || uri.indexOf('/author/') === 0) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: '/articles/' } }
    };
  }

  // 4. HubSpot legacy paths: /en/* → homepage
  if (uri.indexOf('/en/') === 0 || uri === '/en') {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: '/' } }
    };
  }

  // 5. Old WordPress uploads → relevant pages
  if (uri.indexOf('/wp-content/') === 0) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: '/interior-designers.html' } }
    };
  }

  // 6. Old WordPress feed/API paths → homepage
  if (uri.indexOf('/feed') === 0 || uri.indexOf('/wp-json/') === 0 || uri.indexOf('/wp-admin') === 0 || uri.indexOf('/wp-login') === 0) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: '/' } }
    };
  }

  // 7. Rewrite directory paths to index.html (S3 doesn't serve directory indexes with OAC)
  if (uri.charAt(uri.length - 1) === '/') {
    request.uri = uri + 'index.html';
    return request;
  }

  // No redirect needed — pass through to S3
  return request;
}
