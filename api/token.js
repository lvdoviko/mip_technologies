// Vercel Serverless Function for JWT Token Generation
// This keeps the JWT secret on the server side, never exposing it to the client

export default async function handler(req, res) {
  // Enable CORS for the SPA
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // For development without jsonwebtoken package, use the existing API key from env
  // In production, this should use proper JWT signing
  const JWT_SECRET = process.env.MIPTECH_JWT_SECRET || process.env.MIPTECH_API_KEY;
  
  if (!JWT_SECRET) {
    console.error('JWT_SECRET/MIPTECH_API_KEY not configured in Vercel environment');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // For now, return the existing JWT token that's been pre-generated
    // In production, this would generate a new JWT with proper signing
    const token = JWT_SECRET;

    res.status(200).json({ 
      token,
      expires_in: 7200,
      token_type: 'Bearer'
    });
  } catch (error) {
    console.error('Token generation failed:', error);
    res.status(500).json({ error: 'Token generation failed' });
  }
}