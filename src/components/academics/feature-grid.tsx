"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { FeatureCard } from "./feature-cards";

interface FeatureGridProps {
  features: FeatureCard[];
}

export function FeatureGrid({ features }: FeatureGridProps) {
  return (
    <div className="feature-grid">
      {features.map((f) => (
        <Link
          key={f.href}
          href={f.href}
          className="feature-card"
        >
          <div className="feature-card-header">
            <span className="brand-mark" aria-hidden="true">{f.icon}</span>
            <span className="tag tag-muted">{f.tag}</span>
          </div>
          <div className="feature-card-body">
            <h2>{f.title}</h2>
            <p className="text-sm muted">{f.body}</p>
          </div>
          <span className="feature-card-footer">
            Open <ArrowUpRight size={13} aria-hidden="true" />
          </span>
        </Link>
      ))}
    </div>
  );
}