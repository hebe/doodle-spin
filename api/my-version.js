import {authorized, unauthorized, sameOrigin} from './_lib/auth.js';
import {saveImage} from './_lib/gallery.js';

const MAX_IMAGE_BYTES=8*1024*1024;
export async function POST(request){
  if(!sameOrigin(request))return Response.json({error:'Invalid request origin.'},{status:403});
  if(!authorized(request))return unauthorized();
  let body;try{body=await request.json()}catch{return Response.json({error:'Invalid request.'},{status:400})}
  const match=typeof body?.image==='string'&&body.image.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if(!match)return Response.json({error:'Choose a valid photo.'},{status:400});
  const bytes=Buffer.from(match[2],'base64');
  if(!bytes.length||bytes.length>MAX_IMAGE_BYTES)return Response.json({error:'Photo must be smaller than 8 MB.'},{status:400});
  const subject=typeof body.subject==='string'?body.subject.slice(0,240):'My version';
  try{return Response.json(await saveImage(bytes,match[1],`My version: ${subject}`,'mine'),{headers:{'Cache-Control':'no-store'}})}
  catch(e){console.error('Photo storage failed',e);return Response.json({error:'Could not save your photo.'},{status:502})}
}
