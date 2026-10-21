// Crea o actualiza las colecciones, validadores e índices sin borrar documentos.
export async function crearEsquemas(base) {
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

    const existentes = (await base.listCollections({}, { nameOnly: true }).toArray()).map((coleccion) => coleccion.name);
    for (const [nombre, validator] of Object.entries(validadores)) {
        const opciones = { validator, validationLevel: 'moderate', validationAction: 'error' };
        if (existentes.includes(nombre)) await base.command({ collMod: nombre, ...opciones });
        else await base.createCollection(nombre, opciones);
    }

    // logs: TTL (borrado automático), consultas por tipo y por nivel ordenadas por fecha.
    await base.collection('logs').createIndex({ fecha: 1 }, { name: 'ttl_fecha', expireAfterSeconds: DIAS_RETENCION_LOGS * 86400 });
    await base.collection('logs').createIndex({ tipo: 1, fecha: -1 }, { name: 'tipo_fecha' });
    await base.collection('logs').createIndex({ nivel: 1, fecha: -1 }, { name: 'nivel_fecha' });

    // comentarios: listado por sala (más recientes primero) y por autor.
    await base.collection('comentarios').createIndex({ codigoSala: 1, fecha: -1 }, { name: 'sala_fecha' });
    await base.collection('comentarios').createIndex({ 'autor.codigoUsuario': 1 }, { name: 'autor_usuario' });
}
