/* =============================================================================
   MYTHOS COWORKING - Sistema de Gestión de Reservas - Script de MongoDB (mongosh)
   Archivo de esquemas
   -----------------------------------------------------------------------------
   Crea la base MythosLogs con dos colecciones:
     - logs        : actividad del sistema (peticiones, auditoría, errores).
     - comentarios : opiniones y calificaciones de las salas.
   Cada colección tiene un validador $jsonSchema y sus índices.

   La API (repositorio EP-Backend) ejecuta esta misma inicialización al arrancar
   (src/db/mongodb.js), por lo que este script es opcional. Ejecutar con:
     mongosh "mongodb://127.0.0.1:27017" esquemas.js
   Luego, la carga inicial:
     mongosh "mongodb://127.0.0.1:27017" carga_inicial.js
   ============================================================================= */

const base = db.getSiblingDB('MythosLogs');
const DIAS_RETENCION_LOGS = 90;

const validadores = {
    logs: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['tipo', 'nivel', 'fecha'],
            properties: {
                tipo: { bsonType: 'string' },
                nivel: { enum: ['info', 'warn', 'error'] },
                fecha: { bsonType: 'date' },
                datos: { bsonType: 'object' } // esquema flexible: cada tipo guarda su propia forma
            }
        }
    },
    comentarios: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['codigoSala', 'autor', 'texto', 'calificacion', 'fecha'],
            properties: {
                codigoSala: { bsonType: 'string' },
                autor: {
                    bsonType: 'object',
                    required: ['codigoUsuario', 'nombres'],
                    properties: { codigoUsuario: { bsonType: 'string' }, nombres: { bsonType: 'string' } }
                },
                texto: { bsonType: 'string', minLength: 1, maxLength: 500 },
                calificacion: { bsonType: 'int', minimum: 1, maximum: 5 },
                etiquetas: { bsonType: 'array', items: { bsonType: 'string' } },
                fecha: { bsonType: 'date' }
            }
        }
    }
};

const existentes = base.getCollectionNames();
for (const [nombre, validator] of Object.entries(validadores)) {
    const opciones = { validator, validationLevel: 'moderate', validationAction: 'error' };
    if (existentes.includes(nombre)) base.runCommand({ collMod: nombre, ...opciones });
    else base.createCollection(nombre, opciones);
}

// logs: TTL (borrado automático), consultas por tipo y por nivel ordenadas por fecha.
base.logs.createIndex({ fecha: 1 }, { name: 'ttl_fecha', expireAfterSeconds: DIAS_RETENCION_LOGS * 86400 });
base.logs.createIndex({ tipo: 1, fecha: -1 }, { name: 'tipo_fecha' });
base.logs.createIndex({ nivel: 1, fecha: -1 }, { name: 'nivel_fecha' });

// comentarios: listado por sala (más recientes primero) y por autor.
base.comentarios.createIndex({ codigoSala: 1, fecha: -1 }, { name: 'sala_fecha' });
base.comentarios.createIndex({ 'autor.codigoUsuario': 1 }, { name: 'autor_usuario' });

print('MythosLogs: colecciones e índices listos.');
printjson(base.logs.getIndexes().map((i) => i.name));
printjson(base.comentarios.getIndexes().map((i) => i.name));
