# DEPLOY STATUS — UPDATE SIM

**Fecha:** 2026-05-16  
**Repo:** `updatemedic-dev/update-sim`  
**Branch actual:** `claude/spanish-greeting-HmlGA`  
**Branch de producción:** `main`

---

## URL esperada

```
https://updatemedic-dev.github.io/update-sim/
```

---

## Estado actual: NO DESPLEGADO (desde este branch)

El deploy **no está activo** para los cambios de este branch. A continuación el detalle.

---

## Evidencias y hallazgos

### 1. GitHub Actions Workflow

El workflow `.github/workflows/deploy.yml` **existe en ambos branches**, pero con diferencias:

| Aspecto | `main` | `claude/spanish-greeting-HmlGA` |
|---------|--------|-------------------------------|
| Branches trigger | `[main]` | `[main, claude/spanish-greeting-HmlGA]` |
| Variable `GITHUB_PAGES` | Se pasa como env al build | **No se pasa** |
| `cancel-in-progress` | `true` | `false` |

### 2. Vite `base` path — PROBLEMA CRITICO

| Branch | `base` en `vite.config.ts` |
|--------|---------------------------|
| `main` | `process.env.GITHUB_PAGES ? '/update-sim/' : '/'` (dinámico) |
| `claude/spanish-greeting-HmlGA` | `'./'` (relativo fijo) |

**Problema:** En `main`, el base path se resuelve a `/update-sim/` cuando el workflow pasa `GITHUB_PAGES=true`. En este branch, se cambió a `'./'` para compatibilidad con Capacitor, y además **se eliminó la variable de entorno** del workflow.

- Con `base: './'`, GitHub Pages **podría funcionar** (los assets se referencian como `./assets/...`), pero es menos confiable que `/update-sim/`.
- El `manifest.json` y `favicon.svg` se referencian como `./manifest.json` y `./favicon.svg`, lo cual debería funcionar.

### 3. PWA (VitePWA) — REMOVIDA

En `main`, el `vite.config.ts` incluye `vite-plugin-pwa` con Workbox. En este branch **se eliminó completamente**, lo que significa:

- No se genera service worker automático
- El archivo `sw.js` en `dist/` existe pero es un vestigio estático, no generado por VitePWA

### 4. Commits pendientes de merge (7 commits)

```
c75b07c Detener compresiones con tecla N del teclado
0572e97 Cerrar menú de medicamentos al seleccionar uno
32c349c Modificar signos vitales ±1 en todos los escenarios y ritmos
89eb4dd Configurar Capacitor para iOS
46d47df Agregar deploy a GitHub Pages con GitHub Actions
f7a81cd Rediseño DART Sim Pro: solo ECG, sidebar derecho, touch iPad
afc75f2 UPDATE SIM v1.0 — Monitor multiparamétrico + 43 escenarios clínicos
```

### 5. Build de producción

```
npm run build → OK
dist/index.html         1.26 kB
dist/assets/index-*.css 26.10 kB
dist/assets/index-*.js  305.24 kB
```

Build exitoso. Los assets se referencian con `./` (relativo).

### 6. GitHub Pages — Requiere configuración manual en GitHub

No se pudo verificar remotamente si GitHub Pages está habilitado en el repo (no hay `gh` CLI disponible). El workflow existe pero requiere que:

1. GitHub Pages esté habilitado en Settings del repo
2. Source esté configurado como "GitHub Actions"
3. Los cambios estén en `main` (o el branch configurado)

---

## Comandos ejecutados

| Comando | Resultado |
|---------|-----------|
| `git branch -a` | Branches local y remoto verificados |
| `git log main..feature --oneline` | 7 commits pendientes de merge |
| `git show main:vite.config.ts` | Base path dinámico con env var |
| `git show main:.github/workflows/deploy.yml` | Workflow solo para `main` |
| `git diff main..feature -- vite.config.ts` | PWA removida, base cambiado |
| `git diff main..feature -- deploy.yml` | Env var GITHUB_PAGES removida |
| `npm run build` | Build exitoso |
| `ls dist/` | Assets generados correctamente |

---

## Pasos exactos para publicar

### Opción A: Merge a main (recomendado)

1. **Antes del merge**, restaurar el base path dinámico en `vite.config.ts`:
   ```ts
   base: process.env.GITHUB_PAGES ? '/update-sim/' : './',
   ```
   Esto mantiene compatibilidad con Capacitor (`./`) y GitHub Pages (`/update-sim/`).

2. **Restaurar la env var** en `.github/workflows/deploy.yml`:
   ```yaml
   - run: npm run build
     env:
       GITHUB_PAGES: true
   ```

3. **Crear un Pull Request** desde `claude/spanish-greeting-HmlGA` → `main`.

4. **Hacer merge** del PR.

5. **En GitHub** (si no está configurado):
   - Ir a `Settings` → `Pages`
   - En "Source", seleccionar **GitHub Actions**
   - Guardar

6. El workflow se ejecutará automáticamente en el push a `main`.

7. Verificar en: `https://updatemedic-dev.github.io/update-sim/`

### Opción B: Deploy manual con gh-pages (alternativa rápida)

```bash
# Desde tu Mac/PC con acceso al repo
git checkout claude/spanish-greeting-HmlGA
npm install
npm run build
npx gh-pages -d dist
```

Luego en GitHub Settings → Pages → Source: "Deploy from branch" → `gh-pages` / `/ (root)`.

### Opción C: Vercel (más simple)

1. Ir a [vercel.com](https://vercel.com)
2. Conectar el repo `updatemedic-dev/update-sim`
3. Framework: Vite
4. Asegurarse de que `base` sea `'/'` (no `/update-sim/`)
5. Deploy automático en cada push

---

## Resumen

| Item | Estado |
|------|--------|
| Código compilable | OK |
| Build de producción | OK (305 KB JS + 26 KB CSS) |
| Workflow de GitHub Actions | Existe pero con conflictos de config entre branches |
| Base path para GitHub Pages | Roto (se cambió a `./`, falta env var) |
| GitHub Pages habilitado en repo | No verificable desde aquí |
| PWA / Service Worker | Removido en este branch |
| Capacitor iOS | Configurado y funcional |
| **Acción requerida** | **Restaurar base path dinámico + merge a main + verificar Pages en GitHub Settings** |
