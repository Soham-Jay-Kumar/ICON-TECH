import { z } from 'zod';

/**
 * Shape of a demo request. Shared deliberately: the form validates against it
 * in the browser for the inline error messages, and the route handler
 * re-validates against the same definition because anything arriving over the
 * network is untrusted regardless of what the form did.
 */
export const demoRequestSchema = z.object({
  name: z.string().trim().min(1, 'Please enter your name'),
  email: z
    .string()
    .trim()
    .min(1, 'Please enter your work email')
    .email('Please enter a valid email address'),
  company: z.string().trim().min(1, 'Please enter your company name'),
  phone: z
    .string()
    .trim()
    .min(7, 'Please enter a phone number we can reach you on'),
  message: z.string().trim().optional(),
});

export type DemoRequest = z.infer<typeof demoRequestSchema>;
