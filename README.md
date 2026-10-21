# EP-Backend_MongoDB · Base de datos MongoDB

Repositorio **3 de 3** de **Mythos Coworking · Sistema de Gestión de Reservas**. Contiene los scripts de
MongoDB: el **archivo de esquemas** (colecciones, validadores e índices) y la **carga inicial** (`insertOne` e `insertMany`).

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
├── .env.example       # Plantilla de conexión (copiar a .env)
├── package.json       # Dependencias y comandos npm
├── inicializar.js     # Ejecuta esquema y carga inicial en orden
├── esquemas.js        # Archivo de esquemas: colecciones, validadores $jsonSchema e índices
├── carga_inicial.js   # Carga inicial con insertOne e insertMany (logs de ejemplo)
└── README.md
```

## Ejecución

Requiere Node.js 20.19 o superior y un servidor MongoDB disponible.
Abre una terminal en la carpeta de este repositorio:

```powershell
npm install
Copy-Item .env.example .env
```

Si ya tienes `.env`, conserva tu archivo. Edita sus valores según tu servidor:

```dotenv
MONGO_URI=mongodb://127.0.0.1:27017
MONGO_DATABASE=MythosLogs
```

Para Atlas o un servidor con autenticación, usa la URI correspondiente en `MONGO_URI`.
El archivo `.env` está excluido de Git; `.env.example` es la plantilla sin credenciales.
El nombre de la base debe coincidir con `MONGO_DATABASE` de la API.

Ejecuta:

```powershell
npm start
```

`inicializar.js` lee las variables cargadas desde `.env`, abre una conexión con `MongoClient`
y selecciona la base configurada. Después ejecuta, en orden:

1. `crearEsquemas(base)` de `esquemas.js`: colecciones, validadores e índices.
2. `cargarDatosIniciales(base)` de `carga_inicial.js`: cuatro logs de ejemplo, uno con `insertOne` y tres con `insertMany`.

Al terminar cierra la conexión. Si ocurre un error, termina con código de error.
Los archivos `esquemas.js` y `carga_inicial.js` son funciones usadas por el inicializador;
no se ejecutan con `mongosh` ni se conectan por separado.

No se borran documentos. Si repites la inicialización, se agregan otros cuatro logs.
Los comentarios quedan vacíos hasta que se creen desde la API, para usar códigos reales de salas y usuarios.
Ejecuta este comando antes de iniciar la API: la API no crea ni actualiza la estructura de MongoDB.

Para verificar los scripts sin conectarse al servidor:

```powershell
npm test
```

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

`carga_inicial.js` inserta primero un log de tipo `sistema` con `insertOne`. Después inserta con `insertMany` otros tres logs de ejemplo (`sistema`, `peticion` y `auditoria`), cada uno
con una forma distinta en `datos`, para mostrar el esquema flexible.

## Consultas útiles

```js
use MythosLogs
db.logs.find({ tipo: 'auditoria' }).sort({ fecha: -1 }).limit(10)
db.logs.find({ 'datos.idPeticion': '<X-Request-Id>' })
db.logs.aggregate([{ $group: { _id: '$tipo', total: { $sum: 1 } } }])
db.comentarios.find({ codigoSala: '<codigo>' }).sort({ fecha: -1 })
```
