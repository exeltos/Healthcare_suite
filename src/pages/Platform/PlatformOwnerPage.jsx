import { useEffect,useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2,LogOut,Plus,RefreshCw,ShieldCheck } from 'lucide-react'
import { readSessionValue,removeSessionValue } from '../../core/storage'
import { signOutUser } from '../../services/auth'
import { createPlatformOrganization,loadPlatformOrganizations,resendPlatformAdminInvite,setPlatformOrganizationActive } from '../../services/backend/platformOwnerService'
import { APP_ROUTES } from '../../config/routes'
import './PlatformOwnerPage.css'

const GREEK_SLUG_MAP={
 α:'a',β:'v',γ:'g',δ:'d',ε:'e',ζ:'z',η:'i',θ:'th',ι:'i',κ:'k',λ:'l',μ:'m',ν:'n',ξ:'x',ο:'o',π:'p',ρ:'r',σ:'s',ς:'s',τ:'t',υ:'y',φ:'f',χ:'ch',ψ:'ps',ω:'o'
}
function makeSlug(value){
 return String(value||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').split('').map(ch=>GREEK_SLUG_MAP[ch]??ch).join('').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64)
}

export default function PlatformOwnerPage(){
 const nav=useNavigate();let user=null;try{user=JSON.parse(readSessionValue('healthcare-suite.user')||'null')}catch{}
 const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState(''),[open,setOpen]=useState(false),[submitting,setSubmitting]=useState(false)
 const [hospitalName,setHospitalName]=useState(''),[slug,setSlug]=useState(''),[slugEdited,setSlugEdited]=useState(false),[adminName,setAdminName]=useState(''),[adminEmail,setAdminEmail]=useState('')
 useEffect(()=>{if(!user?.platformOwner){nav(APP_ROUTES.LOGIN,{replace:true});return}reload()},[])
 async function reload(){setLoading(true);setError('');try{setRows(await loadPlatformOrganizations())}catch(e){setError(e.message)}finally{setLoading(false)}}
 function clearForm(){setHospitalName('');setSlug('');setSlugEdited(false);setAdminName('');setAdminEmail('')}
 function changeHospitalName(value){setHospitalName(value);if(!slugEdited)setSlug(makeSlug(value))}
 function changeSlug(value){setSlugEdited(true);setSlug(makeSlug(value))}
 async function create(e){
  e.preventDefault();if(submitting)return
  const normalizedSlug=makeSlug(slug||hospitalName)
  if(!normalizedSlug){setError('Δεν ήταν δυνατό να δημιουργηθεί έγκυρος κωδικός νοσοκομείου. Συμπλήρωσε ένα σύντομο όνομα ή slug.');return}
  setError('');setMessage('');setSubmitting(true)
  try{
   await createPlatformOrganization({name:hospitalName,slug:normalizedSlug,adminName,adminEmail})
   clearForm();setOpen(false);setMessage('Το νοσοκομείο δημιουργήθηκε και η πρόσκληση στάλθηκε στον πρώτο διαχειριστή.');await reload()
  }catch(x){setError(x?.message||'Η δημιουργία του νοσοκομείου απέτυχε.')}finally{setSubmitting(false)}
 }
 async function toggle(row){try{setError('');await setPlatformOrganizationActive(row.id,!row.active);await reload()}catch(e){setError(e.message)}}
 async function resend(row,admin){try{setError('');await resendPlatformAdminInvite(row.id,admin.user_id);setMessage('Στάλθηκε νέος ασφαλής σύνδεσμος στον διαχειριστή.')}catch(e){setError(e.message)}}
 async function logout(){try{await signOutUser()}catch{}removeSessionValue('healthcare-suite.session');removeSessionValue('healthcare-suite.user');nav(APP_ROUTES.LOGIN,{replace:true})}
 function closeForm(){if(submitting)return;clearForm();setOpen(false)}
 return <main className="platform-owner-page"><header className="platform-owner-header"><div><span className="platform-owner-kicker"><ShieldCheck size={16}/> PLATFORM OWNER</span><h1>Διαχείριση Νοσοκομείων</h1><p>Κεντρική ενεργοποίηση οργανισμών και πρώτων διαχειριστών. Δεν εμφανίζονται κλινικά δεδομένα.</p></div><div className="platform-owner-actions"><button onClick={reload} disabled={loading}><RefreshCw size={16}/> Ανανέωση</button><button className="primary" onClick={()=>{if(open)closeForm();else{setError('');setMessage('');setOpen(true)}}}><Plus size={16}/> Νέο νοσοκομείο</button><button onClick={logout}><LogOut size={16}/> Έξοδος</button></div></header>
 {error&&<div className="platform-owner-alert error">{error}</div>}{message&&<div className="platform-owner-alert success">{message}</div>}
 {open&&<form className="platform-owner-form" onSubmit={create}><h2>Ενεργοποίηση νοσοκομείου</h2><div className="platform-owner-grid"><label>Όνομα νοσοκομείου<input name="name" value={hospitalName} onChange={e=>changeHospitalName(e.target.value)} required disabled={submitting}/></label><label>Slug / κωδικός<input name="slug" value={slug} onChange={e=>changeSlug(e.target.value)} placeholder="π.χ. iaso-thessalias" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" title="Μόνο λατινικά πεζά γράμματα, αριθμοί και παύλες" required disabled={submitting}/><small>Δημιουργείται αυτόματα και χρησιμοποιείται ως μοναδικός τεχνικός κωδικός.</small></label><label>Ονοματεπώνυμο πρώτου διαχειριστή<input name="adminName" value={adminName} onChange={e=>setAdminName(e.target.value)} required disabled={submitting}/></label><label>Email διαχειριστή<input name="adminEmail" value={adminEmail} onChange={e=>setAdminEmail(e.target.value)} type="email" required disabled={submitting}/></label></div><div className="platform-owner-form-actions"><button type="button" onClick={closeForm} disabled={submitting}>Ακύρωση</button><button className="primary" type="submit" disabled={submitting}>{submitting?'Δημιουργία…':'Δημιουργία & αποστολή πρόσκλησης'}</button></div></form>}
 <section className="platform-owner-list"><div className="platform-owner-list-title"><Building2 size={19}/><h2>Οργανισμοί</h2><span>{rows.length}</span></div>{loading?<div className="platform-owner-empty">Φόρτωση…</div>:rows.map(row=><article key={row.id} className="platform-owner-row"><div><strong>{row.name}</strong><span>{row.slug}</span></div><span className={row.active?'active':'inactive'}>{row.active?'Ενεργό':'Ανενεργό'}</span><div className="platform-owner-admin">{row.administrators?.length?row.administrators.map(a=><div key={a.user_id}><span>{a.display_name} · {a.email} · {a.status}</span>{a.status!=='active'&&<button onClick={()=>resend(row,a)}>Νέος σύνδεσμος</button>}</div>):<span>Χωρίς διαχειριστή</span>}</div><button onClick={()=>toggle(row)}>{row.active?'Απενεργοποίηση':'Ενεργοποίηση'}</button></article>)}{!loading&&!rows.length&&<div className="platform-owner-empty">Δεν υπάρχουν ακόμη νοσοκομεία.</div>}</section>
 </main>}
