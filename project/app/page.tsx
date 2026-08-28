import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
import { Hero } from '@/components/home/hero';
import { WhatWeDo } from '@/components/home/what-we-do';
import { WhoWeAre } from '@/components/home/who-we-are';
import { VisionMission } from '@/components/home/vision-mission';
import { Products } from '@/components/home/products';
import { Results } from '@/components/home/results';
import { Blogs } from '@/components/home/blogs';
import { Cta } from '@/components/home/cta';

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <WhatWeDo />
      <Products />
      <WhoWeAre />
      <VisionMission />
      <Results />
      <Blogs />
      <Cta />
      <Footer />
    </main>
  );
}
