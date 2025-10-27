import React from 'react';
import './Landing.css';

export default function Landing({ onGetStarted }) {
  return (
    <div className="landing-container">
      <div className="landing-content">
        <h1 className="landing-title">
          <span className="title-icon"></span>
          AfterMath
        </h1>
        <p className="landing-subtitle">Secure Legacy & Inheritance Protocol with Auto-Activity Tracking</p>
        
        <button className="get-started-btn" onClick={onGetStarted}>
          Get Started
        </button>
      </div>
    </div>
  );
}
