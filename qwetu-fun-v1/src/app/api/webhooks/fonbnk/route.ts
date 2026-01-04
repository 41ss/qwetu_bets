import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    const secretBase64 = process.env.FONBNK_URL_SIGNATURE_SECRET;
    
    if (!secretBase64) {
        return NextResponse.json({ error: "Missing Secret" }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { amount, metadata } = body;
        const uid = uuidv4();
        
        // 1. CRITICAL FIX: Decode the Base64 secret into a Buffer
        // Signing with the raw string will always cause an "Invalid Signature" error.
        const decodedSecret = Buffer.from(secretBase64, 'base64');

        const payload = {
            jti: uid,           
            amount: Number(amount),
            currency: 'local',
            countryIsoCode: 'KE', 
            iat: Math.floor(Date.now() / 1000) - 60, // Increased leeway for clock drift
            exp: Math.floor(Date.now() / 1000) + 3600, 
            metadata: metadata 
        };

        console.log("📝 SIGNING PAYLOAD:", payload);

        // 2. Sign using the decoded buffer
        const token = jwt.sign(payload, decodedSecret, { algorithm: 'HS256' });

        return NextResponse.json({ 
            signature: token, 
            uid,
            debug_payload: payload 
        });

    } catch (error) {
        console.error("❌ SIGNING ERROR:", error);
        return NextResponse.json({ error: "Failed to sign" }, { status: 500 });
    }
}