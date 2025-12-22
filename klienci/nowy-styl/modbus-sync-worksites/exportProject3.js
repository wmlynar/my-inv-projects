const fs = require('fs');
const path = require('path');

// Prefiks plików wyjściowych (będą project_structure_part_1.txt, _2.txt, itd.)
const outputFilePrefix = 'project_structure_part_';

// Limit bajtów na pojedynczy plik wynikowy (dopasuj do swoich potrzeb)
const MAX_FILE_BYTES = 80_000;

// Ignorowane foldery (wystarczy fragment ścieżki albo nazwa katalogu)
const ignoredFolders = [
  'node_modules',
  '.git',
  'dist',
  'target',
  '.settings'
];

// Ignorowane pliki (konkretne nazwy)
const ignoredFiles = [
  'package-lock.json',
  'yarn.lock',
  '.project',
  '.classpath',
  '.factorypath',
  'exportProject3.js',
  'project_structure.txt'
];

// Ignorowane rozszerzenia (pliki binarne)
const ignoredExtensions = [
  '.png', '.jpg', '.jpeg', '.gif', '.ico',
  '.exe', '.dll', '.so', '.class', '.jar',
  '.pdf', '.zip', '.tar', '.gz'
];

const currentFile = path.basename(__filename);

// Prosty „writer” do wielu plików
class MultiFileWriter {
  constructor(prefix, maxBytes) {
    this.prefix = prefix;
    this.maxBytes = maxBytes;
    this.currentIndex = 0;
    this.currentStream = null;
    this.currentSize = 0;
    this.createdFiles = [];
  }

  _openNewFile() {
    this.currentIndex += 1;
    const fileName = `${this.prefix}${this.currentIndex}.txt`;
    this.currentStream = fs.createWriteStream(fileName, { flags: 'w' });
    this.currentSize = 0;
    this.createdFiles.push(fileName);
    console.log(`Otwieram plik wyjściowy: ${fileName}`);
  }

  write(text) {
    const bytes = Buffer.byteLength(text, 'utf8');

    // Jeśli nie ma pliku lub ten się przepełni – otwórz nowy
    if (!this.currentStream || this.currentSize + bytes > this.maxBytes) {
      if (this.currentStream) {
        this.currentStream.end();
      }
      this._openNewFile();
    }

    this.currentStream.write(text);
    this.currentSize += bytes;
  }

  end() {
    if (this.currentStream) {
      this.currentStream.end();
      this.currentStream = null;
    }
  }
}

// Funkcja zapisująca zawartość plików do plików tekstowych (w częściach)
function saveProjectStructure(startPath, relativePath, writer) {
  if (!fs.existsSync(startPath)) {
    console.log("Katalog nie istnieje:", startPath);
    return;
  }

  const files = fs.readdirSync(startPath);

  files.forEach((file) => {
    const filePath = path.join(startPath, file);
    const stat = fs.statSync(filePath);
    const relativeFilePath = path.join(relativePath, file);

    // Pomijamy katalogi z listy
    if (stat.isDirectory()) {
      if (ignoredFolders.some(f => filePath.includes(f))) {
        return;
      }
      saveProjectStructure(filePath, relativeFilePath, writer);
    } else if (stat.isFile()) {
      const ext = path.extname(file).toLowerCase();

      // Pomijamy:
      // - sam skrypt
      // - nazwane pliki z ignoredFiles
      // - pliki binarne (po rozszerzeniu)
      // - wygenerowane pliki wynikowe (po prefiksie)
      if (
        file === currentFile ||
        ignoredFiles.includes(file) ||
        ignoredExtensions.includes(ext) ||
        file.startsWith(outputFilePrefix) // to ignoruje wszystkie project_structure_part_*.txt
      ) {
        return;
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');

      const chunk =
        `\nfile: ${relativeFilePath}\n` +
        '-'.repeat(80) + '\n' +
        fileContent + '\n' +
        '-'.repeat(80) + '\n';

      writer.write(chunk);
    }
  });
}

// Główna logika
(function main() {
  const writer = new MultiFileWriter(outputFilePrefix, MAX_FILE_BYTES);

  // Nagłówek w pierwszej części (writer sam zadba o otwarcie pliku)
  const header =
    'Project Structure and File Contents\n' +
    '='.repeat(80) + '\n\n';

  writer.write(header);

  // Uruchamiamy zapis struktury projektu, zaczynając od bieżącego katalogu
  saveProjectStructure(__dirname, '', writer);

  // Zamykamy ostatni plik
  writer.end();

  console.log('Zakończono zapis do plików:');
  console.log('  ' + writer.createdFiles.join('\n  '));
})();

