import { Link, Navigate } from 'react-router-dom';
import api from '../lib/api';
import '../styles/landing.css';

const FEATURES = [
  { icon: '📋', title: 'Task Management', text: 'Create, assign, and track tasks' },
  { icon: '📁', title: 'Projects', text: 'Organize tasks into projects' },
  { icon: '👥', title: 'Teams', text: 'Collaborate with team members' },
  { icon: '📊', title: 'Analytics', text: 'Track productivity with charts' },
];

export default function Landing() {
  // Mirror of the original `if (api.isAuthenticated()) location = '/dashboard'`.
  if (api.isAuthenticated()) return <Navigate to="/dashboard" replace />;

  return (
    <div className="landing">
      <div className="landing-card">
        <h1>
          ⚡ Task<span>Flow</span>
        </h1>
        <p>
          A collaborative task management and productivity platform.
        </p>
        <div className="landing-btns">
          <Link to="/login" className="btn btn-white">
            Get Started
          </Link>
          <Link to="/register" className="btn btn-ghost">
            Create Account
          </Link>
        </div>
        <div className="features">
          {FEATURES.map((feature) => (
            <div className="feature" key={feature.title}>
              <div className="icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
