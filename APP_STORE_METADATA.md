# UPDATE SIM - Metadatos App Store

## Nombre de la App
UPDATE SIM

## Subtítulo (máx 30 caracteres)
Simulador de Monitor Paciente

## Categoría Principal
Medical

## Categoría Secundaria
Education

## Dispositivos
**Solo iPad** (`TARGETED_DEVICE_FAMILY = 2`). El layout actual se corta en pantallas de iPhone;
cuando se haga responsive, volver a `"1,2"` en `ios/App/App.xcodeproj/project.pbxproj` y agregar screenshots de iPhone.

## Descripción (máx 4000 caracteres)

### Español (Chile)
UPDATE SIM es un simulador profesional de monitor de paciente y desfibrilador diseñado para la capacitación médica en cursos ACLS, PALS, PHTLS y otras certificaciones de emergencias.

Ideal para instructores y centros de simulación clínica que necesitan una herramienta confiable, portátil y realista para entrenar equipos médicos.

CARACTERÍSTICAS PRINCIPALES:

- Monitor de signos vitales con ondas en tiempo real (ECG, SpO2, capnografía, presión arterial)
- 38 ritmos cardíacos incluyendo sinusal, fibrilación auricular, taquicardias, bloqueos AV y más
- 18 ondas de capnografía
- Desfibrilador con cardioversión y desfibrilación
- Marcapasos transcutáneo
- Más de 50 medicamentos con efectos fisiológicos realistas
- Más de 100 escenarios clínicos preconfigurados (ACLS, PALS, EPALS, PREHOSP, MAVACRIT, OBSTACRIT, EPC, AEROCRIT y más)
- Compresiones torácicas con retroalimentación visual
- Interfaz en español
- Funciona sin conexión a internet
- Optimizado para iPad

Desarrollado por Update Capacitación, Viña del Mar, Chile.

### English
UPDATE SIM is a professional patient monitor and defibrillator simulator designed for medical training in ACLS, PALS, PHTLS and other emergency certification courses.

Ideal for instructors and clinical simulation centers that need a reliable, portable and realistic tool to train medical teams.

KEY FEATURES:

- Vital signs monitor with real-time waveforms (ECG, SpO2, capnography, blood pressure)
- 38 cardiac rhythms including sinus, atrial fibrillation, tachycardias, AV blocks and more
- 18 capnography waveforms
- Defibrillator with cardioversion and defibrillation
- Transcutaneous pacemaker
- Over 50 medications with realistic physiological effects
- Over 100 preconfigured clinical scenarios (ACLS, PALS, EPALS, PREHOSP, MAVACRIT, OBSTACRIT, EPC, AEROCRIT and more)
- Chest compressions with visual feedback
- Spanish interface
- Works offline
- Optimized for iPad

Developed by Update Capacitación, Viña del Mar, Chile.

## Palabras Clave (máx 100 caracteres, separadas por coma)
ritmos,arritmias,ECG,electrocardiograma,desfibrilador,RCP,ACLS,PALS,enfermería,emergencias,urgencias
(sin repetir palabras del título/subtítulo: "Simulador", "Monitor" y "Paciente" ya se indexan desde ahí —
"simulador de ritmos" se cubre combinando subtítulo + keyword "ritmos")

## Keywords (English)
simulator,patient,monitor,ECG,defibrillator,ACLS,PALS,medical,emergency,capnography,simulation

## URL de Soporte
https://updatemedic-dev.github.io/update-sim/

## URL de Política de Privacidad (OBLIGATORIO)
https://updatemedic-dev.github.io/update-sim/privacidad.html
(archivo `public/privacidad.html` — queda publicado con el próximo push a main)

## Clasificación por Edad
4+ (sin contenido objetable)

## Precio
US$49,99 (configurado vía API el 2026-07-25, base territory USA)

## Disponibilidad
Todos los países / Chile solamente (tú decides)

