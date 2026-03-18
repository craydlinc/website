'use client';

import React, { useState, useEffect } from 'react';

/**
 * Reads HubSpot contact property CLIENT TYPE (API internal name: usually client_type).
 * API: GET /api/get-hubspot-contact (server calls HubSpot with Private App token).
 */
const AUDIENCE_KEYS = {
  DEVELOPER: 'developer',
  HOMEOWNER: 'homeowner',
  BUILDER: 'builder',
  OWNERS_REP: 'owners_representative',
  GENERIC: 'generic',
} as const;

function normalizeClientType(value: string): string {
  const v = value.trim().toLowerCase().replace(/\s+/g, '_');
  if (
    (v.includes('owner') && v.includes('rep')) ||
    v === 'owners_representative' ||
    v === 'ownersrepresentative'
  ) {
    return AUDIENCE_KEYS.OWNERS_REP;
  }
  return v;
}

export default function AudienceHero() {
  const [audience, setAudience] = useState<string>(AUDIENCE_KEYS.GENERIC);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hasUtk =
      typeof document !== 'undefined' &&
      document.cookie.includes('hubspotutk');

    if (!hasUtk) {
      setLoading(false);
      return;
    }

    fetch('/api/get-hubspot-contact', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: { client_type?: string }) => {
        if (data.client_type) {
          setAudience(normalizeClientType(data.client_type));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
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
}
