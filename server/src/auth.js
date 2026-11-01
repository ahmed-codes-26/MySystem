import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { Session } from './models.js';
import { config } from './config.js';
export const COOKIE=config.NODE_ENV==='production'?'__Host-mysystem_session':'mysystem_session';
const duration=7*24*60*60*1000;
export const cookieOptions={httpOnly:true,secure:config.NODE_ENV==='production',sameSite:'lax',path:'/'};
export async function issue(res,id) {
 const now=new Date();let ttl=duration;
 // Renewal must never recreate a session revoked by a concurrent logout.
 if(id){
  const current=await Session.findOne({id,expiresAt:{$gt:now}}).lean();if(!current)return false;
  const absoluteExpiresAt=current.absoluteExpiresAt||new Date(now.getTime()+30*24*60*60*1000);
  ttl=Math.min(duration,absoluteExpiresAt.getTime()-now.getTime());if(ttl<1000)return false;
  if(!await Session.findOneAndUpdate({id,expiresAt:{$gt:now},$or:[{absoluteExpiresAt:{$gt:now}},{absoluteExpiresAt:{$exists:false}}]},{$set:{expiresAt:new Date(now.getTime()+ttl),absoluteExpiresAt}}))return false;
 }
 else{id=randomUUID();await Session.create({id,expiresAt:new Date(now.getTime()+duration)});}
 res.cookie(COOKIE,jwt.sign({role:'owner',sid:id},config.JWT_SECRET,{expiresIn:Math.floor(ttl/1000),issuer:'mysystem',audience:'owner'}),{...cookieOptions,maxAge:ttl});return true;
}
export async function auth(req,res,next) {
 let token;
 try{token=jwt.verify(req.cookies[COOKIE],config.JWT_SECRET,{algorithms:['HS256'],issuer:'mysystem',audience:'owner',maxAge:'7d'});if(token.role!=='owner'||typeof token.sid!=='string'||!/^[a-f0-9-]{36}$/i.test(token.sid)||!Number.isFinite(token.exp))throw new Error('Invalid session');}catch{return res.status(401).json({error:'Please log in.'});}
 const now=new Date();
 if(!await Session.exists({id:token.sid,expiresAt:{$gt:now},$or:[{absoluteExpiresAt:{$gt:now}},{absoluteExpiresAt:{$exists:false}}]}))return res.status(401).json({error:'Please log in.'});
 // Throttle renewal to hourly: parallel reads need only a session lookup.
 if(token.exp*1000-Date.now()<duration-3600000&&!await issue(res,token.sid))return res.status(401).json({error:'Please log in.'});
 req.sessionId=token.sid;next();
}
