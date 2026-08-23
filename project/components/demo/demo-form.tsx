'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { demoRequestSchema, type DemoRequest } from '@/lib/demo-request';
import { cn } from '@/lib/utils';

const FIELD_BASE =
  'w-full rounded-xl border bg-white px-4 text-[15px] text-[#072637] placeholder:text-[#98A2B2] transition-colors duration-micro ease-standard focus:outline-none focus:ring-2';
const FIELD_IDLE =
  'border-[#E6EDF1] focus:border-[#FA8837] focus:ring-[#FA8837]/25';
const FIELD_ERROR = 'border-[#D14343] focus:border-[#D14343] focus:ring-[#D14343]/20';

function Field({
  id,
  label,
  required,
  error,
  index,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  /** Position in the form; drives the entrance stagger. */
  index: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="animate-field-in motion-reduce:animate-none"
      style={{
        // Stagger step derived from the shared token, never a raw ms value.
        // 0.35× micro ⇒ a ~280ms cascade across five fields, inside the
        // ~400ms per-group budget in TRANSITIONS.md §6.
        animationDelay: `calc(var(--motion-duration-micro) * ${(index * 0.35).toFixed(2)})`,
      }}
    >
      <label
        htmlFor={id}
        className="mb-1.5 block text-[13px] font-medium text-[#0C3D59]"
      >
        {label}
        {required && <span className="text-[#FA8837]">*</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[12px] text-[#D14343]">
          {error}
        </p>
      )}
    </div>
  );
}

