'use client';

import Link from 'next/link';
import styles from './landing.module.css';

export default function Landing() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>
          AfterMath
        </h1>
        <p className={styles.subtitle}>
          Secure Legacy & Inheritance Protocol with Auto-Activity Tracking
        </p>
        
        <Link href="/deadman" className={styles.button}>
          Get Started
        </Link>
      </div>
    </div>
  );
}
