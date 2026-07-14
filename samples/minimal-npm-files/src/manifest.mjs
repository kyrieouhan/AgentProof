export function manifest(files) {
  return files.map(file => file.trim()).filter(Boolean).sort();
}
