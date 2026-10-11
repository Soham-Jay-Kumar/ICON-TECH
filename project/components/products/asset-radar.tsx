'use client';

import { PauseOffscreen } from '@/components/site/pause-offscreen';
import { AgentOrb, type OrbTone } from './agent-orb';
import styles from './asset-radar.module.css';

const AGENTS: { tone: OrbTone; x: number; y: number; size: number }[] = [
  { tone: 'blue', x: 31.25, y: 30.6, size: 15 },
  { tone: 'orange', x: 70, y: 37.5, size: 15 },
  { tone: 'teal', x: 20, y: 67.5, size: 10 },
  { tone: 'graphite', x: 80, y: 72.5, size: 10 },
];

/** Fixed targets on a radar display; only the green scan layer rotates. */
export function AssetRadar() {
  return (
    <PauseOffscreen className={styles.field} aria-hidden="true">
      <div className={styles.radar}>
        <div className={`${styles.sweep} radar-sweep-anim`} />
        <svg viewBox="0 0 320 320" className={styles.grid} fill="none">
          <g stroke="#398995" strokeWidth="0.65" opacity="0.8">
            {[40, 80, 120].map((radius) => (
              <circle key={radius} cx="160" cy="160" r={radius} strokeDasharray="1 1" />
            ))}
            <path d="M160 0V320M0 160H320" />
          </g>
        </svg>
        {AGENTS.map((agent) => (
          <AgentOrb
            key={agent.tone}
            tone={agent.tone}
            className={styles.agent}
            style={{ left: `${agent.x}%`, top: `${agent.y}%`, width: `${agent.size}%` }}
          />
        ))}
        <span className={styles.center} />
      </div>
    </PauseOffscreen>
  );
}
