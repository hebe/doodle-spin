import { GoogleGenAI } from '@google/genai';
import { authorized, unauthorized, sameOrigin } from './_lib/auth.js';
import { saveImage } from './_lib/gallery.js';

// Change this in GitHub to keep a history of model experiments.
const MODEL = 'gemini-3.1-flash-image';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const STYLE_PROMPT = `Create a single, charming, hand-copyable doodle based on the given subject.
Style: Playful, slightly quirky bullet-journal/sketchnote illustration. Black fine-liner outlines with varied line weight, natural hand-drawn imperfections, simple expressive features, and restrained crosshatching or striped shadows.
Give objects a little dimensionality or perspective when appropriate, while keeping the design achievable by hand in a small dotted notebook.
Black and white, with no additional colours. Plain white or subtle dotted-paper background. No elaborate scenery or unnecessary decorations.
Interpret the combination creatively, integrating the expression and accessory naturally into the object. Prioritize personality, clear silhouettes, and manageable detail.`;

export async function POST(request) {
  if (!sameOrigin(request)) return Response.json({error:'Invalid request origin.'},{status:403});
  if (!authorized(request)) return unauthorized();
  if (!process.env.GEMINI_API_KEY) return Response.json({error:'Gemini API key not configured.'},{status:503});
  let body;
  try {body=await request.json();} catch {return Response.json({error:'Invalid request.'},{status:400});}
  const {object,expression,accessory}=body || {};
  // Server owns the style prompt. Whitelist characters/length instead of accepting arbitrary prompts.
  if (![object,expression,accessory].every(s=>typeof s==='string' && s.length>0 && s.length<=80 && /^[a-zA-Z0-9 ,'-]+$/.test(s))) {
    return Response.json({error:'Invalid doodle selection.'},{status:400});
  }
  const subject = `${expression} ${object} ${accessory}`;
  try {
    const ai = new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});
    const result=await ai.models.generateContent({model:MODEL,contents:`${STYLE_PROMPT}\n\nSubject: ${subject}\nDraw one standalone doodle of this subject.`,config:{responseModalities:['IMAGE']}});
    const image=result.candidates?.[0]?.content?.parts?.find(p=>p.inlineData?.data)?.inlineData;
    if(!image) return Response.json({error:'Gemini returned no image. Try again.'},{status:502});
    const mimeType=image.mimeType || 'image/png';
    if (!['image/png','image/jpeg','image/webp'].includes(mimeType)) return Response.json({error:'Unsupported image type.'},{status:502});
    const bytes=Buffer.from(image.data,'base64');
    if(!bytes.length || bytes.length>MAX_IMAGE_BYTES) return Response.json({error:'Image too large or empty.'},{status:502});
    const saved=await saveImage(bytes,mimeType,subject);
    return Response.json(saved,{headers:{'Cache-Control':'no-store'}});
  } catch(e) {
    console.error('Doodle generation/storage failed',e);
    const status=Number(e?.status)===429?429:502;
    return Response.json({error:status===429?'Gemini rate limit reached. Try later.':'Generating or saving failed. Check Vercel logs.'},{status});
  }
}
