// Inserta cuatro logs de ejemplo: uno con insertOne y tres con insertMany.
// Cada ejecución agrega cuatro documentos nuevos.
export async function cargarDatosIniciales(base) {
    await base.collection('logs').insertOne({
        tipo: 'sistema',
        nivel: 'info',
        fecha: new Date(),
        datos: { mensaje: 'Inicio de la carga de datos de ejemplo' }
    });

    const resultado = await base.collection('logs').insertMany([
        { tipo: 'sistema', nivel: 'info', fecha: new Date(), datos: { mensaje: 'Base de logs inicializada' } },
        {
            tipo: 'peticion', nivel: 'info', fecha: new Date(),
            datos: { metodo: 'GET', ruta: '/api/v1/salas', estado: 200, duracionMs: 12.4 }
        },
        {
            tipo: 'auditoria', nivel: 'info', fecha: new Date(),
            datos: { accion: 'crear', entidad: 'sala', codigo: 'ejemplo', cambios: { nombre: 'Sala Olimpo', capacidad: 8 } }
        }
    ]);
    console.log(`Logs insertados: ${1 + resultado.insertedCount}`);
}
