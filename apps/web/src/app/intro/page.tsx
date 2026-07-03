"use client";

import { IntroHero } from "@/components/landing/intro-hero";
import { FeatureShowcase } from "@/components/landing/feature-showcase";

export default function IntroPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <IntroHero />
      <div className="pt-24">
        <FeatureShowcase />
      </div>
      <footer className="py-8 bg-zinc-950 border-t border-zinc-800">
        <div className="container max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm text-zinc-600">© 2026 TeamDJ. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
