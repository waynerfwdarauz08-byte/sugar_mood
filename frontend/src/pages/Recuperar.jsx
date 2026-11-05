import {useState} from 'react';
import {Link} from 'react-router-dom';
import {authService} from '../services/authService';
import {Field,Message} from '../components/UI';
export default function Recuperar(){
  const [correo,setCorreo]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
  async function submit(e){e.preventDefault();setBusy(true);setError('');setSuccess('');try{const result=await authService.forgotPassword(correo);setSuccess(result.mensaje);}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <section className="auth-card"><h1>Recuperar contraseña</h1><p>Introduce el correo de tu cuenta para solicitar un enlace temporal.</p><Message error={error} success={success}/><form onSubmit={submit}><fieldset disabled={busy}><Field label="Correo de la cuenta"><input autoFocus required type="email" maxLength="254" autoComplete="username" value={correo} onChange={e=>setCorreo(e.target.value)}/></Field><button>{busy?'Solicitando…':'Solicitar enlace'}</button></fieldset></form><p><Link to="/login">Volver al inicio de sesión</Link></p></section>;
}
