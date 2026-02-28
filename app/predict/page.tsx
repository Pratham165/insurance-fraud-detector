'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { predictFraud } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
    Shield,
    ArrowLeft,
    User,
    FileText,
    Car,
    Loader2,
    AlertCircle,
    Scan,
} from 'lucide-react';

/* ── Constants ─────────────────────────────────────────── */

const NUMERIC_FIELDS = [
    'age_of_driver', 'marital_status', 'annual_income', 'high_education',
    'safety_rating', 'address_change', 'zip_code',
    'past_num_of_claims', 'witness_present', 'liab_prct', 'police_report',
    'age_of_vehicle', 'vehicle_price', 'total_claim', 'injury_claim',
    'policy deductible', 'annual premium', 'days open', 'form defects'
];

const initialForm: Record<string, string> = {
    age_of_driver: '',
    gender: 'M',
    marital_status: '1',
    annual_income: '',
    high_education: '1',
    claim_day_of_week: 'Monday',
    safety_rating: '',
    address_change: '0',
    property_status: 'Own',
    zip_code: '',
    accident_site: 'Local',
    past_num_of_claims: '0',
    witness_present: '0',
    liab_prct: '',
    channel: 'Online',
    police_report: '0',
    age_of_vehicle: '',
    vehicle_category: 'Compact',
    vehicle_price: '',
    vehicle_color: 'white',
    total_claim: '',
    injury_claim: '0',
    'policy deductible': '500',
    'annual premium': '',
    'days open': '1',
    'form defects': '0',
};

/* ── Field Component ───────────────────────────────────── */

