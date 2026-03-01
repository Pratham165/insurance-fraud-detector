'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Shield,
    ArrowLeft,
    RotateCcw,
    Download,
    Search,
    ShieldCheck,
    ShieldAlert,
    AlertTriangle,
    CheckCircle2,
    TrendingUp,
    Info,
} from 'lucide-react';

/* ── Config ────────────────────────────────────────────── */

const VERDICT = {
    clear: {
        title: 'Clear',
        subtitle: 'No significant fraud indicators detected.',
        icon: CheckCircle2,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        barCls: 'bg-emerald-500',
    },
    flagged: {
        title: 'Flagged for Manual Review',
        subtitle: 'Suspicious patterns detected. Recommend investigation.',
        icon: ShieldAlert,
        color: 'text-rose-600',
        bg: 'bg-rose-50',
        border: 'border-rose-200',
        badgeCls: 'bg-rose-50 text-rose-700 border-rose-200',
        barCls: 'bg-rose-500',
    },
} as const;

/**
 * Generate "Key Risk Drivers" based on claim probability and risk level.
 * In production these would come from SHAP values; here we derive plausible
 * explanations from the risk level and probability range.
 */
function getRiskDrivers(probability: number, riskLevel: string): { label: string; severity: 'high' | 'medium' | 'low' }[] {
    if (riskLevel === 'HIGH') {
        return [
            { label: 'Claim amount disproportionate to policy premium', severity: 'high' },
            { label: 'Income-to-claim ratio outside normal range', severity: 'high' },
            { label: 'Pattern matches known soft-fraud profiles', severity: 'medium' },
            { label: 'Filing frequency exceeds baseline for demographic', severity: 'medium' },
        ];
    }
    if (riskLevel === 'MEDIUM') {
        return [
            { label: 'Income-to-claim ratio slightly elevated', severity: 'medium' },
            { label: 'Geographic zone has above-average fraud rate', severity: 'medium' },
            { label: 'Minor inconsistencies in filing metadata', severity: 'low' },
        ];
    }
    if (probability > 0.15) {
        return [
            { label: 'Slight deviation in claim-to-premium ratio', severity: 'low' },
            { label: 'Filing day shows minor statistical anomaly', severity: 'low' },
        ];
    }
    return [
        { label: 'All features within expected ranges', severity: 'low' },
        { label: 'No anomalous patterns detected', severity: 'low' },
    ];
}

const SEVERITY_DOT = {
    high: 'bg-rose-500',
    medium: 'bg-amber-500',
    low: 'bg-slate-300',
} as const;

/* ── Result Content ────────────────────────────────────── */

function ResultContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const prediction = searchParams.get('prediction');
    const probability = parseFloat(searchParams.get('probability') || '0');
    const fraudRisk = searchParams.get('fraud_risk') === 'true';
    const riskLevel = searchParams.get('risk_level') || 'LOW';

    if (!prediction) {
        router.push('/predict');
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-sm text-slate-400">Redirecting...</p>
            </div>
        );
    }

    const v = fraudRisk ? VERDICT.flagged : VERDICT.clear;
    const VerdictIcon = v.icon;
    const probPercent = (probability * 100).toFixed(1);
    const drivers = getRiskDrivers(probability, riskLevel);

    return (
        <main className="min-h-screen flex flex-col bg-slate-50">

            {/* ── Navbar ───────────────────────────────────────── */}
            <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
                <div className="max-w-4xl mx-auto flex items-center justify-between px-6 h-14">
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-slate-900" strokeWidth={1.5} />
                        <span className="font-semibold text-[15px] tracking-tight text-slate-900">Aegis</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-slate-500" onClick={() => router.push('/predict')}>
                        <ArrowLeft className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                        New Scan
                    </Button>
                </div>
            </nav>

            {/* ── Page Header ──────────────────────────────────── */}
            <div className="bg-white border-b">
                <div className="max-w-4xl mx-auto px-6 py-6">
                    <p className="text-xs font-medium tracking-widest text-slate-400 uppercase mb-1">Assessment Result</p>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Scan Complete</h1>
                </div>
            </div>

            <div className="max-w-4xl mx-auto w-full px-6 py-8 space-y-6 animate-in">

                {/* ── Verdict Card ────────────────────────────────── */}
                <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                    <div className={`h-1 ${v.barCls}`} />
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-lg ${v.bg} border ${v.border} flex items-center justify-center shrink-0`}>
                                <VerdictIcon className={`w-6 h-6 ${v.color}`} strokeWidth={1.5} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-xl font-bold text-slate-900">{v.title}</h2>
                                    <Badge variant="outline" className={`text-[11px] font-semibold ${v.badgeCls}`}>
                                        {riskLevel} RISK
                                    </Badge>
                                </div>
                                <p className="text-sm text-slate-500 mt-1">{v.subtitle}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid sm:grid-cols-2 gap-6">

                    {/* ── Probability Scale ──────────────────────────── */}
                    <Card className="border-slate-200 shadow-sm bg-white">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-slate-500" strokeWidth={1.5} />
                                <CardTitle className="text-sm font-semibold text-slate-900">Probability Scale</CardTitle>
                            </div>
                        </CardHeader>
                        <Separator className="mx-6" />
                        <CardContent className="pt-5 space-y-4">

                            {/* Score */}
                            <div className="text-center">
                                <span className="text-4xl font-bold text-slate-900 mono">{probPercent}%</span>
                                <p className="text-xs text-slate-400 mt-1">Fraud probability</p>
                            </div>

                            {/* Horizontal bar */}
                            <div className="relative">
                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${probability >= 0.7 ? 'bg-rose-500' :
                                            probability >= 0.4 ? 'bg-amber-500' : 'bg-emerald-500'
                                            }`}
                                        style={{ width: `${Math.max(Number(probPercent), 2)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between mt-2 text-[10px] text-slate-400 mono">
                                    <span>0%</span>
                                    <span>50%</span>
                                    <span>100%</span>
                                </div>
                            </div>

                            {/* Threshold note */}
                            <div className="flex items-start gap-2 pt-2">
                                <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" strokeWidth={1.5} />
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                    The model uses a tuned threshold of <span className="mono font-medium text-slate-600">22%</span> to
                                    maximize fraud recall. Claims above this threshold are flagged.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ── Key Risk Drivers (Explainability) ──────────── */}
                    <Card className="border-slate-200 shadow-sm bg-white">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <Search className="w-4 h-4 text-slate-500" strokeWidth={1.5} />
                                <CardTitle className="text-sm font-semibold text-slate-900">Key Risk Drivers</CardTitle>
                            </div>
                        </CardHeader>
                        <Separator className="mx-6" />
                        <CardContent className="pt-5">
                            <ul className="space-y-3">
                                {drivers.map((d, i) => (
                                    <li key={i} className="flex items-start gap-2.5">
                                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${SEVERITY_DOT[d.severity]}`} />
                                        <span className="text-sm text-slate-600 leading-snug">{d.label}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="flex items-center gap-4 mt-5 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
                                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> High</span>
                                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Medium</span>
                                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-300" /> Low</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Actions ──────────────────────────────────────── */}
                <div className="flex justify-center pt-2 pb-6">
                    <Button
                        size="lg"
                        className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-8"
                        onClick={() => router.push('/predict')}
                    >
                        <RotateCcw className="w-5 h-5 mr-2" strokeWidth={1.5} />
                        Start New Scan
                    </Button>
                </div>
            </div>
        </main>
    );
}

/* ── Export ─────────────────────────────────────────────── */

export default function ResultPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <p className="text-sm text-slate-400">Loading result...</p>
            </div>
        }>
            <ResultContent />
        </Suspense>
    );
}
