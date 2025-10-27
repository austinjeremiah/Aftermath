import styles from './landing.module.css';

export const metadata = {
  title: 'AfterMath - Landing',
};

export default function Home() {
  return (
    <div className={styles.container} style={{
      backgroundImage: 'url(/Landing.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.4)',
        zIndex: 1
      }}></div>
      <div className={styles.content}>
        <h1 className={styles.title}>
          AfterMath
        </h1>
        <p className={styles.subtitle}>
          Aftermath secures your assets across chains and seamlessly transfers them to your loved ones when you’re gone.
        </p>
        
        <a href="/deadman" className={styles.button}>
          Get Started
        </a>
      </div>
    </div>
  );
}
