// CloudFront Function: redirects + directory index rewrite (cloudfront-js-2.0)
var R = { // old WordPress/HubSpot URLs → new pages
  '/custom-home-building-blog': '/articles/',
  '/contact-craydl': '/contact.html',
  '/about-craydl': '/',
  '/craydl-services': '/services.html',
  '/remodel': '/services.html',
  '/new-construction': '/services.html',
  '/architects': '/architects.html',
  '/builders': '/builders.html',
  '/developers': '/developers.html',
  '/interior-designers': '/interior-designers.html',
  '/-interiordesigners': '/interior-designers.html',
  '/homeowners': '/homeowners.html',
  '/confident-home-design-with-virtual-construction-craydl': '/homeowners.html',
  '/owners-rep': '/owners-rep.html',
  '/owners-representative': '/owners-rep.html',
  '/who-we-serve': '/',
  '/why-craydl': '/',
  '/project-samples': '/#new-home-tours',
  '/calculator': 'https://budget.craydl.com/',
  '/builder-intake-form': '/builders.html',
  '/homeowner-intake-form': '/contact.html',
  '/interior-designer-intake-form': '/contact.html',
  '/thank-you-for-downloading': '/thank-you.html',
  '/blog': '/articles/',
  '/preconstruction-planning': '/',
  '/preconstruction': '/',
  '/architects-bim-services': '/architects.html',
  '/bim-services-for-architects': '/architects.html',
  '/custom-homes': '/homeowners.html',
  '/custom-home': '/homeowners.html',
  '/what-craydl-brings-to-the-table-for-architects': '/architects.html',
  '/revolutionizing-preconstruction-the-visionary-founder-of-craydl': '/contact.html'
};

var articleSlugs = [
  'architecture-vs-interior-design-home-design',
  'benefits-accessory-dwelling-units-adus',
  'bi-bim-for-custom-home-builders',
  'bim-in-interior-design-implementation',
  'bim-in-residential-construction-outcomes',
  'bim-vdc-custom-home-design-build',
  'bim-vs-traditional-methods',
  'builder-interview-questions-luxury-home-remodel',
  'builders-speeding-up-home-design-projects',
  'california-wildfires-impact-arizona-nevada-real-estate',
  'choose-right-builder-custom-home',
  'craydl-bim-services-for-architects',
  'custom-luxury-homes-ai',
  'designing-building-custom-hillside-homes',
  'drafting-chaos-architecture-firms',
  'embracing-change-architecture-construction',
  'future-of-connected-construction',
  'home-renovation-feasibility',
  'intelligent-home-construction-bim',
  'programmatic-approach-home-construction',
  'programmatic-home-construction-good-program',
  'revolutionizing-preconstruction-the-visionary-founder-of-craydl',
  'super-bim-scan-to-bim-construction-audit-arizona',
  'the-largest-homebuilder-youve-never-heard-of',
  'why-custom-home-projects-stall',
  'digital-twin-construction-the-2026-guide-to-virtual-building-excellence',
  'mastering-quantity-takeoffs-the-ultimate-guide-to-construction-estimation-in-2026',
  'what-is-a-digital-twin-the-2026-guide-to-virtual-construction',
  'the-premier-digital-twin-company-precision-pre-construction-for-luxury-estates',
  'what-is-a-digital-twin-the-definitive-guide-to-virtual-construction-in-2026'
];

var seoSlugs = [
  'beyond-the-render-mastering-the-digital-twin-model-in-2026',
  'bim-for-residential-architects-the-2026-guide-to-digital-precision-and-design-freedom',
  'clash-detection-in-bim-eliminating-construction-conflicts-in-luxury-residential-projects',
  'digital-twin-construction-management-the-2026-guide-to-precision-building',
  'digital-twin-for-luxury-real-estate-the-2026-pre-construction-standard',
  'digital-twin-meaning-the-2026-guide-to-virtual-prototypes-in-construction',
  'digital-twin-technology-the-2026-guide-to-luxury-residential-construction',
  'digital-twinning-in-2026-the-new-standard-for-luxury-residential-construction',
  'how-to-prevent-construction-change-orders-the-digital-first-strategy-for-2026',
  'luxury-home-pre-construction-checklist-2026-the-digital-first-guide',
  'mastering-clash-detection-protecting-luxury-custom-builds-in-2026',
  'pre-construction-planning-the-digital-blueprint-for-luxury-residential-success',
  'residential-bim-services-scottsdale-the-luxury-builders-2026-guide',
  'vdc-for-luxury-home-builders-the-2026-strategic-guide-to-virtual-precision',
  'vdc-services-for-custom-home-builders-the-2026-guide-to-zero-rework-luxury-construction',
  'virtual-reality-walkthroughs-the-future-of-luxury-pre-construction-in-2026',
  'what-is-a-digital-twin-the-living-blueprint-of-modern-construction'
];

