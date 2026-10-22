// CloudFront Function: redirects + directory index rewrite (cloudfront-js-2.0)
var R = {
  '/custom-home-building-blog': '/articles/',
  '/contact-craydl': '/contact.html',
  '/about-craydl': '/',
  '/craydl-services': '/services.html',
  '/remodel': '/services.html',
  '/new-construction': '/services.html',
  '/-interiordesigners': '/interior-designers.html',
  '/confident-home-design-with-virtual-construction-craydl': '/homeowners.html',
  '/owners-representative': '/owners-rep.html',
  '/who-we-serve': '/',
  '/why-craydl': '/',
  '/project-samples': '/#new-home-tours',
  '/calculator': 'https://ccc.craydl.com/login',
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
  '/bolt-performance': '/contact.html',
  '/request-a-demo-page': '/book-now.html',
  '/copy-of-privacy-policy': '/privacy-policy.html',
  '/articles/posts/digital-twin-for-luxury-real-estate-the-2026-pre-construction-standard.html': '/services.html#scan-to-bim',
  '/articles/posts/digital-twin-construction-management-the-2026-guide-to-precision-building.html': '/articles/index.html',
  '/articles/posts/clash-detection-in-bim-eliminating-construction-conflicts-in-luxury-residential-projects.html': 'https://youtu.be/hk7hZQPC33c',
  '/casitas': '/articles/posts/benefits-accessory-dwelling-units-adus.html',
  '/architecture-vs-interior-design-who-does-what': '/articles/posts/architecture-vs-interior-design-home-design.html',
  '/super-bim-navigating-the-shadows-of-construction-overcharges-with-cutting-edge-tech': '/articles/posts/super-bim-scan-to-bim-construction-audit-arizona.html',
  '/builder-intake-form.html': '/builders.html'
};

// /<name> -> /<name>.html
var pages = ['architects', 'builders', 'developers', 'interior-designers', 'homeowners', 'owners-rep', 'questions-to-ask-your-builder', 'privacy-policy', 'extension-privacy', 'services', 'contact', 'book-now'];

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
  'what-is-a-digital-twin-the-definitive-guide-to-virtual-construction-in-2026',
  'cornerstone-home-building-remodeling-information-management',
  'as-built-conditions-in-custom-home-building',
  'craydl-at-techomebuilder-summit-2023',
  'fun-fact-friday-the-magic-of-lidar-cameras-in-home-construction',
  'phil-orstrom-transforming-preconstruction-operations-with-craydl',
  'pre-construction-budget-calculator-tool-a-builder-s-best-friend',
  'revit-revolutionizing-home-building',
  'transforming-construction-projects-a-homeowner-s-guide-to-scan-to-bim',
  'walk-through-your-home-plan-3d-visualization-in-construction',
  'what-is-bim'
];

