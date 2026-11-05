import {test} from 'node:test';
import assert from 'node:assert/strict';
export function registerOperations(get){
test('inventario registra unidades y motivo del ajuste',async()=>{
  const {ui,render,admin,requests,defaults,response}=get();
  globalThis.fetch=async(path,options={})=>{
    if(path.includes('/inventario/movimientos')){requests.push({path,options});return response(options.method==='POST'?{id:1}:[],options.method==='POST'?201:200);}
    return defaults(path,options);
  };
  render('/inventario',admin);
  await ui.waitFor(()=>assert.ok(requests.some(r=>r.path.includes('/inventario/movimientos'))));
  ui.fireEvent.click(ui.screen.getByRole('button',{name:'+ Registrar movimiento'}));
  for(const [label,value]of [['Producto','4'],['Unidades','5'],['Motivo','Producción nueva']])ui.fireEvent.change(ui.screen.getByLabelText(label),{target:{value}});
  ui.fireEvent.click(ui.screen.getByRole('button',{name:'Guardar movimiento'}));
  await ui.waitFor(()=>assert.ok(requests.find(r=>r.options.method==='POST')));
  assert.deepEqual(JSON.parse(requests.find(r=>r.options.method==='POST').options.body),{productoId:4,tipo:'entrada',cantidad:5,motivo:'Producción nueva'});
});
test('pagos permite abonar con saldo visible y Cliente solo consulta',async()=>{
  const {ui,render,admin,client,order,requests,defaults,response}=get();
  globalThis.fetch=async(path,options={})=>{
    if(path.endsWith('/pagos')){requests.push({path,options});return response(options.method==='POST'?{id:1}:[],options.method==='POST'?201:200);}
    if(path.endsWith('/pedidos'))return response([{...order,totalPagado:'400.00',saldoPendiente:'1000.00',estadoPago:'parcial'}]);
    return defaults(path,options);
  };
  render('/pagos',admin);
  await ui.waitFor(()=>assert.ok(ui.screen.getByText('parcial')));
  ui.fireEvent.click(ui.screen.getByRole('button',{name:'+ Registrar abono'}));
  for(const [label,value]of [['Pedido','5'],['Monto recibido (₡)','50.10'],['Método de pago','sinpe'],['Referencia (opcional)','Comprobante ficticio']])ui.fireEvent.change(ui.screen.getByLabelText(label),{target:{value}});
  ui.fireEvent.click(ui.screen.getByRole('button',{name:'Guardar abono'}));
  await ui.waitFor(()=>assert.ok(requests.find(r=>r.options.method==='POST')));
  assert.equal(JSON.parse(requests.find(r=>r.options.method==='POST').options.body).monto,'50.10');
  ui.cleanup();render('/pagos',client);
  await ui.waitFor(()=>assert.ok(ui.screen.getByText('parcial')));
  assert.equal(ui.screen.queryByRole('button',{name:'+ Registrar abono'}),null);
});
test('agenda muestra la entrega y enlaza con el comprobante',async()=>{
  const {ui,render,client,order,defaults,response}=get();
  globalThis.fetch=async(path,options={})=>path.includes('/agenda?')?response([order]):defaults(path,options);
  render('/agenda',client);
  await ui.waitFor(()=>assert.ok(ui.screen.getByRole('link',{name:'Ver pedido #5'})));
  assert.equal(ui.screen.getByRole('link',{name:'Ver pedido #5'}).getAttribute('href'),'/pedidos/5/comprobante');
  assert.ok(ui.screen.getByText(order.observaciones));
});
test('auditoría muestra antes y después sin interpretar HTML',async()=>{
  const {ui,render,admin,order,defaults,response}=get();
  globalThis.fetch=async(path,options={})=>path.includes('/auditoria')?response([{id:1,fecha:order.fecha,usuarioNombre:'Administrador',entidad:'productos',registroId:4,accion:'editar',antes:{precio:'700.00'},despues:{precio:'800.00',nombre:'<script>malicioso</script>'}}]):defaults(path,options);
  render('/auditoria',admin);
  await ui.waitFor(()=>assert.ok(ui.screen.getByRole('button',{name:'Ver cambio'})));
  ui.fireEvent.click(ui.screen.getByRole('button',{name:'Ver cambio'}));
  assert.ok(ui.screen.getByText(/"precio": "700.00"/));assert.ok(ui.screen.getByText(/"precio": "800.00"/));
  assert.equal(document.querySelector('script'),null);
});
test('recuperación solicita enlace y restablece con token sin iniciar sesión',async()=>{
  const {ui,render,requests,defaults,response}=get();
  globalThis.fetch=async(path,options={})=>{
    if(path.endsWith('/auth/forgot-password')){requests.push({path,options});return response({mensaje:'Si la cuenta existe, recibirás un enlace.'});}
    if(path.endsWith('/auth/reset-password')){requests.push({path,options});return response(null,204);}
    return defaults(path,options);
  };
  render('/recuperar');
  ui.fireEvent.change(ui.screen.getByLabelText('Correo de la cuenta'),{target:{value:'ana@example.com'}});
  ui.fireEvent.click(ui.screen.getByRole('button',{name:'Solicitar enlace'}));
  await ui.waitFor(()=>assert.ok(ui.screen.getByText('Si la cuenta existe, recibirás un enlace.')));
  assert.deepEqual(JSON.parse(requests.find(r=>r.path.endsWith('/auth/forgot-password')).options.body),{correo:'ana@example.com'});
  ui.cleanup();render('/restablecer#token='+'a'.repeat(80));
  for(const label of ['Nueva contraseña','Confirmar contraseña'])ui.fireEvent.change(ui.screen.getByLabelText(label),{target:{value:'NuevaClave2026!'}});
  ui.fireEvent.click(ui.screen.getByRole('button',{name:'Restablecer contraseña'}));
  await ui.waitFor(()=>assert.ok(ui.screen.getByText('Contraseña actualizada. Inicia sesión con la nueva clave.')));
  assert.deepEqual(JSON.parse(requests.find(r=>r.path.endsWith('/auth/reset-password')).options.body),{token:'a'.repeat(80),password:'NuevaClave2026!'});
});
test('roles configura permisos y un rol de consulta no ve acciones de escritura',async()=>{
  const {ui,render,admin,requests,defaults,response}=get();
  const role={id:4,codigo:'consulta',nombre:'Consulta',descripcion:'Solo consultas',permisos:[]};
  globalThis.fetch=async(path,options={})=>{
    if(path.endsWith('/roles/permisos'))return response(['productos.leer','productos.editar','categorias.leer']);
    if(path.endsWith('/roles'))return response([role]);
    if(path.endsWith('/roles/4')){requests.push({path,options});return response(role);}
    return defaults(path,options);
  };
  render('/roles',admin);
  await ui.waitFor(()=>assert.ok(ui.screen.getByRole('button',{name:'Editar'})));
  ui.fireEvent.click(ui.screen.getByRole('button',{name:'Editar'}));
  ui.fireEvent.click(ui.screen.getByLabelText('productos · editar'));
  assert.equal(ui.screen.getByLabelText('productos · consultar').checked,true);
  assert.equal(ui.screen.getByLabelText('categorias · consultar').checked,true);
  ui.fireEvent.click(ui.screen.getByRole('button',{name:'Guardar'}));
  await ui.waitFor(()=>assert.ok(requests.find(r=>r.path.endsWith('/roles/4'))));
  assert.ok(JSON.parse(requests.find(r=>r.path.endsWith('/roles/4')).options.body).permisos.includes('productos.editar'));
  ui.cleanup();render('/productos',{id:9,nombre:'Consulta',rol:{codigo:'consulta',nombre:'Consulta',permisos:['productos.leer','categorias.leer']}});
  await ui.waitFor(()=>assert.ok(ui.screen.getByText('Paleta de prueba')));
  assert.equal(ui.screen.queryByRole('button',{name:'Editar'}),null);assert.equal(ui.screen.queryByRole('button',{name:/Nuevo producto/}),null);
  assert.equal(ui.screen.queryByRole('link',{name:/Usuarios/}),null);
});
test('producto carga archivo y envía la ruta de imagen devuelta por la API',async()=>{
  const {ui,render,admin,product,requests,defaults,response,dom}=get();
  const imagen='/api/imagenes/'+'a'.repeat(64)+'.png';
  globalThis.fetch=async(path,options={})=>{
    if(path.endsWith('/imagenes')){requests.push({path,options});return response({imagen},201);}
    if(path.endsWith('/productos/4')&&options.method==='PUT'){requests.push({path,options});return response({...product,imagen});}
    return defaults(path,options);
  };
  render('/productos',admin);
  await ui.waitFor(()=>assert.ok(ui.screen.getByRole('button',{name:'Editar'})));
  ui.fireEvent.click(ui.screen.getByRole('button',{name:'Editar'}));
  const file=new dom.window.File(['png de prueba'],'postre.png',{type:'image/png'});
  ui.fireEvent.change(ui.screen.getByLabelText('Imagen del producto (PNG o JPEG, hasta 2 MB)'),{target:{files:[file]}});
  ui.fireEvent.click(ui.screen.getByRole('button',{name:'Guardar producto'}));
  await ui.waitFor(()=>assert.ok(requests.find(r=>r.path.endsWith('/productos/4'))));
  assert.equal(requests.find(r=>r.path.endsWith('/imagenes')).options.headers['Content-Type'],'image/png');
  assert.equal(JSON.parse(requests.find(r=>r.path.endsWith('/productos/4')).options.body).imagen,imagen);
});
}
