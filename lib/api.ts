/**
 * API Service Layer
 * =================
 * Centralized API calls. Single place to change if the API contract changes.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface FraudPredictionResult {
    prediction: 'Fraud' | 'Not Fraud';
    probability: number;
    fraud_risk: boolean;
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
    threshold: number;
}

interface ApiResponse<T> {
    success: boolean;
    data: T | null;
    error: string | null;
}

/**
 * Submit a claim for fraud prediction.
 * @throws Error if the API call fails or validation fails.
 */
export async function predictFraud(
    payload: Record<string, string | number>
): Promise<FraudPredictionResult> {
    const res = await fetch(`${API_URL}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    const body: ApiResponse<FraudPredictionResult> = await res.json();

    if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error || `Server error (${res.status}). Please try again.`);
    }

    return body.data;
}
