'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Shield,
  ArrowRight,
  Scan,
  Network,
  TrendingUp,
  ChevronRight,
  Activity,
  Database,
  Clock,
  Target,
} from 'lucide-react';

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col bg-white">

      {/* ── Navbar ────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-slate-900" strokeWidth={1.5} />
            <span className="font-bold text-xl tracking-tight text-slate-900">Aegis</span>
            <span className="text-slate-300 mx-1">|</span>
            <span className="text-sm font-medium text-slate-600 tracking-wide">Fraud Detection</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-500 hover:text-slate-900"
            onClick={() => router.push('/predict')}
          >
            Quick Scan
            <ChevronRight className="w-4 h-4 ml-0.5" strokeWidth={1.5} />
          </Button>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="flex-1 flex items-center">
        <div className="max-w-6xl mx-auto w-full px-6 py-24 grid lg:grid-cols-2 gap-16 items-center">

          {/* Left: Copy */}
          <div className="animate-in">
            <p className="text-xs font-medium tracking-widest text-slate-400 uppercase mb-4">
              Insurance Fraud Detection
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-[1.1] mb-5">
              Catch Fraud Before<br />It Costs You
            </h1>
            <p className="text-lg text-slate-500 leading-relaxed mb-8 max-w-md">
              Aegis uses pattern recognition across 26 risk features to flag
              suspicious claims in under one second. Trained on 12,000+ real cases.
            </p>
            <div className="flex items-center gap-3">
              <Button
                size="lg"
                className="bg-slate-900 hover:bg-slate-800 text-white px-7 h-11"
                onClick={() => router.push('/predict')}
              >
                <Scan className="w-4 h-4 mr-2" strokeWidth={1.5} />
                Quick Scan
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-11 px-7 border-slate-200"
                onClick={() =>
                  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                How It Works
                <ArrowRight className="w-4 h-4 ml-2" strokeWidth={1.5} />
              </Button>
            </div>
          </div>

          {/* Right: System Health Snapshot */}
          <div className="animate-in-delay-1 hidden lg:block">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-600" strokeWidth={1.5} />
                    <span className="text-sm font-medium text-slate-900">System Status</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Operational
                  </span>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Model', value: 'Random Forest', sub: '200 estimators' },
                    { label: 'Fraud Recall', value: '98%', sub: 'Optimized threshold' },
                    { label: 'Features', value: '26', sub: 'Risk indicators' },
                    { label: 'Latency', value: '<200ms', sub: 'p95 response' },
                  ].map(({ label, value, sub }) => (
                    <div key={label} className="p-3 rounded-md bg-slate-50 border border-slate-100">
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">{label}</p>
                      <p className="text-lg font-semibold text-slate-900 mt-0.5 mono">{value}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-900 rounded-full" style={{ width: '94%' }} />
                  </div>
                  <span className="text-[11px] text-slate-400 mono">94% uptime</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Metrics Bar ────────────────────────────────────── */}
      <div className="border-y bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {[
            { icon: Database, value: '12,002', label: 'Training samples' },
            { icon: Target, value: '98%', label: 'Fraud recall' },
            { icon: Clock, value: '<1s', label: 'Avg. response' },
            { icon: Network, value: '26', label: 'Risk features' },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-white border border-slate-200 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-slate-600" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900 mono">{value}</p>
                <p className="text-xs text-slate-400">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── How It Works ───────────────────────────────────── */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <p className="text-xs font-medium tracking-widest text-slate-400 uppercase mb-2">Process</p>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">How It Works</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: Scan,
                title: 'Pattern Recognition',
                desc: 'Submit claim data and our model instantly cross-references 26 features against learned fraud patterns.',
              },
              {
                step: '02',
                icon: Network,
                title: 'Network Analysis',
                desc: 'The system evaluates relationships between income, claim amount, vehicle value, and filing patterns.',
              },
              {
                step: '03',
                icon: TrendingUp,
                title: 'Immediate ROI',
                desc: 'Get a clear verdict with confidence score and key risk drivers. Flag or clear in seconds, not days.',
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="group">
                <div className="flex items-center gap-3 mb-4">
                  <span className="mono text-xs text-slate-300 font-medium">{step}</span>
                  <div className="w-9 h-9 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center group-hover:border-slate-300 transition-colors">
                    <Icon className="w-4 h-4 text-slate-600" strokeWidth={1.5} />
                  </div>
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-slate-50 border-t">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-3">
            Ready to scan a claim?
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Submit claim details and receive a fraud assessment in under one second.
          </p>
          <Button
            size="lg"
            className="bg-slate-900 hover:bg-slate-800 text-white px-8 h-11"
            onClick={() => router.push('/predict')}
          >
            <Scan className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Start Assessment
          </Button>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t py-5 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Aegis</span>
          </div>
          <span>ML-Powered Insurance Fraud Detection</span>
        </div>
      </footer>
    </main>
  );
}
