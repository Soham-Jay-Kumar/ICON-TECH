'use client';

import { useEffect, useState } from 'react';

/**
 * Renders the current year, correcting itself on the client.
 *
 * Both pages are statically prerendered, so a bare `new Date().getFullYear()`
 * in a server component is evaluated once at build time and then frozen into
 * the HTML — the footer would still read the build year on January 1st.
 *
 * The build-time year is passed in as `initial` so the server and the first
 * client render agree (no hydration mismatch); the effect only does anything
 * on the day the two actually differ.
 */
export function CurrentYear({ initial }: { initial: number }) {
  const [year, setYear] = useState(initial);

  useEffect(() => {
    const current = new Date().getFullYear();
    if (current !== initial) setYear(current);
  }, [initial]);

  return <>{year}</>;
}
