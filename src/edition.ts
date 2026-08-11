export const AUTHOR_LINE = '-- Creado con Mini World ID Studio MIT local por ElGamer7876, UID: 320000001';
export const EDITION_LABEL = 'MIT · 100% local';
export const HAS_NETWORK = false;
export async function checkRemote(): Promise<string> { return 'Esta edición no utiliza la red.'; }
export async function openHomepage(): Promise<void> { return Promise.resolve(); }
