import React, { useState, useEffect } from 'react';

/**
 * Personalized hero: uses HubSpot cookie + server API (never call HubSpot from the browser).
 * Prefer property CLIENT TYPE (API: `client_type`). This file still uses `customer_type` in the response — use craydl-app for `client_type`.
 */
const AUDIENCE_KEYS = {
  DEVELOPER: 'developer',
  HOMEOWNER: 'homeowner',
  BUILDER: 'builder',
  OWNERS_REP: 'owners_representative',
  GENERIC: 'generic',
};

function normalizeCustomerType(value) {
  if (!value || typeof value !== 'string') return AUDIENCE_KEYS.GENERIC;
  const v = value.trim().toLowerCase().replace(/\s+/g, '_');
  if (v.includes('owner') && v.includes('rep')) return AUDIENCE_KEYS.OWNERS_REP;
  if (v === 'owners_representative' || v === 'ownersrepresentative')
    return AUDIENCE_KEYS.OWNERS_REP;
  return v;
}

const AudienceHero = () => {
  const [audience, setAudience] = useState(AUDIENCE_KEYS.GENERIC);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hubspotCookie = document.cookie.includes('hubspotutk');

    if (hubspotCookie) {
      fetch('/api/get-hubspot-contact', {
        credentials: 'same-origin',
      })
        .then((res) => (res.ok ? res.json() : {}))
        .then((data) => {
          if (data.customer_type) {
            setAudience(normalizeCustomerType(data.customer_type));
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="hero-container" aria-busy="true">
        <p className="hero-loading">Loading…</p>
      </div>
    );
  }

  return (
    <div className="hero-container">
      {audience === AUDIENCE_KEYS.DEVELOPER && (
        <h1>Scalable Solutions for Large-Scale Developments</h1>
      )}
      {audience === AUDIENCE_KEYS.HOMEOWNER && (
        <h1>Build Your Dream Home with Precision</h1>
      )}
      {audience === AUDIENCE_KEYS.BUILDER && (
        <h1>The Professional Partner for Your Next Project</h1>
      )}
      {audience === AUDIENCE_KEYS.OWNERS_REP && (
        <h1>Expert Oversight for Your Capital Projects</h1>
      )}
      {audience === AUDIENCE_KEYS.GENERIC && (
        <h1>Revolutionizing the Way We Build</h1>
      )}
      <p>Welcome back to CRAYDL.</p>
    </div>
  );
};

export default AudienceHero;
