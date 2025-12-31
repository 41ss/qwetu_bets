import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const FONBNK_SECRET = process.env.FONBNK_SIGNATURE_SECRET;

export async function POST(request: Request) {
    if (!FONBNK_SECRET) {
        console.error("Configuration Error: FONBNK_SIGNATURE_SECRET is missing");
        return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { amount, metadata } = body;

        // Basic validation
        if (!amount || isNaN(amount) || amount < 10) {
            return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
        }

        // Generate Unique ID for this transaction
        const uid = uuidv4();

        // Construct Payload
        // Standard Fonbnk Payload: { uid, amount, currency }
        // The secret is used to sign this, proving it came from our backend.
        const payload = {
            jti: uid,           // Use 'jti' for standard JWT compatibility
            amount: Number(amount),
            currency: 'local',
            iat: Math.floor(Date.now() / 1000) - 30, // Prevents "Token not yet valid" errors
            metadata: metadata // Pass user metadata (e.g. user_id)
        };

        // Sign with explicitly defined algorithm
        const token = jwt.sign(payload, FONBNK_SECRET, { algorithm: 'HS256' });



        return NextResponse.json({ token, uid });

    } catch (error) {
        console.error("Fonbnk Token Generation Error:", error);
        return NextResponse.json({ error: "Token Generation Failed" }, { status: 500 });
    }
}
