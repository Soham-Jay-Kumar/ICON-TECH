import { cn } from '@/lib/utils';

export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn('container-site', className)}>{children}</div>;
}

export function Section({
  className,
  id,
  children,
  ...rest
}: React.ComponentPropsWithoutRef<'section'>) {
  return (
    <section id={id} className={cn('section', className)} {...rest}>
      {children}
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  align = 'center',
  dark = false,
  className,
}: {
  eyebrow?: string;
  title: string;
  align?: 'left' | 'center';
  dark?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'max-w-3xl',
        align === 'center' ? 'mx-auto text-center' : 'text-left',
        className
      )}
    >
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h2
        className={cn(
          'text-display-md font-semibold dot-accent',
          dark ? 'text-white' : 'text-navy-900'
        )}
      >
        {title}
      </h2>
    </div>
  );
}
