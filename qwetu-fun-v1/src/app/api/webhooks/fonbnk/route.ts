import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    const secret = process.env.FONBNK_URL_SIGNATURE_SECRET;
    
    if (!secret) {
        return NextResponse.json({ error: "Missing Secret" }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { amount } = body;

        const uid = uuidv4();
        
        // FONBNK WIDGET REQUIREMENTS:
        // 1. Must use 'jti' for the unique ID.
        // 2. 'currency' must match the URL param EXACTLY. We'll use "local".
        // 3. 'amount' must be a number.
        const payload = {
            jti: uid,
            amount: Number(amount),
            currency: "local", // Matches the frontend URL
            iat: Math.floor(Date.now() / 1000) - 30
        };

        console.log("📝 SIGNING PAYLOAD:", payload);

        // Sign using the HS256 algorithm
        const token = jwt.sign(payload, secret, { algorithm: 'HS256' });

        return NextResponse.json({ 
            signature: token, 
            uid,
            debug_payload: payload // This lets us verify in the browser
        });

    } catch (error) {
        console.error("❌ SIGNING ERROR:", error);
        return NextResponse.json({ error: "Failed to sign" }, { status: 500 });
    }
}