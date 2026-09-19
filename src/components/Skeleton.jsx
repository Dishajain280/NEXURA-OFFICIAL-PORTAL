import React from "react";

const shimmer = "animate-pulse bg-white/5 rounded";

export function SkeletonLine({ className = "" }) {
  return <div className={`h-4 ${shimmer} ${className}`} />;
}

export function SkeletonCircle({ className = "" }) {
  return <div className={`rounded-full ${shimmer} ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <SkeletonCircle className="w-10 h-10 shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="w-2/3" />
          <SkeletonLine className="w-1/3 h-3" />
        </div>
      </div>
      <SkeletonLine />
      <SkeletonLine className="w-4/5" />
      <div className="flex gap-3 pt-2">
        <SkeletonLine className="w-20 h-6 rounded-lg" />
        <SkeletonLine className="w-16 h-6 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="card p-5 space-y-3">
      <SkeletonLine className="w-1/2 h-3" />
      <SkeletonLine className="w-1/3 h-8" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b border-white/5">
          <SkeletonCircle className="w-8 h-8 shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonLine className="w-1/3" />
            <SkeletonLine className="w-1/4 h-3" />
          </div>
          <SkeletonLine className="w-16 h-6 rounded-lg shrink-0" />
        </div>
      ))}
    </div>
  );
}

export default function Skeleton({ className = "" }) {
  return <div className={`${shimmer} ${className}`} />;
}
