const tok=()=>localStorage.getItem('t');
export const setToken=t=>t?localStorage.setItem('t',t):localStorage.removeItem('t');
export const role=()=>{try{return JSON.parse(atob(tok().split('.')[1])).role}catch{return null}};
export async function api(path,{method='GET',body}={}){
  const r=await fetch('/api/v1'+path,{method,body:body&&JSON.stringify(body),
    headers:{'Content-Type':'application/json',...(tok()?{Authorization:'Bearer '+tok()}:{})}});
  if(r.status===401&&tok()){setToken(null);location.href='/login';throw new Error('Session expired. Sign in again.');}
  if(!r.ok){let m;try{m=(await r.json()).message}catch{}
    throw new Error(m||{401:'Wrong email or password.',403:'You do not have access to this.',409:'Not enough stock.',402:'Payment declined.',429:'Too many requests. Wait a minute.'}[r.status]||'Something went wrong.');}
  return r.json().catch(()=>null);
}
