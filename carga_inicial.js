/* =============================================================================
   MYTHOS COWORKING - Sistema de Gestión de Reservas - Script de MongoDB (mongosh)
   Carga inicial (insertMany)
   -----------------------------------------------------------------------------
   Requiere: esquemas.js (o haber iniciado la API una vez).
   Ejecutar con:
     mongosh "mongodb://127.0.0.1:27017" carga_inicial.js

   Documentos de ejemplo: la misma colección `logs` guarda eventos con distinta
   forma en `datos` (esquema flexible).
   ============================================================================= */

const base = db.getSiblingDB('MythosLogs');

const resultado = base.logs.insertMany([
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

print(`MythosLogs: ${Object.keys(resultado.insertedIds).length} logs insertados.`);
print(`Total de logs: ${base.logs.countDocuments()}`);
