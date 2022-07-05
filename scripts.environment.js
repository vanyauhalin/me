import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { script } from '@vanyauhalin/nosock';

const FILENAME = fileURLToPath(import.meta.url);
const DIRNAME = dirname(FILENAME);

async function createDirectory(to) {
  const file = `${DIRNAME}/env/${to}`;
  const directory = file.replace(`/${basename(file)}`, '');
  if (!existsSync(directory)) await mkdir(directory, { recursive: true });
  return file;
}

function writeCli(line, to) {
  return async () => {
    const [command, ...arguments_] = line.split(' ');
    const process = spawnSync(command, arguments_);
    const error = process.stderr.toString();
    if (error) throw new Error(error);
    const file = await createDirectory(to);
    await writeFile(file, process.stdout.toString());
  };
}

script('build-brew', () => Promise.all([
  script('build-brew/cask', writeCli('brew list --cask', 'brew/cask'))(),
  script('build-brew/formulae', writeCli('brew leaves', 'brew/formulae'))(),
]));

script.exec();
