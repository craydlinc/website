import AudienceHero from '@/components/AudienceHero';

export default function Home() {
  return (
    <main>
      <AudienceHero />
      <p style={{ textAlign: 'center', padding: '0 1rem 2rem', opacity: 0.85 }}>
        HubSpot tracking must load on this domain so the <code>hubspotutk</code>{' '}
        cookie exists for known visitors.
      </p>
    </main>
  );
}