var aL = {};
for (var i = 0; i < articleSlugs.length; i++) { aL[articleSlugs[i]] = true; }
var sL = {};
for (var i = 0; i < seoSlugs.length; i++) { sL[seoSlugs[i]] = true; }

function r301(loc) {
  return { statusCode: 301, statusDescription: 'Moved Permanently', headers: { location: { value: loc } } };
}

function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Normalize: strip trailing slash for lookup (except root /)
  var norm = (uri.length > 1 && uri.charAt(uri.length - 1) === '/') ? uri.slice(0, -1) : uri;

  // Hardcoded page redirects (match with or without trailing slash)
  if (R.hasOwnProperty(norm)) return r301(R[norm]);

  // SEO articles incorrectly under /articles/posts/ → move to /blog/posts/
  if (uri.indexOf('/articles/posts/') === 0 && uri.indexOf('.html') !== -1) {
    var artSlug = uri.replace('/articles/posts/', '').replace('.html', '');
    if (artSlug && sL.hasOwnProperty(artSlug)) return r301('/blog/posts/' + artSlug + '.html');
  }

  // /blog/anything (not /blog/posts/) → /articles/
  if (uri.indexOf('/blog/') === 0 && uri.indexOf('/blog/posts/') !== 0) {
    return r301(uri.replace('/blog/', '/articles/'));
  }

  // Bare slug → article or SEO blog post
  var slug = uri.replace(/^\//, '').replace(/\/$/, '');
  if (slug && aL.hasOwnProperty(slug)) return r301('/articles/posts/' + slug + '.html');
  if (slug && sL.hasOwnProperty(slug)) return r301('/blog/posts/' + slug + '.html');

  // WordPress date-based permalinks: /YYYY/MM/DD/slug/ or /YYYY/MM/slug/
  var dm = uri.match(/^\/\d{4}\/\d{2}(?:\/\d{2})?\/([^\/]+)\/?$/);
  if (dm) {
    var ps = dm[1];
    if (aL.hasOwnProperty(ps)) return r301('/articles/posts/' + ps + '.html');
    if (sL.hasOwnProperty(ps)) return r301('/blog/posts/' + ps + '.html');
    return r301('/articles/');
  }

  // WordPress category permalinks: /category/cat-name/slug/
  if (uri.indexOf('/category/') === 0) {
    var cp = uri.replace(/^\/category\//, '').replace(/\/$/, '').split('/');
    var cs = cp[cp.length - 1];
    if (cs && aL.hasOwnProperty(cs)) return r301('/articles/posts/' + cs + '.html');
    if (cs && sL.hasOwnProperty(cs)) return r301('/blog/posts/' + cs + '.html');
    return r301('/articles/');
  }

  // WordPress tag and author archives
  if (uri.indexOf('/tag/') === 0 || uri.indexOf('/author/') === 0) return r301('/articles/');

  // WordPress pagination: /page/2/
  if (uri.match(/^\/page\/\d+\/?$/)) return r301('/');

  // Language prefix
  if (uri.indexOf('/en/') === 0 || uri === '/en') return r301('/');

  // WordPress media/uploads
  if (uri.indexOf('/wp-content/') === 0) return r301('/');

  // WordPress infrastructure: feed, REST API, admin, login, xmlrpc, includes, cron, comments
  if (uri.indexOf('/feed') === 0 || uri.indexOf('/wp-json/') === 0 || uri.indexOf('/wp-admin') === 0 || uri.indexOf('/wp-login') === 0 || uri.indexOf('/wp-includes/') === 0 || uri === '/xmlrpc.php' || uri.indexOf('/wp-cron') === 0 || uri.indexOf('/comments/') === 0 || uri.indexOf('/trackback/') === 0) {
    return r301('/');
  }

  // WordPress attachment pages
  if (uri.indexOf('/attachment/') === 0) return r301('/');

  // Directory index rewrite
  if (uri.charAt(uri.length - 1) === '/') {
    request.uri = uri + 'index.html';
    return request;
  }

  return request;
}
