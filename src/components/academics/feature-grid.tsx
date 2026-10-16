"use client";

import Link from "next/link";
import { FeatureCard } from "./feature-cards";

interface FeatureGridProps {
  features: FeatureCard[];
}

/**
 * Compact icon-card grid for the selected-college academic dashboard.
 * Each tile is a single link covering the whole card: a large icon
 * container tinted with the section's own color plus the feature name.
 * `data-tone` carries the color identity into CSS — no descriptions,
 * badges or separate actions.
 */
export function FeatureGrid({ features }: FeatureGridProps) {
  return (
    <nav className="feature-grid" aria-label="Academic tools">
      {features.map((f) => (
        <Link key={f.href} href={f.href} className="feature-card" data-tone={f.tone}>
          <span className="feature-card-icon" aria-hidden="true">
            {f.icon}
          </span>
          <span className="feature-card-name">{f.title}</span>
        </Link>
      ))}
    </nav>
  );
}
