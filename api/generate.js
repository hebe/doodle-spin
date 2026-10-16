
import { GoogleGenAI } from '@google/genai';
import { authorized, unauthorized, sameOrigin } from './_lib/auth.js';
import { saveImage } from './_lib/gallery.js';

// Change this in GitHub to track model experiments.
const MODEL = 'gemini-3.1-flash-image';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// Doodle Spin style prompt v4.1
const STYLE_PROMPT = `Draw the subject as an adorable, upright, front-facing kawaii character.
Use a simple, compact silhouette with rounded, chubby proportions,
a large expressive face, and tiny limbs where appropriate.
Keep the object recognizable but stylized, like a cute cartoon mascot
rather than a realistic object.

Hand-drawn black fineliner doodle, slightly imperfect outlines,
varied line weight, minimal details and subtle hatching.
Simple front-facing cartoon design with natural hand-drawn imperfections.
Isolated on a clean white background.
No color, gradients, text, speech bubbles or scenery.
Easy to copy by hand in a small notebook.`;

export async function POST(request) {
  // Check request origin and owner authentication.
  if (!sameOrigin(request)) {
    return Response.json(
      { error: 'Invalid request origin.' },
      { status: 403 }
    );
  }

  if (!authorized(request)) {
    return unauthorized();
  }

  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: 'Gemini API key not configured.' },
      { status: 503 }
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: 'Invalid request.' },
      { status: 400 }
    );
  }

  const { object, expression, accessory } = body || {};

  // Validate the three slot selections.
  // The style prompt stays on the server.
  if (
    ![object, expression, accessory].every(
      s =>
        typeof s === 'string' &&
        s.length > 0 &&
        s.length <= 80 &&
        /^[a-zA-Z0-9 ,'-]+$/.test(s)
    )
  ) {
    return Response.json(
      { error: 'Invalid doodle selection.' },
      { status: 400 }
    );
  }

  const subject = `${expression} ${object} ${accessory}`;

  const prompt = `Subject: ${subject}

${STYLE_PROMPT}`;

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    // Generate a 512px square doodle.
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          imageSize: '512',
          aspectRatio: '1:1'
        }
      }
    });

    // Extract the generated image.
    const image = result.candidates?.[0]
      ?.content?.parts
      ?.find(p => p.inlineData?.data)
      ?.inlineData;

    if (!image) {
      return Response.json(
        { error: 'Gemini returned no image. Try again.' },
        { status: 502 }
      );
    }

    const mimeType = image.mimeType || 'image/png';

    if (
      !['image/png', 'image/jpeg', 'image/webp']
        .includes(mimeType)
    ) {
      return Response.json(
        { error: 'Unsupported image type.' },
        { status: 502 }
      );
    }

    // Decode and validate the image.
    const bytes = Buffer.from(image.data, 'base64');

    if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) {
      return Response.json(
        { error: 'Image too large or empty.' },
        { status: 502 }
      );
    }

    // Automatically save to Vercel Blob.
    const saved = await saveImage(
      bytes,
      mimeType,
      subject
    );

    // Return the saved image metadata to the frontend.
    return Response.json(saved, {
      headers: {
        'Cache-Control': 'no-store'
      }
    });

  } catch (error) {
    console.error(
      'Doodle generation/storage failed',
      error
    );

    const status =
      Number(error?.status) === 429 ? 429 : 502;

    return Response.json(
      {
        error: status === 429
          ? 'Gemini rate limit reached. Try later.'
          : 'Generating or saving failed. Check Vercel logs.'
      },
      { status }
    );
  }
}
