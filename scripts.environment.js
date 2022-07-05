import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { script } from '@vanyauhalin/nosock';

const FILENAME = fileURLToPath(import.meta.url);
const DIRNAME = dirname(FILENAME);

async function createDirectory(to) {
  const file = `${DIRNAME}/env/${to}`;
  const directory = file.replace(new RegExp(`/${basename(file)}$`), '');
  if (!existsSync(directory)) await mkdir(directory, { recursive: true });
  return file;
}

/* eslint-disable promise/prefer-await-to-callbacks */
function writeCli(line, to, callback) {
  return async () => {
    const [command, ...arguments_] = line.split(' ');
    const process = spawnSync(command, arguments_.map((argument) => (
      argument.replace('~', homedir())
    )));
    const error = process.stderr.toString();
    if (error) throw new Error(error);
    let data = process.stdout.toString();
    if (callback) data = callback(data);
    const file = await createDirectory(to);
    await writeFile(file, data);
  };
}
/* eslint-enable promise/prefer-await-to-callbacks */

function copyLocal(from, to) {
  return async () => {
    const file = await createDirectory(to);
    await copyFile(from.replace('~', homedir()), file);
  };
}

script('build-act', copyLocal('~/.actrc', 'act/.actrc'));

script('build-brew', () => Promise.all([
  script('build-brew/cask', writeCli('brew list --cask', 'brew/cask'))(),
  script('build-brew/formulae', writeCli('brew leaves', 'brew/formulae'))(),
]));

script('build-editorconfig', copyLocal(
  '~/.editorconfig',
  'editorconfig/.editorconfig',
));

script('build-fnm', writeCli('fnm env', 'fnm/env', (data) => (
  `${data.match(/FNM_DIR.*/)[0]}`
)));

script('build-git', () => Promise.all([
  script('git-gitconfig', copyLocal('~/.gitconfig', 'git/.gitconfig'))(),
  script('git-gitignore', copyLocal('~/.gitignore', 'git/.gitignore'))(),
]));

script('build-go', () => Promise.all([
  script('build-go/bin', writeCli('ls -1 ~/.go/bin', 'go/bin'))(),
  script('build-go/env', writeCli('go env', 'go/env', (data) => (
    `${data.match(/GO111MODULE.*/)[0]}\n${data.match(/GOPATH.*/)[0]}`
  )))(),
]));

script('build-npm', writeCli(
  'npm list --depth 0 --no-unicode -g',
  'npm/list',
  (data) => data.replace(/.*\n/, '').replace(/[+`]-- /g, ''),
));

script.exec();
