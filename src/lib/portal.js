// Utility to manage portal roots
// Utility to manage a shared portal root.
// This is defensive against HMR and multiple module instances that may
// attempt to create duplicate portal roots. It also ensures the portal
// root is re-attached if it was removed from the document body for any
// reason (preventing React from trying to remove a node from a non-parent).
let portalRoot = null;

export function getPortalRoot() {
  if (typeof document === 'undefined') return null;

  // Prefer an existing DOM node if one was already created (HMR-safe).
  const existing = document.getElementById('portal-root');
  if (existing) {
    portalRoot = existing;
  }

  if (!portalRoot) {
    portalRoot = document.createElement('div');
    portalRoot.id = 'portal-root';
    document.body.appendChild(portalRoot);
    if (process.env.NODE_ENV === 'development') console.debug('[portal] created portal-root');
    return portalRoot;
  }

  // If it exists but somehow not attached, attach it.
  if (!portalRoot.parentNode || portalRoot.parentNode !== document.body) {
    // Remove stale references if necessary before re-attaching.
    try {
      if (portalRoot.parentNode) {
        // guard removeChild with try/catch to avoid crashing when the
        // node is unexpectedly not a child of its parent
        portalRoot.parentNode.removeChild(portalRoot);
      }
    } catch (e) {
      // ignore failures here; we'll re-append the element to body.
      // In the unlikely case portalRoot isn't a child of its parent,
      // removeChild would throw; catching keeps the app stable.
      // We still attempt to append below.
    }
    document.body.appendChild(portalRoot);
    if (process.env.NODE_ENV === 'development') console.debug('[portal] reattached portal-root');
  }

  return portalRoot;
}