// Old article slugs (at /, /post/ or /en/) whose article now has a different slug
var P = {
  'accessory-dwelling-units': 'benefits-accessory-dwelling-units-adus',
  'architect-vs-designer': 'architecture-vs-interior-design-home-design',
  'california-fires-impact-on-az-nv': 'california-wildfires-impact-arizona-nevada-real-estate',
  'custom-luxury-homes-ai-what-s-coming': 'custom-luxury-homes-ai',
  'designing-building-new-homes-on-the-hillside': 'designing-building-custom-hillside-homes',
  'drafting-chaos-architectural-and-designer-work': 'drafting-chaos-architecture-firms',
  'embracing-change-the-ultimate-in-sustainability-and-relevance': 'embracing-change-architecture-construction',
  'good-program-good-outcome': 'programmatic-home-construction-good-program',
  'hiring-a-builder': 'choose-right-builder-custom-home',
  'home-construction': 'intelligent-home-construction-bim',
  'interior-design-meets-bim': 'bim-in-interior-design-implementation',
  'leveraging-bi-and-bim-for-custom-home-builders': 'bi-bim-for-custom-home-builders',
  'navigating-the-complexities-of-custom-home-building-no-swedish-no-finish': 'why-custom-home-projects-stall',
  'outcomes-a-strategic-approach-to-home-design-and-construction': 'bim-in-residential-construction-outcomes',
  'programmatic-approach-building': 'programmatic-approach-home-construction',
  'super-bim-tech-construction-overcharges': 'super-bim-scan-to-bim-construction-audit-arizona',
  'the-art-science-of-design-build': 'bim-vdc-custom-home-design-build',
  'the-future-of-connected-construction': 'future-of-connected-construction',
  'the-largest-homebuilder-you-ve-never-heard-of': 'the-largest-homebuilder-youve-never-heard-of',
  'there-s-bim-and-bim-mastery': 'bim-vs-traditional-methods',
  'theres-bim-and-bim-mastery': 'bim-vs-traditional-methods',
  'the-power-of-proper-bim-driving-superior-outcomes-through-value-engineering-and-accurate-estimating': 'bim-vs-traditional-methods',
  'what-craydl-does-for-architects': 'craydl-bim-services-for-architects',
  'why-should-carl-care-about-home-feasibility': 'home-renovation-feasibility'
};

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
  'what-is-a-digital-twin-the-living-blueprint-of-modern-construction',
  'program-management-vs-project-management-in-construction-a-2026-strategic-guide',
  'vdc-for-luxury-homes-scottsdale-the-high-velocity-framework-for-modern-construction'
];

var aL = {};
for (var i = 0; i < articleSlugs.length; i++) { aL[articleSlugs[i]] = true; }
var sL = {};
for (var i = 0; i < seoSlugs.length; i++) { sL[seoSlugs[i]] = true; }
var pL = {};
for (var i = 0; i < pages.length; i++) { pL[pages[i]] = true; }

function r301(loc) {
  return { statusCode: 301, statusDescription: 'Moved Permanently', headers: { location: { value: loc } } };
}

function handler(event) {
  var request = event.request;
  var uri = request.uri;

  var host = request.headers.host ? request.headers.host.value : '';
  if (host === 'craydl.com') {
    var qs = [];
    for (var k in request.querystring) qs.push(k + '=' + request.querystring[k].value);
    return r301('https://www.craydl.com' + uri + (qs.length ? '?' + qs.join('&') : ''));
  }

  if (uri === '/articles') return r301('/articles/');

  var norm = (uri.length > 1 && uri.charAt(uri.length - 1) === '/') ? uri.slice(0, -1) : uri;

  if (R.hasOwnProperty(norm)) return r301(R[norm]);

  var slug = norm.slice(1);
  if (pL.hasOwnProperty(slug)) return r301(norm + '.html');

  var op = slug.replace(/^(post|en)\//, '');
  if (P.hasOwnProperty(op)) op = P[op];
  if (aL.hasOwnProperty(op)) return r301('/articles/posts/' + op + '.html');

  if (uri.indexOf('/articles/posts/') === 0 && uri.indexOf('.html') !== -1) {
    var artSlug = uri.replace('/articles/posts/', '').replace('.html', '');
    if (artSlug && sL.hasOwnProperty(artSlug)) return r301('/blog/posts/' + artSlug + '.html');
  }

  if (uri.indexOf('/blog/') === 0 && uri.indexOf('/blog/posts/') !== 0) {
    return r301(uri.replace('/blog/', '/articles/'));
  }

  if (slug && sL.hasOwnProperty(slug)) return r301('/blog/posts/' + slug + '.html');

  var dm = uri.match(/^\/\d{4}\/\d{2}(?:\/\d{2})?\/([^\/]+)\/?$/);
  if (dm) {
    var ps = dm[1];
    if (aL.hasOwnProperty(ps)) return r301('/articles/posts/' + ps + '.html');
    if (sL.hasOwnProperty(ps)) return r301('/blog/posts/' + ps + '.html');
  }

  if (uri.charAt(uri.length - 1) === '/') {
    request.uri = uri + 'index.html';
    return request;
  }

  return request;
}
