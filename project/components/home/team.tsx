import { Ship } from 'lucide-react';
import { Container, Section } from '@/components/site/section';
import { Reveal } from '@/components/site/reveal';

export function Team() {
  return (
    <Section id="team" data-shot="team" className="bg-white">
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Reveal variant="fade">
              <p className="eyebrow mb-4">The Team</p>
            </Reveal>
            <Reveal variant="rise-mask" duration="cinematic" delay={120}>
              <h2 className="text-display-md font-semibold text-navy-900">
                Our professional partners<span className="text-brand-500">.</span>
              </h2>
            </Reveal>
          </div>
          <Reveal delay={100}>
            <p className="max-w-xs text-sm leading-relaxed text-navy-400">
              Our leaders are on a mission to reshape how shipping uses data to
              make decisions.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-[1.7fr_1fr_1fr]">
          <Reveal className="group relative overflow-hidden rounded-4xl bg-navy-950 transition duration-ui ease-standard hover:-translate-y-1 md:col-span-2 lg:col-span-1">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-60 [background-image:repeating-linear-gradient(115deg,transparent,transparent_60px,rgba(255,255,255,0.05)_60px,rgba(255,255,255,0.05)_61px)]"
            />
            <div className="relative flex h-full min-h-[380px]">
              <div className="flex flex-1 flex-col justify-end p-8">
                <Ship className="mb-6 h-10 w-10 text-brand-500" />
                <p className="text-2xl font-semibold text-white">
                  Uttam Kumar<span className="text-brand-500">.</span>
                </p>
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.2em] text-white/50">
                  Chief Executive Officer
                </p>
              </div>
              <img
                src="https://images.pexels.com/photos/4965009/pexels-photo-4965009.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
                alt="Portrait of Uttam Kumar"
                className="w-1/2 object-cover object-top transition-transform duration-ui ease-standard group-hover:scale-[1.03]"
              />
            </div>
          </Reveal>

          {[
            {
              name: 'Daniel Osei',
              role: 'Chief Technology Officer',
              image:
                'https://images.pexels.com/photos/7408085/pexels-photo-7408085.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
            },
            {
              name: 'Kenji Watanabe',
              role: 'Head of Maritime AI',
              image:
                'https://images.pexels.com/photos/32321525/pexels-photo-32321525.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
            },
          ].map((member, i) => (
            <Reveal
              key={member.name}
              delay={(i + 1) * 100}
              className="group relative min-h-[380px] overflow-hidden rounded-4xl transition duration-ui ease-standard hover:-translate-y-1"
            >
              <img
                src={member.image}
                alt={`Portrait of ${member.name}`}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-ui ease-standard group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="text-xl font-semibold text-white">
                  {member.name}
                  <span className="text-brand-500">.</span>
                </p>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white/60">
                  {member.role}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
