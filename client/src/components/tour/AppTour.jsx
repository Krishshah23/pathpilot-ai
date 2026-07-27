/**
 * components/tour/AppTour.jsx — First-Login Product Tour (Task 3)
 *
 * Mounted from OverviewPage (the only page with every spotlight target —
 * nav links live in AppShell, the Path Score card is Overview-only). Two
 * ways to start:
 *   1. Automatic — first time a user lands on Overview post-onboarding,
 *      gated by `pp_tour_done` in localStorage, 1s delay.
 *   2. Manual — "Take a Tour" in the account dropdown (AppShell) sets
 *      `pp_tour_requested`, navigates to /dashboard, and dispatches
 *      `start-app-tour` (covers both "already on Overview" and
 *      "navigating in from elsewhere" cases).
 *
 * Desktop-only: the spotlighted nav links are `hidden md:flex` (see
 * AppShell's TopNav), so the tour simply doesn't start below that
 * breakpoint rather than spotlighting invisible elements.
 */

import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const DONE_KEY = 'pp_tour_done';
const REQUEST_KEY = 'pp_tour_requested';
const DESKTOP_BREAKPOINT = 768; // matches Tailwind `md:`

function buildSteps(navigate) {
  return [
    {
      popover: {
        title: 'Welcome to PathPilot 👋',
        description: 'Let us show you around in 60 seconds.',
      },
    },
    {
      element: '[data-tour="nav-talent-analyzer"]',
      popover: {
        title: 'Upload Resume',
        description: 'Start here — upload your resume and get an instant AI analysis of your readiness.',
      },
    },
    {
      element: '[data-tour="path-score-card"]',
      popover: {
        title: 'Path Score',
        description: 'Your Path Score is your career readiness at a glance — updated every time you improve your profile.',
      },
    },
    {
      element: '[data-tour="nav-execution-engine"]',
      popover: {
        title: 'Skill Roadmap',
        description: 'Get a personalized week-by-week plan to close your skill gaps for your dream role.',
      },
    },
    {
      element: '[data-tour="nav-interview-prep"]',
      popover: {
        title: 'Interview Prep',
        description: 'Practice with an AI coach that knows exactly which gaps to test you on.',
      },
    },
    {
      element: '[data-tour="nav-resume-builder"]',
      popover: {
        title: 'Resume Builder',
        description: 'Build, edit, or migrate your resume — with live ATS scoring as you write.',
      },
    },
    {
      element: '[data-tour="coach-button"]',
      popover: {
        title: 'AI Career Coach',
        description: 'Ask your AI Career Coach anything — it knows your resume, your gaps, and your goals.',
      },
    },
    {
      popover: {
        title: "You're all set 🚀",
        description: "Let's get you career-ready.",
        onNextClick: () => {
          navigate('/talent-analyzer');
          driverInstance?.destroy();
        },
        nextBtnText: 'Start with Resume Strategy →',
      },
    },
  ];
}

let driverInstance = null;

function runTour(navigate) {
  driverInstance = driver({
    showProgress: true,
    animate: true,
    popoverClass: 'pp-tour-popover',
    skipMissingElement: true,
    steps: buildSteps(navigate),
    onDestroyed: () => { localStorage.setItem(DONE_KEY, '1'); },
  });
  driverInstance.drive();
}

export function AppTour({ navigate }) {
  useEffect(() => {
    const isDesktop = window.innerWidth >= DESKTOP_BREAKPOINT;
    if (!isDesktop) return;

    // Manual re-trigger requested from another page, navigated in here
    if (localStorage.getItem(REQUEST_KEY)) {
      localStorage.removeItem(REQUEST_KEY);
      const t = setTimeout(() => runTour(navigate), 400);
      return () => clearTimeout(t);
    }

    // First-ever visit to Overview
    if (!localStorage.getItem(DONE_KEY)) {
      const t = setTimeout(() => runTour(navigate), 1000);
      return () => clearTimeout(t);
    }
  }, [navigate]);

  // Manual re-trigger while already on Overview (component doesn't remount,
  // so the mount-effect above won't see the request flag — clear it here too)
  useEffect(() => {
    const onStart = () => {
      localStorage.removeItem(REQUEST_KEY);
      if (window.innerWidth >= DESKTOP_BREAKPOINT) runTour(navigate);
    };
    window.addEventListener('start-app-tour', onStart);
    return () => window.removeEventListener('start-app-tour', onStart);
  }, [navigate]);

  return null;
}
