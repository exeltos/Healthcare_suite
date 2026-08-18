function getSessionStorage(){
  try{return typeof sessionStorage === 'undefined' ? null : sessionStorage}catch{return null}
}
export function readSessionValue(key,fallback=null){try{return getSessionStorage()?.getItem(key) ?? fallback}catch{return fallback}}
export function writeSessionValue(key,value){try{getSessionStorage()?.setItem(key,String(value))}catch{} return value}
export function removeSessionValue(key){try{getSessionStorage()?.removeItem(key)}catch{}}
