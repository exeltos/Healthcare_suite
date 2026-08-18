import { useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { requireSupabase } from '../../integrations/supabase'
import { APP_ROUTES } from '../../config/routes'
import { useI18n } from '../../i18n'
import './LoginPage.css'

const BUILD_VERSION='0.12.0-rc.114'

export default function ResetPasswordPage(){
  const {language}=useI18n()
  const L=(el,en)=>language==='en'?en:el
  const navigate=useNavigate()
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

    async function resolveRecoverySession(){
      try{
        const params=new URLSearchParams(window.location.search)
        const code=params.get('code')

        // PKCE recovery links return a one-time code. Explicitly exchange it,
        // instead of depending only on automatic URL detection.
        if(code){
          const {error}=await client.auth.exchangeCodeForSession(code)
          if(error)throw error
          window.history.replaceState({},document.title,window.location.pathname)
        }

        const {data,error}=await client.auth.getSession()
        if(error)throw error
        if(!mounted)return

        if(data?.session){
          setStatus('ready')
          return
        }

        // Legacy implicit recovery links are consumed by detectSessionInUrl.
        // Give the auth client a short moment to finish processing the fragment.
        window.setTimeout(async()=>{
          if(!mounted)return
          const {data:retryData,error:retryError}=await client.auth.getSession()
          if(retryError){
            setMessage(retryError.message)
            setStatus('error')
            return
          }
          if(retryData?.session)setStatus('ready')
          else{
            setMessage(L(
              'Ο σύνδεσμος επαναφοράς δεν είναι έγκυρος ή έχει λήξει. Ζητήστε νέο email ανάκτησης.',
              'The recovery link is invalid or has expired. Request a new recovery email.'
            ))
            setStatus('error')
          }
        },500)
      }catch(error){
        if(!mounted)return
        setMessage(error?.message||L('Αποτυχία επαλήθευσης του συνδέσμου.','Could not verify the recovery link.'))
        setStatus('error')
      }
    }

    resolveRecoverySession()

    const {data:{subscription}}=client.auth.onAuthStateChange((event,session)=>{
      if(!mounted)return
      if(event==='PASSWORD_RECOVERY'||session)setStatus('ready')
    })

    return()=>{mounted=false;subscription.unsubscribe()}
  },[]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(event){
    event.preventDefault()
    if(saving)return
    setMessage('')

    if(status!=='ready'){
      setMessage(L(
        'Ο σύνδεσμος επαναφοράς δεν έχει επαληθευτεί. Ζητήστε νέο email ανάκτησης.',
        'The recovery link has not been verified. Request a new recovery email.'
      ))
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
      if(!session)throw new Error(L('Η συνεδρία ανάκτησης έληξε. Ζητήστε νέο email.','The recovery session has expired. Request a new email.'))

      const {error}=await client.auth.updateUser({password})
      if(error)throw error

      await client.auth.signOut()
      setStatus('success')
      setPassword('')
      setConfirm('')
      setMessage(L(
        'Ο κωδικός άλλαξε επιτυχώς. Μεταφέρεστε στη σύνδεση…',
        'Password changed successfully. Redirecting to sign in…'
      ))
      window.setTimeout(()=>navigate(APP_ROUTES.LOGIN,{replace:true}),1500)
    }catch(error){
      setMessage(error?.message||L('Η αλλαγή κωδικού απέτυχε.','Password change failed.'))
    }finally{
      setSaving(false)
    }
  }

  const ready=status==='ready'

  return <main className="login-page-shell">
    <section className="login-main-card">
      <section className="login-auth-panel" style={{margin:'auto'}}>
        <div className="login-auth-wrapper">
          <section className="login-auth-view">
            <header className="login-auth-header">
              <h2>{L('Αλλαγή κωδικού πρόσβασης','Change password')}</h2>
              <p>
                {status==='checking'
                  ?L('Γίνεται επαλήθευση του συνδέσμου επαναφοράς…','Verifying recovery link…')
                  :ready
                    ?L('Πληκτρολογήστε δύο φορές τον νέο κωδικό πρόσβασης.','Enter your new password twice.')
                    :status==='success'
                      ?L('Η αλλαγή ολοκληρώθηκε.','Password change completed.')
                      :L('Δεν είναι δυνατή η αλλαγή κωδικού με αυτόν τον σύνδεσμο.','Password cannot be changed with this link.')}
              </p>
            </header>

            <form className="login-form-grid" onSubmit={submit}>
              <label className="login-form-group">
                <span>{L('Νέος κωδικός','New password')}</span>
                <div className="login-input-wrapper">
                  <input
                    type={showPassword?'text':'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={e=>setPassword(e.target.value)}
                    disabled={!ready||saving}
                  />
                  <button type="button" aria-label={L(showPassword?'Απόκρυψη κωδικού':'Εμφάνιση κωδικού',showPassword?'Hide password':'Show password')} onClick={()=>setShowPassword(v=>!v)} disabled={!ready}>
                    {showPassword?<EyeOff size={18}/>:<Eye size={18}/>}
                  </button>
                </div>
              </label>

              <label className="login-form-group">
                <span>{L('Επιβεβαίωση νέου κωδικού','Confirm new password')}</span>
                <div className="login-input-wrapper">
                  <input
                    type={showConfirm?'text':'password'}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={e=>setConfirm(e.target.value)}
                    disabled={!ready||saving}
                  />
                  <button type="button" aria-label={L(showConfirm?'Απόκρυψη επιβεβαίωσης':'Εμφάνιση επιβεβαίωσης',showConfirm?'Hide confirmation':'Show confirmation')} onClick={()=>setShowConfirm(v=>!v)} disabled={!ready}>
                    {showConfirm?<EyeOff size={18}/>:<Eye size={18}/>}
                  </button>
                </div>
              </label>

              {message&&<div className={`login-form-message ${status==='success'?'is-success':''}`}>{message}</div>}

              <button className="login-primary-button" type="submit" disabled={!ready||saving}>
                {saving?L('Αλλαγή…','Changing…'):L('Αλλαγή κωδικού','Change password')}
              </button>
              <button className="login-secondary-button" type="button" onClick={()=>navigate(APP_ROUTES.LOGIN)} disabled={saving}>
                {L('Επιστροφή στη σύνδεση','Back to sign in')}
              </button>
            </form>
            <footer className="login-auth-footer">Healthcare Suite · v{BUILD_VERSION}</footer>
          </section>
        </div>
      </section>
    </section>
  </main>
}
