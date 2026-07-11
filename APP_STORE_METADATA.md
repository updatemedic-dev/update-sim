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
simulador,monitor,paciente,ECG,desfibrilador,ACLS,PALS,médico,emergencias,capnografía,simulación

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
Gratis (o el precio que definas)

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

### Pendiente (requiere a Osvaldo)
1. [ ] **Instalar Xcode** desde Mac App Store (solo hay Command Line Tools) y correr `sudo xcode-select -s /Applications/Xcode.app`
2. [ ] **Cuenta Apple Developer** activa (US$99/año) — enrollment en developer.apple.com
3. [ ] Commit + push a main (publica también la política de privacidad en GitHub Pages)
4. [ ] Crear la app en App Store Connect (bundle ID `com.updatecapacitacion.updatesim`)
5. [ ] Abrir `ios/App/App.xcodeproj` en Xcode → Signing & Capabilities → seleccionar tu Team
6. [ ] Product → Archive → Distribute App → App Store Connect
7. [ ] En App Store Connect: pegar metadata de este archivo, subir screenshots de `app-store/screenshots/ipad-13/`, marcar "Data Not Collected", enviar a revisión

### Nota: tests y rutas con espacios
`npm test` falla en esta carpeta porque vitest 4 + Node 22.22 no soporta rutas con espacios
(`ANTI PRUEBA/SOFTWARE/UPDATE SIM`). Los workers mueren con "Timeout waiting for worker to respond".
Workaround: copiar el proyecto a una ruta sin espacios y correr ahí, o renombrar las carpetas.
