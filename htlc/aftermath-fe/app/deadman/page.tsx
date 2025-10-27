'use client';

import DeadManSwitch from '@/components/DeadManSwitch';

export default function DeadManPage() {
  return (
    <main style={{
      minHeight: '100vh',
      padding: '2rem',
      backgroundImage: 'url(/Landing.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      position: 'relative'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.5)',
        zIndex: -1
      }}></div>
      <div style={{ position: 'relative', zIndex: 10 }}>
        <DeadManSwitch />
      </div>
    </main>
  );
}
