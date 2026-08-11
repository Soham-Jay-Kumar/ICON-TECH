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
      <Image
        src="/images/icon-technology-logo.png"
        alt="Icon Technology"
        width={462}
        height={271}
        priority
        className={cn('w-auto', dark && 'brightness-0 invert')}
        style={style}
      />
    </Link>
  );
}