## Screenshots — LISTOS ✔
Generados en `app-store/screenshots/ipad-13/` (2732×2048 landscape, iPad 13"/12.9"):
1. `01-monitor.png` — monitor con ritmo sinusal y PNI medida
2. `02-escenarios.png` — panel de 105 escenarios
3. `03-ritmos.png` — teclado de 38 ritmos
4. `04-meds.png` — panel de medicamentos
5. `05-defib.png` — desfibrilador cargado a 200 J

Al ser app solo-iPad, NO se requieren screenshots de iPhone.
Para regenerarlos: script en el scratchpad de la sesión (`screenshots.mjs`, Playwright contra `vite preview`).

## App Privacy (Declaración de Privacidad)
La app NO recopila datos → seleccionar **"Data Not Collected"** en App Store Connect.

## Export Compliance
`ITSAppUsesNonExemptEncryption = false` ya está en Info.plist → App Store Connect no preguntará por cifrado en cada build.

---

## ESTADO DE PREPARACIÓN (actualizado 2026-07-11)

### Hecho ✔
1. [x] Build de producción verificado (`npm run build` — tsc + vite OK)
2. [x] Tests 334/334 verdes (correr desde ruta SIN espacios — ver nota abajo)
3. [x] `npx cap copy ios` — assets web sincronizados al proyecto iOS
4. [x] Ícono 1024×1024 en `AppIcon.appiconset`
5. [x] Screenshots iPad (5, resolución exacta App Store)
6. [x] Política de privacidad (`public/privacidad.html`)
7. [x] `ITSAppUsesNonExemptEncryption = false` en Info.plist
8. [x] App solo-iPad (`TARGETED_DEVICE_FAMILY = 2`)
9. [x] Metadata ES/EN con conteos reales (38 ritmos / 50+ meds / 105 escenarios)

### Estado 2026-07-25
1. [x] Xcode 26.6 instalada (App Store) y xcode-select apuntando a ella
2. [x] Cuenta Apple Developer activa (equipo personal Osvaldo Campos Carvajal)
3. [x] Push a main hecho — política de privacidad viva en GitHub Pages
4. [x] App creada en ASC: id 6794471586, bundle `com.updatecapacitacion.updatesim`, SKU UPDATESIM-IOS-001, locale es-MX
5. [x] Vía API (key claude-automation / 7AHFD767W5 en `~/.appstoreconnect/private_keys/`): descripción, keywords, support URL, subtítulo, privacy URL, categorías MEDICAL+EDUCATION, clasificación por edades, precio Gratis, 5 screenshots iPad
6. [x] App Privacy "No se recopilan datos" publicada
7. [x] Licencia Xcode aceptada + runtime iOS 26.5 instalado
8. [x] Archive firmado + build 1.0 (1) subido a ASC — cert distribución 36BQM4W2TG creado por API (CSR local), perfil "UPDATE SIM App Store", iPhone 17 registrado como dispositivo
9. [x] Build adjuntado a v1.0, precio US$49,99, keywords ASO nuevas, contacto App Review (contacto@updatecapacitacion.cl / +56966034865), copyright © 2026 Update Capacitación, contenido propio, sin demo account
10. [x] **ENVIADA A REVISIÓN el 2026-07-25 — estado WAITING_FOR_REVIEW** 🎉

### Post-lanzamiento
- Códigos promocionales (100 por versión) para regalar la app: ficha de la app → Códigos promocionales (disponible tras aprobación)
- Respuesta de Apple: típicamente 1-3 días. Si rechazan, los motivos llegan a contacto@updatecapacitacion.cl y a App Store Connect

### Nota: tests y rutas con espacios
`npm test` falla en esta carpeta porque vitest 4 + Node 22.22 no soporta rutas con espacios
(`ANTI PRUEBA/SOFTWARE/UPDATE SIM`). Los workers mueren con "Timeout waiting for worker to respond".
Workaround: copiar el proyecto a una ruta sin espacios y correr ahí, o renombrar las carpetas.