function Field({
    label,
    children,
    hint,
}: {
    label: string;
    children: React.ReactNode;
    hint?: string;
}) {
    return (
        <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">{label}</Label>
            {children}
            {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
        </div>
    );
}

/* ── Page ──────────────────────────────────────────────── */

export default function PredictPage() {
    const router = useRouter();
    const [form, setForm] = useState<Record<string, string>>(initialForm);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | React.ReactNode>('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSelect = (name: string, value: string) => {
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const validateForm = (data: Record<string, string | number>): string[] => {
        const errs: string[] = [];
        
        if (Number(data.age_of_driver) < 16 || Number(data.age_of_driver) > 100) {
            errs.push("Driver's age must be between 16 and 100.");
        }
        if (Number(data.annual_income) < 0) {
            errs.push("Annual income cannot be negative.");
        }
        if (Number(data.safety_rating) < 0 || Number(data.safety_rating) > 100) {
            errs.push("Safety rating must be between 0 and 100.");
        }
        if (Number(data.past_num_of_claims) < 0) {
            errs.push("Past number of claims cannot be negative.");
        }
        if (Number(data.liab_prct) < 0 || Number(data.liab_prct) > 100) {
            errs.push("Liability percentage must be between 0 and 100.");
        }
        if (Number(data.age_of_vehicle) < 0) {
            errs.push("Vehicle age cannot be negative.");
        }
        if (Number(data.vehicle_price) < 0) {
            errs.push("Vehicle price cannot be negative.");
        }
        if (Number(data.total_claim) < 0) {
            errs.push("Total claim amount cannot be negative.");
        }
        if (Number(data.injury_claim) < 0) {
            errs.push("Injury claim amount cannot be negative.");
        }
        if (Number(data['policy deductible']) < 0) {
            errs.push("Policy deductible cannot be negative.");
        }
        if (Number(data['annual premium']) < 0) {
            errs.push("Annual premium cannot be negative.");
        }
        if (Number(data['days open']) < 0) {
            errs.push("Days open cannot be negative.");
        }
        if (Number(data['form defects']) < 0) {
            errs.push("Form defects count cannot be negative.");
        }

        return errs;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const payload: Record<string, string | number> = {};
        for (const [key, val] of Object.entries(form)) {
            payload[key] = NUMERIC_FIELDS.includes(key) ? parseFloat(val) || 0 : val;
        }

        const validationErrors = validateForm(payload);
        if (validationErrors.length > 0) {
            setError(
                <ul className="list-disc pl-4 space-y-1">
                    {validationErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                    ))}
                </ul>
            );
            setLoading(false);
            return;
        }

        try {
            const result = await predictFraud(payload);
            const params = new URLSearchParams({
                prediction: result.prediction,
                probability: String(result.probability),
                fraud_risk: String(result.fraud_risk),
                risk_level: result.risk_level,
            });
            router.push(`/result?${params.toString()}`);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex flex-col bg-slate-50">

            {/* ── Navbar ──────────────────────────────────────── */}
            <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
                <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-14">
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-slate-900" strokeWidth={1.5} />
                        <span className="font-semibold text-[15px] tracking-tight text-slate-900">Aegis</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-slate-500" onClick={() => router.push('/')}>
                        <ArrowLeft className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                        Back
                    </Button>
                </div>
            </nav>

            {/* ── Page Header ─────────────────────────────────── */}
            <div className="bg-white border-b">
                <div className="max-w-5xl mx-auto px-6 py-6">
                    <p className="text-xs font-medium tracking-widest text-slate-400 uppercase mb-1">New Scan</p>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Claim Assessment</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Complete the fields below. The model evaluates each feature for fraud indicators.
                    </p>
                </div>
            </div>

            {/* ── Form ────────────────────────────────────────── */}
            <form onSubmit={handleSubmit} className="max-w-5xl mx-auto w-full px-6 py-8 space-y-6">

                {/* Cluster 1: Claimant Profile */}
                <Card className="border-slate-200 shadow-sm bg-white">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center">
                                <User className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                            </div>
                            <CardTitle className="text-sm font-semibold text-slate-900">Claimant Profile</CardTitle>
                        </div>
                    </CardHeader>
                    <Separator className="mx-6" />
                    <CardContent className="pt-5 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-5">
                        <Field label="Age" hint="Driver's age at time of claim">
                            <Input name="age_of_driver" type="number" value={form.age_of_driver} onChange={handleChange} min={18} max={100} required placeholder="35" className="bg-slate-50 border-slate-200" />
                        </Field>
                        <Field label="Gender">
                            <Select value={form.gender} onValueChange={(v) => handleSelect('gender', v)}>
                                <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="M">Male</SelectItem>
                                    <SelectItem value="F">Female</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label="Marital Status">
                            <Select value={form.marital_status} onValueChange={(v) => handleSelect('marital_status', v)}>
                                <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Married</SelectItem>
                                    <SelectItem value="0">Single</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label="Annual Income" hint="Higher income correlates with lower fraud">
                            <Input name="annual_income" type="number" value={form.annual_income} onChange={handleChange} required placeholder="55000" className="bg-slate-50 border-slate-200" />
                        </Field>
                        <Field label="Higher Education" hint="Degree holder (Yes/No)">
                            <Select value={form.high_education} onValueChange={(v) => handleSelect('high_education', v)}>
                                <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Yes</SelectItem>
                                    <SelectItem value="0">No</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label="Address Changed" hint="Recent address change is a risk flag">
                            <Select value={form.address_change} onValueChange={(v) => handleSelect('address_change', v)}>
                                <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">No</SelectItem>
                                    <SelectItem value="1">Yes</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label="Property Status">
                            <Select value={form.property_status} onValueChange={(v) => handleSelect('property_status', v)}>
                                <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Own">Own</SelectItem>
                                    <SelectItem value="Rent">Rent</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label="Zip Code">
                            <Input name="zip_code" type="number" value={form.zip_code} onChange={handleChange} required placeholder="50000" className="bg-slate-50 border-slate-200" />
                        </Field>
                    </CardContent>
                </Card>

                {/* Cluster 2: Incident Metadata */}
                <Card className="border-slate-200 shadow-sm bg-white">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center">
                                <FileText className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                            </div>
                            <CardTitle className="text-sm font-semibold text-slate-900">Incident Metadata</CardTitle>
                        </div>
                    </CardHeader>
                    <Separator className="mx-6" />
                    <CardContent className="pt-5 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-5">
                        <Field label="Day of Week" hint="Weekend claims show higher fraud rates">
                            <Select value={form.claim_day_of_week} onValueChange={(v) => handleSelect('claim_day_of_week', v)}>
                                <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                                        <SelectItem key={d} value={d}>{d}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label="Safety Rating" hint="Vehicle safety score, 0-100">
                            <Input name="safety_rating" type="number" value={form.safety_rating} onChange={handleChange} min={0} max={100} required placeholder="70" className="bg-slate-50 border-slate-200" />
                        </Field>
                        <Field label="Accident Site">
                            <Select value={form.accident_site} onValueChange={(v) => handleSelect('accident_site', v)}>
                                <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Local">Local</SelectItem>
                                    <SelectItem value="Highway">Highway</SelectItem>
                                    <SelectItem value="Parking Lot">Parking Lot</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label="Past Claims" hint="Claim frequency is a key risk driver">
                            <Input name="past_num_of_claims" type="number" value={form.past_num_of_claims} onChange={handleChange} min={0} placeholder="0" className="bg-slate-50 border-slate-200" />
                        </Field>
                        <Field label="Witness Present">
                            <Select value={form.witness_present} onValueChange={(v) => handleSelect('witness_present', v)}>
                                <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">No</SelectItem>
                                    <SelectItem value="1">Yes</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label="Liability %" hint="Claimant's share, 0-100">
                            <Input name="liab_prct" type="number" value={form.liab_prct} onChange={handleChange} min={0} max={100} required placeholder="50" className="bg-slate-50 border-slate-200" />
                        </Field>
                        <Field label="Channel">
                            <Select value={form.channel} onValueChange={(v) => handleSelect('channel', v)}>
                                <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Phone">Phone</SelectItem>
                                    <SelectItem value="Online">Online</SelectItem>
                                    <SelectItem value="Broker">Broker</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label="Police Report Filed" hint="Absence of report is a risk signal">
                            <Select value={form.police_report} onValueChange={(v) => handleSelect('police_report', v)}>
                                <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">No</SelectItem>
                                    <SelectItem value="1">Yes</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                    </CardContent>
                </Card>

                {/* Cluster 3: Policy & Vehicle */}
                <Card className="border-slate-200 shadow-sm bg-white">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center">
                                <Car className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                            </div>
                            <CardTitle className="text-sm font-semibold text-slate-900">Policy &amp; Vehicle</CardTitle>
                        </div>
                    </CardHeader>
                    <Separator className="mx-6" />
                    <CardContent className="pt-5 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-5">
                        <Field label="Vehicle Age (yrs)">
                            <Input name="age_of_vehicle" type="number" value={form.age_of_vehicle} onChange={handleChange} min={0} required placeholder="3" className="bg-slate-50 border-slate-200" />
                        </Field>
                        <Field label="Vehicle Category">
                            <Select value={form.vehicle_category} onValueChange={(v) => handleSelect('vehicle_category', v)}>
                                <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Compact">Compact</SelectItem>
                                    <SelectItem value="Large">Large</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label="Vehicle Price ($)" hint="High-value vehicles attract soft fraud">
                            <Input name="vehicle_price" type="number" value={form.vehicle_price} onChange={handleChange} required placeholder="25000" className="bg-slate-50 border-slate-200" />
                        </Field>
                        <Field label="Vehicle Color">
                            <Select value={form.vehicle_color} onValueChange={(v) => handleSelect('vehicle_color', v)}>
                                <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {['white', 'black', 'silver', 'red', 'blue', 'gray', 'other'].map(c => (
                                        <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label="Total Claim ($)">
                            <Input name="total_claim" type="number" value={form.total_claim} onChange={handleChange} required placeholder="5000" className="bg-slate-50 border-slate-200" />
                        </Field>
                        <Field label="Injury Claim ($)">
                            <Input name="injury_claim" type="number" value={form.injury_claim} onChange={handleChange} placeholder="0" className="bg-slate-50 border-slate-200" />
                        </Field>
                        <Field label="Policy Deductible ($)">
                            <Input name="policy deductible" type="number" value={form['policy deductible']} onChange={handleChange} placeholder="500" className="bg-slate-50 border-slate-200" />
                        </Field>
                        <Field label="Annual Premium ($)" hint="Premium-to-claim ratio matters">
                            <Input name="annual premium" type="number" value={form['annual premium']} onChange={handleChange} required placeholder="1200" className="bg-slate-50 border-slate-200" />
                        </Field>
                        <Field label="Days Open" hint="Quick closures can signal fraud">
                            <Input name="days open" type="number" value={form['days open']} onChange={handleChange} min={0} placeholder="1" className="bg-slate-50 border-slate-200" />
                        </Field>
                        <Field label="Form Defects" hint="Errors in paperwork">
                            <Input name="form defects" type="number" value={form['form defects']} onChange={handleChange} min={0} placeholder="0" className="bg-slate-50 border-slate-200" />
                        </Field>
                    </CardContent>
                </Card>

                {/* Error */}
                {error && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700">
                        <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                        {error}
                    </div>
                )}

                {/* Submit */}
                <Button
                    type="submit"
                    size="lg"
                    disabled={loading}
                    className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Running Analysis...
                        </>
                    ) : (
                        <>
                            <Scan className="w-4 h-4 mr-2" strokeWidth={1.5} />
                            Run Fraud Scan
                        </>
                    )}
                </Button>
            </form>
        </main>
    );
}
