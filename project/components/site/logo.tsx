import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function Logo({
  dark = false,
  className,
  style,
}: {
  dark?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Link
      href="/"
      className={cn('inline-flex shrink-0 items-center leading-none', className)}
      aria-label="Icon Technology"
    >
      {/* `dark` swaps the artwork rather than filtering it. The light logo is
          a flat RGB file with no alpha channel, so the obvious
          `brightness-0 invert` turned the whole rectangle white — a solid
          block, not a white wordmark. The dark variant is the RGBA cut made
          for exactly this case, and it keeps the mark's brand colours instead
          of flattening them to one tone. */}
      <Image
        src={
          dark
            ? '/images/icon-technology-logo-dark.png'
            : '/images/icon-technology-logo.png'
        }
        alt="Icon Technology"
        width={462}
        height={271}
        priority
        className="w-auto"
        style={style}
      />
    </Link>
  );
}
