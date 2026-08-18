import { useEffect,useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2,LogOut,Plus,RefreshCw,ShieldCheck } from 'lucide-react'
import { readSessionValue,removeSessionValue } from '../../core/storage'
import { signOutUser } from '../../services/auth'
import { createPlatformOrganization,loadPlatformOrganizations,resendPlatformAdminInvite,setPlatformOrganizationActive } from '../../services/backend/platformOwnerService'
import { APP_ROUTES } from '../../config/routes'
import './PlatformOwnerPage.css'
export default function PlatformOwnerPage(){
 const nav=useNavigate();let user=null;try{user=JSON.parse(readSessionValue('healthcare-suite.user')||'null')}catch{}
 const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState(''),[open,setOpen]=useState(false)
 useEffect(()=>{if(!user?.platformOwner){nav(APP_ROUTES.LOGIN,{replace:true});return}reload()},[])
 async function reload(){setLoading(true);setError('');try{setRows(await loadPlatformOrganizations())}catch(e){setError(e.message)}finally{setLoading(false)}}
 async function create(e){e.preventDefault();setError('');setMessage('');const f=new FormData(e.currentTarget);try{await createPlatformOrganization({name:f.get('name'),slug:f.get('slug'),adminName:f.get('adminName'),adminEmail:f.get('adminEmail')});e.currentTarget.reset();setOpen(false);setMessage('Το νοσοκομείο δημιουργήθηκε και η πρόσκληση στάλθηκε στον πρώτο διαχειριστή.');await reload()}catch(x){setError(x.message)}}
 async function toggle(row){try{await setPlatformOrganizationActive(row.id,!row.active);await reload()}catch(e){setError(e.message)}}
 async function resend(row,admin){try{await resendPlatformAdminInvite(row.id,admin.user_id);setMessage('Στάλθηκε νέος ασφαλής σύνδεσμος στον διαχειριστή.')}catch(e){setError(e.message)}}
 async function logout(){try{await signOutUser()}catch{}removeSessionValue('healthcare-suite.session');removeSessionValue('healthcare-suite.user');nav(APP_ROUTES.LOGIN,{replace:true})}
 return <main className="platform-owner-page"><header className="platform-owner-header"><div><span className="platform-owner-kicker"><ShieldCheck size={16}/> PLATFORM OWNER</span><h1>Διαχείριση Νοσοκομείων</h1><p>Κεντρική ενεργοποίηση οργανισμών και πρώτων διαχειριστών. Δεν εμφανίζονται κλινικά δεδομένα.</p></div><div className="platform-owner-actions"><button onClick={reload}><RefreshCw size={16}/> Ανανέωση</button><button className="primary" onClick={()=>setOpen(v=>!v)}><Plus size={16}/> Νέο νοσοκομείο</button><button onClick={logout}><LogOut size={16}/> Έξοδος</button></div></header>
 {error&&<div className="platform-owner-alert error">{error}</div>}{message&&<div className="platform-owner-alert success">{message}</div>}
 {open&&<form className="platform-owner-form" onSubmit={create}><h2>Ενεργοποίηση νοσοκομείου</h2><div className="platform-owner-grid"><label>Όνομα νοσοκομείου<input name="name" required/></label><label>Slug / κωδικός<input name="slug" placeholder="π.χ. iaso-thessalias"/></label><label>Ονοματεπώνυμο πρώτου διαχειριστή<input name="adminName" required/></label><label>Email διαχειριστή<input name="adminEmail" type="email" required/></label></div><div className="platform-owner-form-actions"><button type="button" onClick={()=>setOpen(false)}>Ακύρωση</button><button className="primary" type="submit">Δημιουργία & αποστολή πρόσκλησης</button></div></form>}
 <section className="platform-owner-list"><div className="platform-owner-list-title"><Building2 size={19}/><h2>Οργανισμοί</h2><span>{rows.length}</span></div>{loading?<div className="platform-owner-empty">Φόρτωση…</div>:rows.map(row=><article key={row.id} className="platform-owner-row"><div><strong>{row.name}</strong><span>{row.slug}</span></div><span className={row.active?'active':'inactive'}>{row.active?'Ενεργό':'Ανενεργό'}</span><div className="platform-owner-admin">{row.administrators?.length?row.administrators.map(a=><div key={a.user_id}><span>{a.display_name} · {a.email} · {a.status}</span>{a.status!=='active'&&<button onClick={()=>resend(row,a)}>Νέος σύνδεσμος</button>}</div>):<span>Χωρίς διαχειριστή</span>}</div><button onClick={()=>toggle(row)}>{row.active?'Απενεργοποίηση':'Ενεργοποίηση'}</button></article>)}{!loading&&!rows.length&&<div className="platform-owner-empty">Δεν υπάρχουν ακόμη νοσοκομεία.</div>}</section>
 </main>}
