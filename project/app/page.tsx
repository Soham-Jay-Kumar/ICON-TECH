import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
import { Hero } from '@/components/home/hero';
import { WhoWeAre } from '@/components/home/who-we-are';
import { VisionMission } from '@/components/home/vision-mission';
import { Products } from '@/components/home/products';
import { TrustedBy } from '@/components/home/trusted-by';
import { Results } from '@/components/home/results';
import { Testimonials } from '@/components/home/testimonials';
import { Team } from '@/components/home/team';
import { Blogs } from '@/components/home/blogs';
import { Cta } from '@/components/home/cta';

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <WhoWeAre />
      <VisionMission />
      <Products />
      <TrustedBy />
      <Results />
      <Testimonials />
      <Team />
      <Blogs />
      <Cta />
      <Footer />
    </main>
  );
}
