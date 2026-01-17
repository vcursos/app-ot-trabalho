# PWA Auto-Refresh Test Plan

## Overview
This document describes how to test the PWA auto-refresh feature that automatically clears the service worker cache and reloads the app when a new version is detected.

## Test Scenarios

### 1. Auto-Refresh on New Deploy
**Goal**: Verify that when a new version is deployed, the app automatically detects it, clears cache, and reloads.

**Steps**:
1. Open the app in a browser (Chrome, Safari iOS, etc.)
2. Wait for the app to load and service worker to register
3. Open DevTools Console and note the SW version
4. Deploy a new version (increment `CACHE_NAME` in `sw.js`)
5. Reload the page or wait for SW update check
6. **Expected**: App should automatically:
   - Detect the new SW version
   - Show "Atualizando app…" message
   - Clear cache storage
   - Reload once
   - Show new version with updated UI
7. **Expected**: Console should show:
   - "Nova versão instalada, iniciando auto-refresh..."
   - "Cache limpo automaticamente para atualização"
   - "Controller mudou, recarregando para versão nova..."

### 2. No Data Loss
**Goal**: Verify that auto-refresh preserves localStorage and Firebase session.

**Steps**:
1. Create some test data (add a few OTs)
2. Log in to Firebase sync if available
3. Note the localStorage data (open DevTools → Application → Local Storage)
4. Trigger a new version deploy (increment SW cache version)
5. Wait for auto-refresh
6. **Expected**: 
   - All OT data is still present
   - Firebase session is maintained (no need to log in again)
   - No data loss from localStorage

### 3. Manual Button Still Works
**Goal**: Verify that the manual "🔄 Atualizar app (limpar cache)" button still functions correctly.

**Steps**:
1. Open the app
2. Click the "🔄 Atualizar app (limpar cache)" button in the header
3. Confirm the action in the dialog
4. **Expected**:
   - Shows "Limpando cache..." status
   - Clears service worker registrations
   - Clears cache storage
   - Reloads the page
   - All localStorage data is preserved
   - Firebase session is preserved

### 4. Fallback for Unsupported Browsers
**Goal**: Verify graceful degradation when SW/Cache API not available.

**Steps**:
1. Open the app in a browser without Service Worker support (if possible)
2. Check console for warning message
3. **Expected**: 
   - Console shows: "Service Worker não suportado neste navegador"
   - App still functions normally (without PWA features)

### 5. Safari iOS Specific Test
**Goal**: Verify auto-refresh works on Safari iOS (important for the issue).

**Steps**:
1. Install the PWA on iOS device (Add to Home Screen)
2. Open the installed PWA
3. Deploy a new version
4. Close and reopen the PWA
5. **Expected**:
   - Auto-refresh triggers on app open
   - Cache is cleared
   - New version loads
   - No data loss

## How to Trigger an Update

To test the auto-refresh feature, you need to create a new version:

1. Edit `sw.js` and increment the `CACHE_NAME` version:
   ```javascript
   const CACHE_NAME = 'ot-app-cache-v10'; // increment number
   ```

2. Deploy the changes (commit and push to GitHub, or serve locally)

3. The service worker will detect the change and trigger auto-refresh

## Console Logging

The implementation includes console logging for debugging:

- `"Atualização disponível ao carregar, iniciando auto-refresh..."` - Update detected on page load
- `"Nova versão instalada, iniciando auto-refresh..."` - Update detected via updatefound event
- `"Cache limpo automaticamente para atualização"` - Cache cleared successfully
- `"Controller mudou, recarregando para versão nova..."` - SW controller changed, triggering reload

## Success Criteria

✅ Auto-refresh detects new SW version and triggers automatically
✅ Cache Storage is cleared during auto-refresh
✅ localStorage data is preserved
✅ Firebase authentication session is preserved
✅ Manual cache clear button continues to work
✅ No errors in console during auto-refresh
✅ Works on Safari iOS
