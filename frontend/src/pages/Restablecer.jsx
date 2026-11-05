import {useEffect,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {authService} from '../services/authService';
import {useAuth} from '../context/AuthContext';
import {Field,Message} from '../components/UI';
export default function Restablecer(){
  const location=useLocation(),{clearSession}=useAuth();
  const [token]=useState(()=>new URLSearchParams(location.hash.slice(1)).get('token')||''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[error,setError]=useState(''),[success,setSuccess]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{if(window.location.hash)window.history.replaceState(null,'',window.location.pathname);},[]);
  async function submit(e){e.preventDefault();setError('');if(password!==confirmation){setError('Las contraseñas no coinciden.');return;}setBusy(true);try{await authService.resetPassword(token,password);clearSession();setSuccess('Contraseña actualizada. Inicia sesión con la nueva clave.');setPassword('');setConfirmation('');}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <section className="auth-card"><h1>Restablecer contraseña</h1><Message error={error} success={success}/>{!token?<p>El enlace está incompleto. Solicita uno nuevo.</p>:!success&&<form onSubmit={submit}><fieldset disabled={busy}><Field label="Nueva contraseña"><input required type="password" minLength="8" maxLength="72" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></Field><Field label="Confirmar contraseña"><input required type="password" minLength="8" maxLength="72" autoComplete="new-password" value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></Field><button>{busy?'Guardando…':'Restablecer contraseña'}</button></fieldset></form>}<p><Link to="/login">Iniciar sesión</Link> · <Link to="/recuperar">Solicitar otro enlace</Link></p></section>;
}
