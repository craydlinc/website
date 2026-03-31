// CloudFront Function: redirects + directory index rewrite (ES 5.1)
var pageRedirects = {
  '/custom-home-building-blog': '/articles/',
  '/custom-home-building-blog/': '/articles/',
  '/contact-craydl': '/contact.html',
  '/contact-craydl/': '/contact.html',
  '/about-craydl': '/',
  '/about-craydl/': '/',
  '/craydl-services': '/services.html',
  '/craydl-services/': '/services.html',
  '/remodel': '/services.html',
  '/remodel/': '/services.html',
  '/new-construction': '/services.html',
  '/new-construction/': '/services.html',
  '/architects': '/architects.html',
  '/architects/': '/architects.html',
  '/builders': '/builders.html',
  '/builders/': '/builders.html',
  '/developers': '/developers.html',
  '/developers/': '/developers.html',
  '/interior-designers': '/interior-designers.html',
  '/interior-designers/': '/interior-designers.html',
  '/-interiordesigners': '/interior-designers.html',
  '/-interiordesigners/': '/interior-designers.html',
  '/homeowners': '/homeowners.html',
  '/homeowners/': '/homeowners.html',
  '/confident-home-design-with-virtual-construction-craydl': '/homeowners.html',
  '/confident-home-design-with-virtual-construction-craydl/': '/homeowners.html',
  '/owners-rep': '/owners-rep.html',
  '/owners-rep/': '/owners-rep.html',
  '/owners-representative': '/owners-rep.html',
  '/owners-representative/': '/owners-rep.html',
  '/who-we-serve': '/',
  '/who-we-serve/': '/',
  '/why-craydl': '/',
  '/why-craydl/': '/',
  '/project-samples': '/#new-home-tours',
  '/project-samples/': '/#new-home-tours',
  '/calculator': 'https://budget.craydl.com/',
  '/calculator/': 'https://budget.craydl.com/',
  '/builder-intake-form': '/builders.html',
  '/builder-intake-form/': '/builders.html',
  '/homeowner-intake-form': '/contact.html',
  '/homeowner-intake-form/': '/contact.html',
  '/interior-designer-intake-form': '/contact.html',
  '/interior-designer-intake-form/': '/contact.html',
  '/thank-you-for-downloading': '/thank-you.html',
  '/thank-you-for-downloading/': '/thank-you.html',
  '/blog': '/articles/',
  '/blog/': '/articles/',
  '/preconstruction-planning': '/',
  '/preconstruction-planning/': '/',
  '/preconstruction': '/',
  '/preconstruction/': '/',
  '/architects-bim-services': '/architects.html',
  '/architects-bim-services/': '/architects.html',
  '/bim-services-for-architects': '/architects.html',
  '/bim-services-for-architects/': '/architects.html',
  '/custom-homes': '/homeowners.html',
  '/custom-homes/': '/homeowners.html',
  '/custom-home': '/homeowners.html',
  '/custom-home/': '/homeowners.html',
  '/what-craydl-brings-to-the-table-for-architects': '/architects.html',
  '/what-craydl-brings-to-the-table-for-architects/': '/architects.html',
  '/revolutionizing-preconstruction-the-visionary-founder-of-craydl': '/contact.html',
  '/revolutionizing-preconstruction-the-visionary-founder-of-craydl/': '/contact.html'
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

var articleLookup = {};
for (var i = 0; i < articleSlugs.length; i++) {
  articleLookup[articleSlugs[i]] = true;
}
var seoLookup = {};
for (var i = 0; i < seoSlugs.length; i++) {
  seoLookup[seoSlugs[i]] = true;
}

function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (pageRedirects.hasOwnProperty(uri)) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: pageRedirects[uri] } }
    };
  }

  if (uri.indexOf('/articles/posts/') === 0 && uri.indexOf('.html') !== -1) {
    var artSlug = uri.replace('/articles/posts/', '').replace('.html', '');
    if (artSlug && seoLookup.hasOwnProperty(artSlug)) {
      return {
        statusCode: 301,
        statusDescription: 'Moved Permanently',
        headers: { location: { value: '/blog/posts/' + artSlug + '.html' } }
      };
    }
  }

  if (uri.indexOf('/blog/') === 0 && uri.indexOf('/blog/posts/') !== 0) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: uri.replace('/blog/', '/articles/') } }
    };
  }

  var slug = uri.replace(/^\//, '').replace(/\/$/, '');
  if (slug && articleLookup.hasOwnProperty(slug)) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: '/articles/posts/' + slug + '.html' } }
    };
  }
  if (slug && seoLookup.hasOwnProperty(slug)) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: '/blog/posts/' + slug + '.html' } }
    };
  }

  if (uri.indexOf('/category/') === 0 || uri.indexOf('/tag/') === 0 || uri.indexOf('/author/') === 0) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: '/articles/' } }
    };
  }

  if (uri.indexOf('/en/') === 0 || uri === '/en') {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: '/' } }
    };
  }

  if (uri.indexOf('/wp-content/') === 0) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: '/interior-designers.html' } }
    };
  }

  if (uri.indexOf('/feed') === 0 || uri.indexOf('/wp-json/') === 0 || uri.indexOf('/wp-admin') === 0 || uri.indexOf('/wp-login') === 0) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: '/' } }
    };
  }

  if (uri.charAt(uri.length - 1) === '/') {
    request.uri = uri + 'index.html';
    return request;
  }

  return request;
}
