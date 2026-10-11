'use client';

import { useState } from 'react';
import { Container } from '@/components/site/section';
import { Box } from '@/components/what-we-do/box';
import { PauseOffscreen } from '@/components/site/pause-offscreen';

type CardId = 'ai-consulting' | 'ai-products';

/**
 * The two cards.
 *
 * All of the content now lives inside the cards themselves, revealed on hover
 * (see box.tsx), so there is no panel below them, nothing to scroll to, and
 * no page state worth putting in the URL. What remains is one piece of state
 * for the touch case: a device with no pointer never fires hover, so a tap
 * latches the reveal, and tapping the other card releases the first — only
 * one card is ever open.
 *
 * `consulting` and `products` arrive as props rather than being imported here
 * for the reason PauseOffscreen documents: children handed in from a server
 * component stay server-rendered. Importing the two faces directly would pull
 * every stage, string and icon of both into this client bundle just so a
 * boolean could decide which is visible.
 */
export function WhatWeDo({
  consulting,
  products,
}: {
  consulting: React.ReactNode;
  products: React.ReactNode;
}) {
  const [open, setOpen] = useState<CardId | null>(null);
  const toggle = (id: CardId) => setOpen((cur) => (cur === id ? null : id));

  return (
    // No background of its own: components/home/what-we-do.tsx paints one dark
    // deck (gradient + dot field) across the whole section, heading and cards
    // together, so this stays transparent rather than layering a second copy
    // that would seam at this box's own top edge.
    <div className="relative">
      <Container className="relative py-10 md:py-14">
        {/* Side by side only from `xl`. The products card carries four loop
            tiles in a row, and in a half-width card below 1280px they squeeze
            to ~99px — narrow enough that the longest stage sentence wrapped to
            seven lines and pushed the loop rule out of the card. Stacking
            gives each card the full column and keeps the tiles legible.
            PauseOffscreen because the Explore arrows nudge on an idle loop. */}
        <PauseOffscreen className="grid gap-5 xl:grid-cols-2 xl:gap-6">
          <Box
            id="box-ai-consulting"
            revealId="reveal-ai-consulting"
            tone="teal"
            open={open === 'ai-consulting'}
            onToggle={() => toggle('ai-consulting')}
            title={
              <>
                Digital Consulting and
                <br className="hidden lg:block" /> Technology Services
              </>
            }
            body="Help businesses shape digital and AI strategies, drive transformation, and develop custom AI solutions that deliver measurable business value"
            reveal={consulting}
          />
          <Box
            id="box-ai-products"
            revealId="reveal-ai-products"
            tone="copper"
            open={open === 'ai-products'}
            onToggle={() => toggle('ai-products')}
            title={
              <>
                AI Products purpose-built for
                <br className="hidden lg:block" /> maritime and beyond
              </>
            }
            body="Designing and deploying AI systems integrated into real operational environments."
            reveal={products}
          />
        </PauseOffscreen>
      </Container>
    </div>
  );
}
