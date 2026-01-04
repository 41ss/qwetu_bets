import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    const secretBase64 = process.env.FONBNK_URL_SIGNATURE_SECRET;
    
    if (!secretBase64) {
        console.error("❌ Configuration Error: FONBNK_URL_SIGNATURE_SECRET is missing");
        return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { amount, metadata, address } = body;

        // 1. DECODE THE SECRET: Buffer.from is mandatory for HS256 with Base64 secrets
        const decodedSecret = Buffer.from(secretBase64, 'base64');

        // 2. CONSTRUCT SYMMETRIC PAYLOAD
        // Every field here must match the URL parameters built in the frontend
        const payload = {
            jti: uuidv4(),
            nonce: uuidv4(),
            address: address,       // Sensitive: Must be in JWT
            network: "SOLANA",      // Sensitive: Must be in JWT
            asset: "USDC",          // Sensitive: Must be in JWT
            amount: Number(amount),
            currency: 'local',
            countryIsoCode: 'KE',
            // Massive buffer for clock drift (1 hour back, 2 hours forward)
            iat: Math.floor(Date.now() / 1000) - 3600, 
            exp: Math.floor(Date.now() / 1000) + 7200, 
            metadata: metadata 
        };

        console.log("📝 SIGNING PAYLOAD:", JSON.stringify(payload, null, 2));

        // 3. SIGN
        const token = jwt.sign(payload, decodedSecret, { algorithm: 'HS256' });

        return NextResponse.json({ signature: token });

    } catch (error) {
        console.error("❌ SIGNING ERROR:", error);
        return NextResponse.json({ error: "Failed to sign" }, { status: 500 });
    }
}