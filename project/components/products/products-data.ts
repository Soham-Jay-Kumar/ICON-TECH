import type { OrbTone } from './agent-orb';

/** Text in which any number of pieces (`{ em }`) are set in the accent colour. */
export type Segments = (string | { em: string })[];

export type ProductAlert = {
  vessel: string;
  /** Omitted when the source copy gives no date. */
  date?: string;
  agents: { name: string; tone: OrbTone }[];
  message: Segments;
};

export type Product = {
  id: string;
  /** Tab label. */
  name: string;
  /**
   * Wordmark shown at the top of the card. Fuel Sense is the supplied logo;
   * Operations and Asset Sense reuse its anchor and SENSE wordmark with their
   * own name set to match, until real logo files replace them.
   */
  logo: { src: string; width: number; height: number };
  cardHeading: string;
  cardSubtext: string;
  alert: ProductAlert;
};

/** The Sense Series, in tab order. Every tab renders the same layout from this. */
export const PRODUCTS: Product[] = [
  {
    id: 'fuel-sense',
    name: 'Fuel Sense',
    logo: { src: '/images/products/fuel-sense-logo.png', width: 600, height: 160 },
    cardHeading: 'AI agentic operating system that automates the fuel efficiency lifecycle',
    // `\n` is a forced line break (the subtext renders with `pre-line`).
    cardSubtext: 'Enabling faster decisions, higher productivity, and maximise fuel\nsavings',
    alert: {
      vessel: 'MV Blue Ocean',
      date: '12 Jan',
      agents: [
        { name: 'Hull', tone: 'orange' },
        { name: 'Fuel', tone: 'blue' },
      ],
      message: ['Fuel consumption abnormal ', { em: '15.5%' }, ' above expected range'],
    },
  },
  {
    id: 'operations-sense',
    name: 'Operations Sense',
    logo: { src: '/images/products/operations-sense-logo.png', width: 677, height: 160 },
    cardHeading: 'AI Agentic operating system for fleet communication and operations intelligence',
    cardSubtext:
      'Reducing operational friction by prioritizing vessel communications, analyzing operational reports, and tracking issues through to closure',
    alert: {
      vessel: 'MV Blue Ocean',
      date: '12 Jan',
      agents: [
        { name: 'Vessel Communication', tone: 'pink' },
        { name: 'Operations Intelligence', tone: 'yellow' },
      ],
      message: [
        { em: '14' },
        ' Emails need your attention, ',
        { em: '3' },
        ' AI actions completed',
      ],
    },
  },
  {
    id: 'asset-sense',
    name: 'Asset Sense',
    logo: { src: '/images/products/asset-sense-logo.png', width: 600, height: 160 },
    cardHeading: 'AI Agentic operating system for asset lifecycle management',
    cardSubtext:
      'Improving machine reliability, reducing breakdowns, accelerating data-driven troubleshooting and driving actions',
    alert: {
      vessel: 'MV Blue Ocean',
      date: '12 Jan',
      agents: [
        { name: 'Machinery Health', tone: 'teal' },
        { name: 'Technical Diagnostic', tone: 'graphite' },
      ],
      message: [
        'Main Engine Risk High, ',
        { em: '4' },
        ' anomalies detected, ',
        { em: '3' },
        ' troubleshooting in progress',
      ],
    },
  },
];
