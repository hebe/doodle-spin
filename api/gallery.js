import {gallery,validId,imageById,setFavorite,deleteImage} from './_lib/gallery.js';
import {authorized, unauthorized, sameOrigin} from './_lib/auth.js';
export async function GET() {
  try {return Response.json({items:await gallery()}, {headers:{'Cache-Control':'no-store'}});}
  catch(e){console.error('Gallery load failed',e);return Response.json({error:'Could not load gallery.'},{status:502});}
}
export async function PATCH(request) {
  if (!sameOrigin(request)) return Response.json({error:'Invalid origin.'},{status:403});
  if (!authorized(request)) return unauthorized();
  let data; try {data=await request.json();} catch {return Response.json({error:'Invalid JSON.'},{status:400});}
  if (!validId(data?.id) || typeof data.favorite !== 'boolean') return Response.json({error:'Invalid favorite request.'},{status:400});
  try {
    if (!await imageById(data.id)) return Response.json({error:'Image not found.'},{status:404});
    await setFavorite(data.id,data.favorite);
    return Response.json({ok:true});
  } catch(e){console.error('Star failed',e);return Response.json({error:'Could not update favorite.'},{status:502});}
}
export async function DELETE(request) {
  if (!sameOrigin(request)) return Response.json({error:'Invalid origin.'},{status:403});
  if (!authorized(request)) return unauthorized();
  let data; try {data=await request.json();} catch {return Response.json({error:'Invalid JSON.'},{status:400});}
  if (!validId(data?.id)) return Response.json({error:'Invalid ID.'},{status:400});
  try {
    const image=await imageById(data.id);
    if (!image) return Response.json({error:'Image not found.'},{status:404});
    await deleteImage(data.id,image);
    return Response.json({ok:true});
  } catch(e){console.error('Delete failed',e);return Response.json({error:'Could not delete image.'},{status:502});}
}
