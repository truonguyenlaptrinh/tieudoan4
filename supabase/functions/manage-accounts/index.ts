import { createClient } from 'npm:@supabase/supabase-js@2';
const cors = {'Access-Control-Allow-Origin':'https://truonguyenlaptrinh.github.io','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 try {
 const token=req.headers.get('Authorization'); if(!token)return reply({error:'Chưa đăng nhập'},401);
 const url=Deno.env.get('SUPABASE_URL')!, anon=Deno.env.get('SUPABASE_ANON_KEY')!, secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const userClient=createClient(url,anon,{global:{headers:{Authorization:token}},auth:{persistSession:false}});
 const {data:u,error:ue}=await userClient.auth.getUser(); if(ue||!u.user)return reply({error:'Phiên đăng nhập không hợp lệ'},401);
 const {data:allowed,error:ae}=await userClient.rpc('account_is_admin'); if(ae||!allowed)return reply({error:'Không có quyền quản lý tài khoản'},403);
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const body=await req.json();
 if(body.action==='list') {const page=Math.max(1,Number(body.page)||1);const {data,error}=await admin.auth.admin.listUsers({page,perPage:50});if(error)return reply({error:error.message},400);return reply({users:data.users.map(x=>({id:x.id,email:x.email,created_at:x.created_at})),more:data.users.length===50});}
 if(body.action!=='create')return reply({error:'Thao tác không hợp lệ'},400);
 const email=String(body.email||'').trim(), password=String(body.password||'');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<12||password.length>72)return reply({error:'Email hợp lệ và mật khẩu 12–72 ký tự là bắt buộc'},400);
 const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:false});if(error)return reply({error:error.message},400);return reply({id:data.user.id});
 }catch{return reply({error:'Không xử lý được yêu cầu'},500)}
});
