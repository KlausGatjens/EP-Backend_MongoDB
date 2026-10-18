# EP-Backend_MongoDB · Base de datos MongoDB

Repositorio **3 de 3** de **Mythos Coworking · Sistema de Gestión de Reservas**. Contiene los scripts de
MongoDB: el **archivo de esquemas** (colecciones, validadores e índices) y la **carga inicial** (`insertMany`).

| Repositorio | Contenido |
| --- | --- |
| [EP-Backend](https://github.com/TheDanielrity/EP-Backend) | API REST con Node.js + Express |
| [EP-Backend_BBDD](https://github.com/KlausGatjens/EP-Backend_BBDD) | SQL Server: tablas, índices, vista, procedimientos almacenados y datos |
| **EP-Backend_MongoDB** (este) | MongoDB: esquemas de logs y comentarios y su carga inicial |

> Evaluación Parcial · Desarrollo Web Full Stack Backend · Universidad Autónoma del Perú

---

## ¿Por qué MongoDB además de SQL Server?

- **SQL Server** garantiza integridad y consistencia (ACID) donde el negocio lo exige: salas, usuarios y reservas.
- **MongoDB** almacena información de alto volumen y forma variable (logs, comentarios) sin bloquear las
  tablas transaccionales ni obligar a migraciones de esquema cuando aparece un nuevo tipo de evento.

## Estructura del repositorio

```text
EP-Backend_MongoDB/
├── esquemas.js        # Archivo de esquemas: colecciones, validadores $jsonSchema e índices
├── carga_inicial.js   # Carga inicial con insertMany (logs de ejemplo)
└── README.md
```

## Ejecución

```bash
mongosh "mongodb://127.0.0.1:27017" esquemas.js
mongosh "mongodb://127.0.0.1:27017" carga_inicial.js
```

Con MongoDB Atlas, reemplazar la URI por `mongodb+srv://usuario:clave@cluster.xxxxx.mongodb.net`.
Desde MongoDB Compass: pestaña **_MONGOSH** → `load("C:/ruta/al/repositorio/esquemas.js")` y luego `carga_inicial.js`.

La API (EP-Backend) también crea estas colecciones, con los mismos validadores e índices, al arrancar o con
`npm run db:setup`. Por eso este script es **re-ejecutable**: si la colección ya existe, solo actualiza su validador.

## Base `MythosLogs`

### Colección `logs`: esquema flexible

Todos los documentos comparten `tipo`, `nivel` y `fecha` (validados con `$jsonSchema`); el subdocumento
`datos` es libre, de modo que cada tipo de evento guarda su propia estructura en BSON:

```js
// Petición HTTP (middleware logging de la API)
{ tipo: 'peticion', nivel: 'info', fecha: ISODate(),
  datos: { idPeticion, metodo: 'POST', ruta: '/api/v1/reservas', estado: 201, duracionMs: 18.4, ip, agente } }

// Auditoría (controladores): qué se cambió
{ tipo: 'auditoria', nivel: 'info', fecha: ISODate(),
  datos: { idPeticion, accion: 'crear', entidad: 'reserva', codigo: '6E0B…', cambios: { fechaInicio, fechaFin } } }

// Error (manejador global)
{ tipo: 'error', nivel: 'warn', fecha: ISODate(),
  datos: { idPeticion, ruta: '/api/v1/reservas', estado: 409, mensaje: 'La sala ya está reservada en ese horario' } }

// Sistema (arranque / apagado)
{ tipo: 'sistema', nivel: 'info', fecha: ISODate(), datos: { mensaje: 'Servidor iniciado', puerto: 3000 } }
```

El `idPeticion` (también enviado en la cabecera `X-Request-Id`) permite **correlacionar** la petición, su
auditoría y su error.

### Colección `comentarios`

```js
{ _id: ObjectId(), codigoSala: '8f1c…', autor: { codigoUsuario: '2b7a…', nombres: 'Ana Torres' },
  texto: 'Excelente iluminación', calificacion: 5, etiquetas: ['wifi'], fecha: ISODate() }
```

El autor se **embebe** (desnormalización intencional, propia de NoSQL) para listar comentarios sin consultar
SQL Server. Antes de insertar, la API verifica en SQL Server que la sala y el usuario existan.

### Validadores `$jsonSchema`

| Colección | Campos obligatorios | Reglas |
| --- | --- | --- |
| logs | `tipo`, `nivel`, `fecha` | `nivel` ∈ {info, warn, error}; `fecha` de tipo `date`; `datos` es un objeto libre |
| comentarios | `codigoSala`, `autor`, `texto`, `calificacion`, `fecha` | `calificacion` entera de 1 a 5; `texto` de 1 a 500 caracteres |

### Índices (diseño óptimo)

| Colección | Índice | Propósito |
| --- | --- | --- |
| logs | `ttl_fecha` `{ fecha: 1 }` TTL 90 días | Borra automáticamente los logs antiguos |
| logs | `tipo_fecha` `{ tipo: 1, fecha: -1 }` | Filtrar por tipo, más recientes primero |
| logs | `nivel_fecha` `{ nivel: 1, fecha: -1 }` | Filtrar errores y advertencias recientes |
| comentarios | `sala_fecha` `{ codigoSala: 1, fecha: -1 }` | Comentarios de una sala, más recientes primero |
| comentarios | `autor_usuario` `{ 'autor.codigoUsuario': 1 }` | Comentarios por autor |

## Carga inicial

`carga_inicial.js` inserta con `insertMany` tres logs de ejemplo (`sistema`, `peticion` y `auditoria`), cada uno
con una forma distinta en `datos`, para mostrar el esquema flexible.

## Consultas útiles

```js
use MythosLogs
db.logs.find({ tipo: 'auditoria' }).sort({ fecha: -1 }).limit(10)
db.logs.find({ 'datos.idPeticion': '<X-Request-Id>' })
db.logs.aggregate([{ $group: { _id: '$tipo', total: { $sum: 1 } } }])
db.comentarios.find({ codigoSala: '<codigo>' }).sort({ fecha: -1 })
```
