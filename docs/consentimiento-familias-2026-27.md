# Consentimiento de familias — ciclo 2026-2027

Borrador 2026-11-04. Dos partes: (A) correo que llega al correo institucional del estudiante y (B) pantalla de la app LectorNKT donde la familia acepta. Lo que está entre [corchetes] hay que completarlo.

---

## A. Correo

**Asunto:** Aprende NKT — Consentimiento para el uso de herramientas digitales de tu hija(o)

Estimada familia:

En Aprende NKT, tu hija(o) aprende con herramientas digitales dentro de su cuenta institucional **@nikolatesla.edu.mx**. Como es menor de edad, necesitamos tu consentimiento para dos cosas. Te explicamos para qué sirve cada una.

### 1. Servicios de Google para el aprendizaje

Además de Classroom, Drive y Meet, que tu hija(o) ya usa, la escuela habilitó estos servicios en su cuenta:

| Servicio | Para qué lo usamos |
|---|---|
| YouTube | Ver los videos de clase y materiales educativos |
| Google Maps y My Maps | Ubicar lugares y hacer mapas en Historia, Geografía y Ciencias |
| Google Arts & Culture | Recorrer museos y obras de arte |
| Google Traductor | Apoyo en Inglés |
| Búsqueda y Asistente de Google | Investigar para sus tareas |

Google pide que la escuela confirme que la familia está de acuerdo con que su hija(o) menor de 18 años use estos servicios con su cuenta institucional.

### 2. LectorNKT: entrenamiento en lectura

LectorNKT es nuestra plataforma para que tu hija(o) **lea mejor y comprenda lo que lee**. En algunas lecturas se le pedirá **leer en voz alta durante un minuto y grabarse**, para que su maestra(o) la escuche y le ayude a mejorar.

- **Quién escucha la grabación:** solo las y los docentes de Aprende NKT.
- **Dónde se guarda:** en el Google Drive institucional de tu hija(o), en una carpeta llamada "LectorNKT". No se publica ni se comparte fuera de la escuela.
- **Cuánto tiempo:** se borra al terminar el ciclo escolar. Solo conservamos sus resultados de lectura para darle seguimiento.
- **Para qué no se usa:** no se usa con fines comerciales ni se comparte con otras empresas.

Si no das tu consentimiento para grabar, tu hija(o) puede seguir usando LectorNKT con lecturas en silencio y preguntas de comprensión.

### Cómo dar tu consentimiento

La próxima vez que tu hija(o) entre a LectorNKT aparecerá una pantalla de consentimiento. **Te pedimos llenarla tú junto con ella o él.** Puedes aceptar una parte y no la otra.

Puedes retirar tu consentimiento en cualquier momento escribiéndonos por WhatsApp al **444 421 1901**.

Consulta nuestro aviso de privacidad: [enlace al aviso de privacidad]

Gracias por acompañar el aprendizaje de tu hija(o).

**Aprende NKT**

---

## B. Pantalla en LectorNKT

Aparece la primera vez que el estudiante entra después del lanzamiento. Si no se llena, se puede cerrar y vuelve a aparecer en el siguiente ingreso. El modo voz alta queda bloqueado hasta que se acepte la parte 2.

> **Esta pantalla es para tu mamá, papá o tutor.** Pídele que la lea y la llene contigo.
>
> **Consentimiento de la familia · ciclo 2026-2027**
>
> [Resumen de los dos puntos del correo, en una tarjeta cada uno, con el enlace "Leer el aviso completo"]
>
> **Nombre completo de la madre, padre o tutor:** [campo de texto]
> **Parentesco:** [Madre / Padre / Tutor(a) / Otro]
>
> ☐ **Acepto** que mi hija(o) use los servicios de Google para el aprendizaje descritos arriba con su cuenta institucional.
> ☐ **Acepto** que mi hija(o) grabe su lectura en voz alta en LectorNKT, que sus docentes la escuchen y que se guarde en su Drive institucional hasta el fin del ciclo escolar.
>
> He leído el [aviso de privacidad] de Aprende NKT.
>
> **[Guardar]**
>
> *Puedes cambiar tu decisión cuando quieras escribiendo al WhatsApp 444 421 1901.*

**Qué se guarda (tabla `lec_consents`):** student_id, guardian_name, relationship, accepts_google_services (sí/no), accepts_voice_recording (sí/no), consent_version (`2026-27-v1`), accepted_at. **Sin CURP.**

**Panel docente:** columna "Consentimiento" por estudiante (✓ completo / ½ parcial / — pendiente) y un filtro de "pendientes", para dar seguimiento a quienes falten.

---

## Pendientes antes de enviar
- [ ] Enlace al aviso de privacidad vigente del colegio (y revisar que el texto sea congruente con él).
- [ ] ¿Las mismas 6 herramientas de Google aplican a **Aprende NKT Online** y a **Virtual**?
- [ ] Fecha de envío del correo; idealmente cuando la pantalla de la app ya esté construida (Fase 1), para que las familias puedan contestar de inmediato.
