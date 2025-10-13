// Utility to manage portal roots
let portalRoot = null;

export function getPortalRoot() {
  if (!portalRoot && typeof document !== 'undefined') {
    portalRoot = document.createElement('div');
    portalRoot.id = 'portal-root';
    document.body.appendChild(portalRoot);
  }
  return portalRoot;
}