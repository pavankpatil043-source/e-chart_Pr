import { NextResponse } from "next/server"

/**
 * Test endpoint to check if Hugging Face API key is configured
 * Access: GET /api/test-hf
 */
export async function GET() {
  const HF_API_KEY = 
    process.env.HUGGINGFACE_API_KEY || 
    process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY || 
    process.env.FACE_API_KEY ||
    process.env.NEXT_PUBLIC_FACE_API_KEY ||
    ""

  const isConfigured = !!HF_API_KEY && HF_API_KEY.length > 10

  return NextResponse.json({
    configured: isConfigured,
    keyLength: HF_API_KEY.length,
    keyPreview: HF_API_KEY ? `${HF_API_KEY.substring(0, 6)}...${HF_API_KEY.substring(HF_API_KEY.length - 4)}` : "Not found",
    checkedVariables: [
      { name: "HUGGINGFACE_API_KEY", found: !!process.env.HUGGINGFACE_API_KEY },
      { name: "NEXT_PUBLIC_HUGGINGFACE_API_KEY", found: !!process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY },
      { name: "FACE_API_KEY", found: !!process.env.FACE_API_KEY },
      { name: "NEXT_PUBLIC_FACE_API_KEY", found: !!process.env.NEXT_PUBLIC_FACE_API_KEY },
    ],
    message: isConfigured 
      ? "✅ Hugging Face API key is configured" 
      : "❌ Hugging Face API key not found in environment variables"
  })
}
