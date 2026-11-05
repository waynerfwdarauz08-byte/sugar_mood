import {useState} from 'react';
import {authService} from '../services/authService';
import {useAuth} from '../context/AuthContext';
import {Heading,Field,Message} from '../components/UI';
export default function Seguridad() {
  const {clearSession}=useAuth();
  const [form,setForm]=useState({passwordActual:'',passwordNueva:'',confirmacion:''}), [error,setError]=useState(''), [busy,setBusy]=useState(false);
  async function save(e) {
    e.preventDefault();setError('');
    if(form.passwordNueva !== form.confirmacion) {setError('Las contraseñas nuevas no coinciden.');return;}
    if(new TextEncoder().encode(form.passwordNueva).length>72) {setError('La contraseña no puede superar 72 bytes UTF-8.');return;}
    setBusy(true);
    try {
      await authService.changePassword({passwordActual:form.passwordActual,passwordNueva:form.passwordNueva});
      clearSession('Contraseña actualizada. Inicia sesión con tu nueva contraseña.');
    } catch(e) {setError(e.message);} finally {setBusy(false);}
  }
  return <><Heading title="Mi contraseña" description="Actualiza tu acceso. Al guardar se cerrarán tus sesiones anteriores." />
    <section className="panel security-panel"><Message error={error}/><form onSubmit={save}><fieldset disabled={busy}>
      <Field label="Contraseña actual"><input required type="password" autoComplete="current-password" value={form.passwordActual} onChange={e=>setForm({...form,passwordActual:e.target.value})}/></Field>
      <Field label="Nueva contraseña"><input required type="password" minLength="8" autoComplete="new-password" value={form.passwordNueva} onChange={e=>setForm({...form,passwordNueva:e.target.value})}/></Field>
      <Field label="Confirmar nueva contraseña"><input required type="password" minLength="8" autoComplete="new-password" value={form.confirmacion} onChange={e=>setForm({...form,confirmacion:e.target.value})}/></Field>
      <p className="helper">Al menos 8 caracteres y hasta 72 bytes UTF-8.</p><button disabled={busy}>{busy?'Actualizando…':'Actualizar contraseña'}</button>
    </fieldset></form></section></>;
}
