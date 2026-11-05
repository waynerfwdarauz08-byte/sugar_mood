module.exports = {
  async up(q,D) {
    const id={type:D.INTEGER,primaryKey:true,autoIncrement:true,allowNull:false};
    const ref=(table,nullable=false,onDelete='RESTRICT')=>({type:D.INTEGER,allowNull:nullable,references:{model:table,key:'id'},onDelete,onUpdate:'CASCADE'});
    await q.addColumn('productos','imagen',{type:D.STRING(100),allowNull:true});
    await q.createTable('rol_permisos',{
      id_rol:{...ref('roles',false,'CASCADE'),primaryKey:true},
      permiso:{type:D.STRING(60),allowNull:false,primaryKey:true},
    });
    const [roles]=await q.sequelize.query("SELECT id FROM roles WHERE codigo='cliente'");
    if(roles.length) await q.bulkInsert('rol_permisos',[
      'categorias.leer','productos.leer','clientes.leer','clientes.editar',
      'pedidos.leer','pedidos.crear','pedidos.editar','pedidos.eliminar',
      'detalles-pedido.leer','detalles-pedido.crear','detalles-pedido.editar','detalles-pedido.eliminar',
      'pagos.leer','agenda.leer',
    ].map(permiso=>({id_rol:roles[0].id,permiso})));
    await q.createTable('movimientos_inventario',{
      id,productoId:ref('productos',true,'SET NULL'),productoNombre:{type:D.STRING(100),allowNull:false},
      pedidoId:ref('pedidos',true,'SET NULL'),usuarioId:ref('usuarios',true,'SET NULL'),
      usuarioNombre:{type:D.STRING(100),allowNull:false},fecha:{type:D.DATE,allowNull:false},
      tipo:{type:D.STRING(30),allowNull:false},cantidad:{type:D.INTEGER,allowNull:false},
      stockAnterior:{type:D.INTEGER,allowNull:false},stockPosterior:{type:D.INTEGER,allowNull:false},
      motivo:{type:D.STRING(255),allowNull:false},
    });
    await q.createTable('pagos',{
      id,pedidoId:ref('pedidos'),usuarioId:ref('usuarios',true,'SET NULL'),
      usuarioNombre:{type:D.STRING(100),allowNull:false},fecha:{type:D.DATE,allowNull:false},
      monto:{type:D.DECIMAL(10,2),allowNull:false},metodo:{type:D.ENUM('efectivo','sinpe','transferencia','tarjeta'),allowNull:false},
      referencia:{type:D.STRING(100),allowNull:true},estado:{type:D.ENUM('registrado','anulado'),allowNull:false,defaultValue:'registrado'},
      anulacionMotivo:{type:D.STRING(255),allowNull:true},anuladoPor:{type:D.STRING(100),allowNull:true},fechaAnulacion:{type:D.DATE,allowNull:true},
    });
    await q.sequelize.query('ALTER TABLE pagos ADD CONSTRAINT pagos_monto_positivo CHECK (monto > 0)');
    await q.createTable('auditoria',{
      id,usuarioId:ref('usuarios',true,'SET NULL'),usuarioNombre:{type:D.STRING(100),allowNull:false},
      fecha:{type:D.DATE,allowNull:false},entidad:{type:D.STRING(60),allowNull:false},registroId:{type:D.INTEGER,allowNull:true},
      accion:{type:D.STRING(30),allowNull:false},antes:{type:D.JSON,allowNull:true},despues:{type:D.JSON,allowNull:true},
    });
    await q.createTable('recuperaciones_password',{
      usuarioId:{...ref('usuarios',false,'CASCADE'),primaryKey:true},
      tokenHash:{type:D.CHAR(64),allowNull:false,unique:true},vence:{type:D.DATE,allowNull:false},
      creado:{type:D.DATE,allowNull:false},sesionVersion:{type:D.INTEGER,allowNull:false},
    });
    await q.addIndex('movimientos_inventario',['productoId','fecha']);
    await q.addIndex('pagos',['pedidoId','estado']);
    await q.addIndex('auditoria',['fecha','id']);
    await q.addIndex('pedidos',['fechaEntrega','estado']);
    // Punto de partida: documenta el saldo existente sin inventar movimientos anteriores.
    await q.sequelize.query("INSERT INTO movimientos_inventario (productoId,productoNombre,usuarioNombre,fecha,tipo,cantidad,stockAnterior,stockPosterior,motivo) SELECT id,nombre,'Sistema',NOW(),'saldo_inicial',stock,0,stock,'Saldo disponible al habilitar el historial' FROM productos");
  },
  async down(q) {
    await q.removeIndex('pedidos',['fechaEntrega','estado']);
    for(const table of ['recuperaciones_password','auditoria','pagos','movimientos_inventario','rol_permisos']) await q.dropTable(table);
    await q.removeColumn('productos','imagen');
  },
};
