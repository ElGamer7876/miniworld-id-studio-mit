export type TextureAsset = { id: string; name: string; category: string; relativePath: string; size: number; load: () => Promise<Blob> };
export type TexturePack = { assets: TextureAsset[]; skipped: number; sourceName: string };
const MAX_IMAGE = 8 * 1024 * 1024;
const CATEGORY_LABELS: Record<string, string> = { Avatares: 'Avatares', Blocos: 'Bloques', Particulas: 'Partículas', UI: 'Interfaz', Itens: 'Objetos', Sprays: 'Sprays', Criaturas: 'Criaturas', Quadros: 'Cuadros', Montarias: 'Monturas', Modelos: 'Modelos', Idiomas: 'Idiomas', Skins: 'Apariencias', Outros: 'Otros' };

function details(path: string, size: number): Omit<TextureAsset, 'load'> | null {
  const relativePath = path.replace(/\\/g, '/');
  if (!/\.png$/i.test(relativePath) || size <= 0 || size > MAX_IMAGE || relativePath.startsWith('/') || relativePath.split('/').some(part => part === '..')) return null;
  const parts = relativePath.split('/');
  const name = parts.at(-1) || '';
  const id = name.replace(/\.png$/i, '');
  if (!/^[\w.-]{1,96}$/.test(id)) return null;
  const categoryKey = parts.length >= 2 ? parts.at(-2) || 'Otros' : 'Otros';
  return { id, name, category: CATEGORY_LABELS[categoryKey] || categoryKey, relativePath, size };
}
function sort(assets: TextureAsset[]): void { assets.sort((a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id, undefined, { numeric: true })); }
export function scanTextureFiles(files: FileList | File[], limit = 15000): TexturePack {
  const assets: TextureAsset[] = []; let skipped = 0, sourceName = 'Paquete local';
  for (const file of Array.from(files)) {
    const item = details(String((file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name), file.size);
    if (!item || assets.length >= limit) { skipped++; continue; }
    assets.push({ ...item, load: async () => file });
    if (sourceName === 'Paquete local') sourceName = item.relativePath.split('/')[0] || sourceName;
  }
  sort(assets); return { assets, skipped, sourceName };
}
export function chooseTextureFolder(): Promise<TexturePack | null> {
  return new Promise(resolve => {
    const input = document.createElement('input'); input.type = 'file'; input.multiple = true; input.accept = 'image/png,.png';
    input.setAttribute('webkitdirectory', ''); input.setAttribute('directory', '');
    input.onchange = () => resolve(input.files?.length ? scanTextureFiles(input.files) : null);
    input.oncancel = () => resolve(null); input.click();
  });
}

// Only the ZIP index is read up front. PNGs are decompressed individually when visible.
export async function scanTextureZip(file: File): Promise<TexturePack> {
  if (!/\.zip$/i.test(file.name)) throw new Error('Selecciona un archivo ZIP.');
  const offset = Math.max(0, file.size - 65557);
  const tail = new DataView(await file.slice(offset).arrayBuffer());
  let end = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) if (tail.getUint32(i, true) === 0x06054b50 && i + 22 + tail.getUint16(i + 20, true) === tail.byteLength) { end = i; break; }
  if (end < 0) throw new Error('El ZIP no tiene un directorio central válido.');
  const count = tail.getUint16(end + 10, true), directorySize = tail.getUint32(end + 12, true), directoryOffset = tail.getUint32(end + 16, true);
  if (count > 20000 || count === 0xffff || directorySize > 16 * 1024 * 1024 || directoryOffset === 0xffffffff || directoryOffset + directorySize > file.size) throw new Error('ZIP64 o índice demasiado grande no compatible.');
  const directory = new DataView(await file.slice(directoryOffset, directoryOffset + directorySize).arrayBuffer());
  const decoder = new TextDecoder('utf-8'), assets: TextureAsset[] = []; let skipped = 0, position = 0;
  for (let entry = 0; entry < count; entry++) {
    if (position + 46 > directory.byteLength || directory.getUint32(position, true) !== 0x02014b50) throw new Error('El índice ZIP está dañado.');
    const flags = directory.getUint16(position + 8, true), method = directory.getUint16(position + 10, true);
    const compressed = directory.getUint32(position + 20, true), size = directory.getUint32(position + 24, true);
    const nameSize = directory.getUint16(position + 28, true), extraSize = directory.getUint16(position + 30, true), commentSize = directory.getUint16(position + 32, true);
    const localOffset = directory.getUint32(position + 42, true), next = position + 46 + nameSize + extraSize + commentSize;
    if (next > directory.byteLength) throw new Error('El índice ZIP está truncado.');
    const path = decoder.decode(new Uint8Array(directory.buffer, directory.byteOffset + position + 46, nameSize));
    const item = details(path, size);
    if (!item || flags & 1 || ![0, 8].includes(method) || compressed > MAX_IMAGE || localOffset === 0xffffffff) skipped++;
    else assets.push({ ...item, load: async () => {
      const header = new DataView(await file.slice(localOffset, localOffset + 30).arrayBuffer());
      if (header.byteLength !== 30 || header.getUint32(0, true) !== 0x04034b50 || header.getUint16(8, true) !== method) throw new Error('Cabecera ZIP inválida.');
      const start = localOffset + 30 + header.getUint16(26, true) + header.getUint16(28, true);
      if (start + compressed > file.size) throw new Error('Imagen ZIP fuera de rango.');
      const data = file.slice(start, start + compressed);
      const blob = method === 0 ? data : await new Response(data.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob();
      if (blob.size !== size || blob.size > MAX_IMAGE) throw new Error('Imagen ZIP inválida.');
      const signature = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
      if (signature.length !== 8 || signature.some((byte, i) => byte !== [137, 80, 78, 71, 13, 10, 26, 10][i])) throw new Error('El recurso no es PNG.');
      return new Blob([blob], { type: 'image/png' });
    } });
    position = next;
  }
  sort(assets); return { assets, skipped, sourceName: file.name };
}
export function chooseTextureZip(): Promise<TexturePack | null> {
  return new Promise(resolve => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.zip,application/zip';
    input.onchange = async () => { const file = input.files?.[0]; if (!file) { resolve(null); return; }
      try { resolve(await scanTextureZip(file)); } catch (error) { alert(error instanceof Error ? error.message : 'No se pudo abrir el ZIP.'); resolve(null); }
    };
    input.oncancel = () => resolve(null); input.click();
  });
}
export function filterTextureAssets(pack: TexturePack, query: string, category = 'Todas', limit = 80): TextureAsset[] {
  const needle = query.trim().toLocaleLowerCase();
  return pack.assets.filter(asset => (category === 'Todas' || asset.category === category) && (!needle || asset.id.toLocaleLowerCase().includes(needle) || asset.name.toLocaleLowerCase().includes(needle) || asset.category.toLocaleLowerCase().includes(needle))).slice(0, limit);
}
