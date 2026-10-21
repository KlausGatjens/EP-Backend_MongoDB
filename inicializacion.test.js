import assert from 'node:assert/strict';
import { test } from 'node:test';
import { crearEsquemas } from './esquemas.js';
import { cargarDatosIniciales } from './carga_inicial.js';

for (const existentes of [[], ['logs', 'comentarios']]) {
    test(`Prepara colecciones ${existentes.length ? 'existentes' : 'nuevas'} sin borrar datos`, async () => {
        const creadas = [];
        const actualizadas = [];
        const indices = [];
        const base = {
            listCollections: () => ({ toArray: async () => existentes.map(name => ({ name })) }),
            createCollection: async (nombre, opciones) => {
                assert.ok(opciones.validator.$jsonSchema.required.length > 0);
                creadas.push(nombre);
            },
            command: async (opciones) => {
                assert.ok(opciones.validator.$jsonSchema.required.length > 0);
                actualizadas.push(opciones.collMod);
            },
            collection: nombre => ({ createIndex: async (clave, opciones) => indices.push({ nombre, clave, opciones }) })
        };
        await crearEsquemas(base);
        assert.deepEqual(creadas, existentes.length ? [] : ['logs', 'comentarios']);
        assert.deepEqual(actualizadas, existentes);
        assert.equal(indices.length, 5);
        assert.equal(indices.find(i => i.opciones.name === 'ttl_fecha').opciones.expireAfterSeconds, 90 * 86400);
    });
}

test('La carga inicial inserta cuatro logs mediante insertOne e insertMany', async () => {
    const insertados = [];
    const base = {
        collection: nombre => {
            assert.equal(nombre, 'logs');
            return {
                insertOne: async documento => {
                    assert.equal(documento.tipo, 'sistema');
                    assert.equal(documento.nivel, 'info');
                    assert.ok(documento.fecha instanceof Date);
                    assert.equal(documento.datos.mensaje, 'Inicio de la carga de datos de ejemplo');
                    insertados.push(documento);
                    return { insertedId: 'log-inicial' };
                },
                insertMany: async documentos => {
                assert.equal(documentos.length, 3);
                assert.deepEqual(documentos.map(d => d.tipo), ['sistema', 'peticion', 'auditoria']);
                assert.ok(documentos.every(d => d.fecha instanceof Date && d.nivel === 'info'));
                insertados.push(...documentos);
                return { insertedCount: documentos.length };
            } };
        }
    };
    await cargarDatosIniciales(base);
    assert.equal(insertados.length, 4);
});
