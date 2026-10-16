import { authorized, matchesPassword, sessionCookie, clearCookie, sameOrigin } from './_lib/auth.js';
export async function GET(request) {
  return Response.json({ signedIn: authorized(request) }, { headers: {'Cache-Control':'no-store'} });
}
export async function POST(request) {
  if (!sameOrigin(request)) return Response.json({error:'Invalid request origin.'},{status:403});
  if (!process.env.SESSION_SECRET || !process.env.DOODLE_PASSWORD) return Response.json({error:'Login is not configured.'},{status:503});
  let body;
  try { body = await request.json(); } catch { return Response.json({error:'Invalid request.'},{status:400}); }
  if (!matchesPassword(body?.password)) return Response.json({error:'Incorrect password.'},{status:401});
  return Response.json({signedIn:true},{headers:{'Set-Cookie':sessionCookie(request),'Cache-Control':'no-store'}});
}
export async function DELETE(request) {
  if (!sameOrigin(request)) return Response.json({error:'Invalid request origin.'},{status:403});
  return Response.json({signedIn:false},{headers:{'Set-Cookie':clearCookie(request),'Cache-Control':'no-store'}});
}