export function DemoForm() {
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DemoRequest>({
    resolver: zodResolver(demoRequestSchema),
    mode: 'onSubmit',
  });

  // The success panel below promises that a specialist will follow up, so it
  // may only be shown once the request has actually been accepted for
  // delivery. Anything else — validation, misconfiguration, an unreachable
  // destination, an offline browser — keeps the filled-in form on screen and
  // says so, rather than reporting a success that did not happen.
  const onSubmit = async (values: DemoRequest) => {
    setFailed(false);

    try {
      const response = await fetch('/api/demo-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        setFailed(true);
        return;
      }
    } catch {
      setFailed(true);
      return;
    }

    setSent(true);
  };

  // Shared props for wiring a field's error state to assistive tech.
  const a11y = (key: keyof DemoRequest) =>
    errors[key]
      ? { 'aria-invalid': true as const, 'aria-describedby': `${key}-error` }
      : {};

  if (sent) {
    return (
      <div
        role="status"
        className="animate-panel-in rounded-3xl border border-[#E6EDF1] bg-white p-6 text-center shadow-panel motion-reduce:animate-none md:p-8"
      >
        <span
          aria-hidden
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FEEDE0]"
        >
          {/* Tick draws itself on: one dash the length of the path, offset to
              hidden, animated to 0. pathLength normalises the geometry so the
              dash values don't depend on the curve's real length. */}
          <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="#FA8837"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              className="animate-tick-draw motion-reduce:animate-none"
            />
          </svg>
        </span>
        <h2 className="mt-5 text-[clamp(1.35rem,1.9vw,28px)] font-medium leading-[1.25] text-[#072637]">
          Request received
          <span className="text-[#FA8837]">.</span>
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-[1.6] text-[#54778A]">
          A maritime AI specialist will reach out within one business day.
        </p>
      </div>
    );
  }

  return (
    <div className="relative rounded-3xl border border-[#E6EDF1] bg-white p-6 shadow-panel md:p-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/sparkle-icon.png"
        alt=""
        aria-hidden
        draggable={false}
        // Pulled out of the heading's flow and pinned above the "k" of
        // "back" in the paragraph below — an offset measured off the card at
        // its resolved 540px width, not something that tracks the text's own
        // reflow. Held to `lg:block`, not `md:block`: below `lg` the grid is
        // single-column and this card is no longer capped at 540px, so the
        // fixed offset would drift off "back" instead of sitting above it.
        //
        // `top` is set so the icon's own vertical *centre* lands on the "R"
        // glyph's cap-height centre (measured off a rendered screenshot,
        // since that band isn't something a CSS property exposes) rather
        // than sharing its top edge — being taller than the cap-height, a
        // top-aligned icon reads as sinking below the heading's line instead
        // of sitting level with it.
        //
        // Sized larger than the heading's cap-height (a round glyph reads
        // smaller than a capital letter at the same bounding-box height,
        // since a circle only fills ~79% of its own box) but still short of
        // the full 1em font-box, i.e. still visibly smaller than the "R" in
        // "Request" — via a matching font-size, since it no longer inherits
        // one from sitting inside the h2.
        className="absolute right-[37px] top-[37px] hidden h-[0.85em] w-[0.85em] select-none text-[28px] lg:block"
      />
      <h2 className="text-[clamp(1.35rem,1.9vw,28px)] font-medium leading-[1.25] text-[#072637]">
        Request a Pilot Discussion
        <span className="text-[#FA8837]">.</span>
      </h2>
      <p className="mt-2 text-[15px] leading-[1.6] text-[#54778A]">
        We&apos;d love to hear from you. Fill out the form and we&apos;ll get back
        to you as soon as possible.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-7 space-y-5">
        <Field id="name" label="Name" required index={0} error={errors.name?.message}>
          <input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Your name"
            className={cn('h-12', FIELD_BASE, errors.name ? FIELD_ERROR : FIELD_IDLE)}
            {...a11y('name')}
            {...register('name')}
          />
        </Field>

        <Field id="email" label="Work email" required index={1} error={errors.email?.message}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="Your work email"
            className={cn('h-12', FIELD_BASE, errors.email ? FIELD_ERROR : FIELD_IDLE)}
            {...a11y('email')}
            {...register('email')}
          />
        </Field>

        <Field
          id="company"
          label="Company name"
          required
          index={2}
          error={errors.company?.message}
        >
          <input
            id="company"
            type="text"
            autoComplete="organization"
            placeholder="Your company name"
            className={cn(
              'h-12',
              FIELD_BASE,
              errors.company ? FIELD_ERROR : FIELD_IDLE
            )}
            {...a11y('company')}
            {...register('company')}
          />
        </Field>

        <Field id="phone" label="Phone number" required index={3} error={errors.phone?.message}>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+65 6123 4567"
            className={cn('h-12', FIELD_BASE, errors.phone ? FIELD_ERROR : FIELD_IDLE)}
            {...a11y('phone')}
            {...register('phone')}
          />
        </Field>

        <Field id="message" label="What are you looking for?" index={4}>
          <textarea
            id="message"
            rows={4}
            placeholder="Describe your needs..."
            className={cn('min-h-[120px] resize-y py-3', FIELD_BASE, FIELD_IDLE)}
            {...register('message')}
          />
        </Field>

        {failed && (
          <p
            role="alert"
            className="rounded-xl border border-[#D14343]/30 bg-[#FDF3F3] px-4 py-3 text-[13px] leading-[1.55] text-[#D14343]"
          >
            We couldn&apos;t send your request just now. Please try again in a
            moment — your details are still here.
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-[52px] w-full rounded-full bg-[#072637] text-[15px] font-semibold uppercase tracking-[0.04em] text-white transition duration-micro ease-standard hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Sending…' : 'Submit'}
        </button>

        {/* The Terms and Privacy pages do not exist yet, so these are named in
            plain text rather than linked. They were `href="#"`, which — with
            the global `scroll-behavior: smooth` — simply glided the page back
            to the top: a dead link on the consent statement for a form that
            collects name, work email, company and phone number. Restore the
            anchors here (pointing at the real routes) as soon as those pages
            ship; a consent line should always be able to show what is being
            consented to. */}
        <p className="text-[12px] leading-[1.55] text-[#98A2B2]">
          By clicking Submit, you agree to Icon Technology&apos;s Terms of
          Service and Privacy Policy, and you consent to being contacted about
          your demo request.
        </p>
      </form>
    </div>
  );
}
