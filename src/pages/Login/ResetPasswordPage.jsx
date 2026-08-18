import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { requireSupabase } from '../../integrations/supabase'
import { APP_ROUTES } from '../../config/routes'
import { useI18n } from '../../i18n'
import './LoginPage.css'

export default function ResetPasswordPage(){
  const {language}=useI18n()
  const L=(el,en)=>language==='en'?en:el
  const navigate=useNavigate()
  const [password,setPassword]=useState('')
  const [confirm,setConfirm]=useState('')
  const [message,setMessage]=useState('')
  const [ready,setReady]=useState(false)

  useEffect(()=>{
    const client=requireSupabase()
    let mounted=true
    client.auth.getSession().then(({data,error})=>{
      if(!mounted)return
      if(error){setMessage(error.message);return}
      setReady(Boolean(data?.session))
    })
    const {data:{subscription}}=client.auth.onAuthStateChange((event,session)=>{
      if(!mounted)return
      if(event==='PASSWORD_RECOVERY'||session)setReady(true)
    })
    return()=>{mounted=false;subscription.unsubscribe()}
  },[])

  async function submit(event){
    event.preventDefault()
    setMessage('')
    if(password.length<8){setMessage(L('Ο νέος κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.','New password must be at least 8 characters.'));return}
    if(password!==confirm){setMessage(L('Οι δύο κωδικοί δεν είναι ίδιοι.','Passwords do not match.'));return}
    const client=requireSupabase()
    const {error}=await client.auth.updateUser({password})
    if(error){setMessage(error.message);return}
    setMessage(L('Ο κωδικός άλλαξε επιτυχώς. Μπορείτε τώρα να συνδεθείτε.','Password changed successfully. You can now sign in.'))
    window.setTimeout(()=>navigate(APP_ROUTES.LOGIN,{replace:true}),1200)
  }

  return <main className="login-page-shell">
    <section className="login-main-card">
      <section className="login-auth-panel" style={{margin:'auto'}}>
        <div className="login-auth-wrapper">
          <section className="login-auth-view">
            <header className="login-auth-header">
              <h2>{L('Νέος κωδικός πρόσβασης','Set new password')}</h2>
              <p>{ready?L('Ορίστε τον νέο κωδικό για τον λογαριασμό σας.','Set a new password for your account.'):L('Γίνεται επαλήθευση του συνδέσμου επαναφοράς…','Verifying recovery link…')}</p>
            </header>
            <form className="login-form-grid" onSubmit={submit}>
              <label className="login-form-group"><span>{L('Νέος κωδικός','New password')}</span><input type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} disabled={!ready}/></label>
              <label className="login-form-group"><span>{L('Επιβεβαίωση κωδικού','Confirm password')}</span><input type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} disabled={!ready}/></label>
              {message&&<div className="login-form-message">{message}</div>}
              <button className="login-primary-button" type="submit" disabled={!ready}>{L('Αλλαγή κωδικού','Change password')}</button>
              <button className="login-secondary-button" type="button" onClick={()=>navigate(APP_ROUTES.LOGIN)}>{L('Επιστροφή στη σύνδεση','Back to sign in')}</button>
            </form>
          </section>
        </div>
      </section>
    </section>
  </main>
}
