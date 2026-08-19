import { useEffect, useMemo, useState } from 'react'
import { Eye, EyeOff, Languages } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { requireSupabase } from '../../integrations/supabase'
import { APP_ROUTES } from '../../config/routes'
import { useI18n } from '../../i18n'
import './LoginPage.css'

const BUILD_VERSION='0.12.0-rc.123'

function currentAuthLinkInfo(){
  if(typeof window==='undefined')return {type:'',accessToken:'',refreshToken:'',code:'',tokenHash:''}
  const search=new URLSearchParams(window.location.search)
  const hash=new URLSearchParams(String(window.location.hash||'').replace(/^#/,''))
  return {
    type:String(hash.get('type')||search.get('type')||'').toLowerCase(),
    accessToken:hash.get('access_token')||'',
    refreshToken:hash.get('refresh_token')||'',
    code:search.get('code')||'',
    tokenHash:search.get('token_hash')||'',
  }
}

async function detectInviteProfile(client,session){
  const userId=session?.user?.id
  if(!userId)return false
  const {data,error}=await client.from('user_profiles').select('status').eq('user_id',userId).maybeSingle()
  if(error)return false
  return ['invited','pending'].includes(String(data?.status||'').toLowerCase())
}

export default function ResetPasswordPage(){
  const {language,setLanguage}=useI18n()
  const L=(el,en)=>language==='en'?en:el
  const navigate=useNavigate()
  const initialInfo=useMemo(()=>currentAuthLinkInfo(),[])
  const [flow,setFlow]=useState(initialInfo.type==='invite'?'invite':'recovery')
  const [password,setPassword]=useState('')
  const [confirm,setConfirm]=useState('')
  const [showPassword,setShowPassword]=useState(false)
  const [showConfirm,setShowConfirm]=useState(false)
  const [message,setMessage]=useState('')
  const [status,setStatus]=useState('checking')
  const [saving,setSaving]=useState(false)

  useEffect(()=>{
    const client=requireSupabase()
    let mounted=true

    async function acceptSession(session){
      if(!mounted||!session)return false
      const metadataType=String(session.user?.user_metadata?.type||'').toLowerCase()
      if(metadataType==='invite'||await detectInviteProfile(client,session))setFlow('invite')
      setStatus('ready')
      window.history.replaceState({},document.title,window.location.pathname)
      return true
    }

    async function resolveSession(){
      try{
        const info=currentAuthLinkInfo()
        if(info.type==='invite')setFlow('invite')
        else if(info.type==='recovery')setFlow('recovery')

        if(info.accessToken&&info.refreshToken){
          const {error}=await client.auth.setSession({access_token:info.accessToken,refresh_token:info.refreshToken})
          if(error)throw error
        }else if(info.code){
          const {error}=await client.auth.exchangeCodeForSession(info.code)
          if(error)throw error
        }

        const {data,error}=await client.auth.getSession()
        if(error)throw error
        if(await acceptSession(data?.session))return

        window.setTimeout(async()=>{
          if(!mounted)return
          const {data:retryData,error:retryError}=await client.auth.getSession()
          if(retryError){
            setMessage(retryError.message)
            setStatus('error')
            return
          }
          if(await acceptSession(retryData?.session))return
          setMessage(L(
            'Ο σύνδεσμος δεν είναι έγκυρος ή έχει λήξει. Ζητήστε νέα πρόσκληση ή νέο email ανάκτησης.',
            'This link is invalid or has expired. Request a new invitation or recovery email.'
          ))
          setStatus('error')
        },600)
      }catch(error){
        if(!mounted)return
        setMessage(error?.message||L('Αποτυχία επαλήθευσης του συνδέσμου.','Could not verify this link.'))
        setStatus('error')
      }
    }

    resolveSession()

    const {data:{subscription}}=client.auth.onAuthStateChange((event,session)=>{
      if(!mounted)return
      if(event==='PASSWORD_RECOVERY')setFlow('recovery')
      if(session)acceptSession(session)
    })

    return()=>{mounted=false;subscription.unsubscribe()}
  },[]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(event){
    event.preventDefault()
    if(saving)return
    setMessage('')

    if(status!=='ready'){
      setMessage(L('Ο σύνδεσμος δεν έχει επαληθευτεί.','The link has not been verified.'))
      return
    }
    if(password.length<8){
      setMessage(L('Ο νέος κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.','New password must be at least 8 characters.'))
      return
    }
    if(password!==confirm){
      setMessage(L('Οι δύο κωδικοί δεν είναι ίδιοι.','Passwords do not match.'))
      return
    }

    setSaving(true)
    try{
      const client=requireSupabase()
      const {data:{session}}=await client.auth.getSession()
      if(!session)throw new Error(L('Η ασφαλής συνεδρία έληξε. Ζητήστε νέο email.','The secure session has expired. Request a new email.'))

      const {error}=await client.auth.updateUser({password})
      if(error)throw error

      if(flow==='invite'){
        const {data:activated,error:activationError}=await client.rpc('activate_my_profile')
        if(activationError)throw activationError
        if(activated===false)throw new Error(L('Ο λογαριασμός δημιουργήθηκε αλλά δεν μπόρεσε να ενεργοποιηθεί για το νοσοκομείο.','The account was created but could not be activated for the hospital.'))
      }

      await client.auth.signOut()
      setStatus('success')
      setPassword('')
      setConfirm('')
      setMessage(flow==='invite'
        ?L('Ο κωδικός δημιουργήθηκε και ο λογαριασμός ενεργοποιήθηκε. Μεταφέρεστε στη σύνδεση…','Password created and account activated. Redirecting to sign in…')
        :L('Ο κωδικός άλλαξε επιτυχώς. Μεταφέρεστε στη σύνδεση…','Password changed successfully. Redirecting to sign in…'))
      window.setTimeout(()=>navigate(APP_ROUTES.LOGIN,{replace:true}),1100)
    }catch(error){
      setMessage(error?.message||L('Η αποθήκευση του κωδικού απέτυχε.','Password update failed.'))
    }finally{
      setSaving(false)
    }
  }

  const ready=status==='ready'
  const isInvite=flow==='invite'

  return <main className="login-page-shell">
    <section className="login-main-card reset-password-card">
      <div className="login-index-language">
        <button type="button" onClick={()=>setLanguage(language==='el'?'en':'el')} aria-label={language==='el'?'English':'Ελληνικά'}>
          <Languages size={16}/><span>{language==='el'?'EN':'EL'}</span>
        </button>
      </div>

      <aside className="login-visual-panel reset-password-visual">
        <header className="login-brand">
          <div className="login-brand-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3v18"/><path d="M3 12h18"/><circle cx="12" cy="12" r="8.5"/></svg></div>
          <div className="login-brand-copy"><strong>HEALTHCARE SUITE</strong><span>Clinical Operations Platform</span></div>
        </header>
        <div className="login-welcome-content reset-password-copy">
          <div className="login-eyebrow"><span className="login-eyebrow-dot"/>{isInvite?L('Ασφαλής ενεργοποίηση λογαριασμού','Secure account activation'):L('Ασφαλής ανάκτηση πρόσβασης','Secure access recovery')}</div>
          <h1>{isInvite?L('Ο λογαριασμός σας είναι έτοιμος.','Your account is ready.'):L('Ανακτήστε την πρόσβασή σας με ασφάλεια.','Restore your access securely.')}</h1>
          <p>{isInvite?L('Ορίστε τον προσωπικό σας κωδικό για να ολοκληρωθεί η ενεργοποίηση του λογαριασμού σας στο Healthcare Suite.','Create your personal password to complete activation of your Healthcare Suite account.'):L('Ορίστε νέο προσωπικό κωδικό. Μετά την αλλαγή θα επιστρέψετε στη σελίδα σύνδεσης.','Create a new personal password. After the change you will return to the sign-in page.')}</p>
        </div>
        <footer className="login-visual-footer"><span>Healthcare Suite Platform · v{BUILD_VERSION}</span><span>{L('Ασφαλές Περιβάλλον Υγείας','Secure Healthcare Environment')}</span></footer>
      </aside>

      <section className="login-auth-panel reset-password-auth-panel">
        <div className="login-auth-wrapper reset-password-wrapper">
          <div className="login-language-row" aria-hidden="true"/>
          <section className="login-auth-view">
            <header className="login-auth-header reset-password-header">
              <button type="button" className="login-back-button" onClick={()=>navigate(APP_ROUTES.LOGIN)} disabled={saving}>← {L('Επιστροφή','Back')}</button>
              <h2>{isInvite?L('Δημιουργία κωδικού πρόσβασης','Create password'):L('Αλλαγή κωδικού πρόσβασης','Change password')}</h2>
              <p>{status==='checking'
                ?L('Γίνεται επαλήθευση του ασφαλούς συνδέσμου…','Verifying secure link…')
                :ready
                  ?(isInvite?L('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.','Your password must contain at least 8 characters.'):L('Πληκτρολογήστε δύο φορές τον νέο κωδικό πρόσβασης.','Enter your new password twice.'))
                  :status==='success'
                    ?L('Η διαδικασία ολοκληρώθηκε.','The process is complete.')
                    :L('Δεν είναι δυνατή η χρήση αυτού του συνδέσμου.','This link cannot be used.')}</p>
            </header>

            <form className="login-form-grid" onSubmit={submit}>
              <label className="login-form-group">
                <span>{isInvite?L('Κωδικός πρόσβασης','Password'):L('Νέος κωδικός','New password')}</span>
                <div className="login-input-wrapper">
                  <input type={showPassword?'text':'password'} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} disabled={!ready||saving}/>
                  <button type="button" aria-label={L(showPassword?'Απόκρυψη κωδικού':'Εμφάνιση κωδικού',showPassword?'Hide password':'Show password')} onClick={()=>setShowPassword(v=>!v)} disabled={!ready}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button>
                </div>
              </label>

              <label className="login-form-group">
                <span>{isInvite?L('Επιβεβαίωση κωδικού','Confirm password'):L('Επιβεβαίωση νέου κωδικού','Confirm new password')}</span>
                <div className="login-input-wrapper">
                  <input type={showConfirm?'text':'password'} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} disabled={!ready||saving}/>
                  <button type="button" aria-label={L(showConfirm?'Απόκρυψη επιβεβαίωσης':'Εμφάνιση επιβεβαίωσης',showConfirm?'Hide confirmation':'Show confirmation')} onClick={()=>setShowConfirm(v=>!v)} disabled={!ready}>{showConfirm?<EyeOff size={18}/>:<Eye size={18}/>}</button>
                </div>
              </label>

              {message&&<div className={`login-form-message ${status==='success'?'login-form-message--success':''}`}>{message}</div>}

              <button className="login-primary-button" type="submit" disabled={!ready||saving}>
                {saving?L('Αποθήκευση…','Saving…'):(isInvite?L('Δημιουργία κωδικού','Create password'):L('Αλλαγή κωδικού','Change password'))}
              </button>
              <button className="login-secondary-button" type="button" onClick={()=>navigate(APP_ROUTES.LOGIN)} disabled={saving}>{L('Επιστροφή στη σύνδεση','Back to sign in')}</button>
            </form>
            <footer className="login-auth-footer">Healthcare Suite · v{BUILD_VERSION}</footer>
          </section>
        </div>
      </section>
    </section>
  </main>
}
