import { execSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, resolve } from 'node:path';
import { argv, env } from 'node:process';
import { fileURLToPath } from 'node:url';
import { script } from '@vanyauhalin/nosock';
import sade from 'sade';

const FILENAME = fileURLToPath(import.meta.url);
const DIRNAME = dirname(resolve(`${FILENAME}/..`));

function parallel(...actions) {
  return () => Promise.all(actions.map((action) => action()));
}

async function createDirectory(to) {
  const file = `${DIRNAME}/env/${to}`;
  const directory = file.replace(new RegExp(`/${basename(file)}$`), '');
  if (!existsSync(directory)) await mkdir(directory, { recursive: true });
  return file;
}

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

function copyLocal(from, to) {
  return async () => {
    const file = await createDirectory(to);
    await copyFile(from.replace('~', homedir()), file);
  };
}

function copyToLocal(from, to) {
  return () => copyFile(`${DIRNAME}/env/${from}`, to.replace('~', homedir()));
}

function checkSpawn(callback) {
  const process = callback();
  const error = process.error ? process.error : process.stderr.toString();
  if (error) throw new Error(error);
}

const pack = await readFile('package.json');
const me = sade('me').version(JSON.parse(pack.toString()).version);

// ---

me.command('export act')
  .alias('e act')
  .action(script('export act', copyLocal(
    '~/.actrc',
    'act/.actrc',
  )));

me.command('export brew')
  .alias('e brew')
  .action(script('export brew', parallel(
    script('export brew/cask', writeCli(
      'brew list --cask',
      'brew/cask',
    )),
    script('export brew/formulae', writeCli(
      'brew leaves',
      'brew/formulae',
    )),
  )));

me.command('export editorconfig')
  .alias('e editorconfig')
  .action(script('export editorconfig', copyLocal(
    '~/.editorconfig',
    'editorconfig/.editorconfig',
  )));

me.command('export fnm')
  .alias('e fnm')
  .action(script('export fnm', writeCli(
    'fnm env',
    'fnm/env',
    (data) => `${data.match(/FNM_DIR.*/)[0]}`,
  )));

me.command('export git')
  .alias('e git')
  .action(script('export git', parallel(
    script('export git/.gitconfig', copyLocal(
      '~/.gitconfig',
      'git/.gitconfig',
    )),
    script('export git/.gitignore', copyLocal(
      '~/.gitignore',
      'git/.gitignore',
    )),
  )));

me.command('export go')
  .alias('e go')
  .action(script('export go', parallel(
    script('export go/bin', writeCli(
      'ls -1 ~/.go/bin',
      'go/bin',
    )),
    script('export go/env', writeCli(
      'go env',
      'go/env',
      (data) => (
        `${data.match(/GO111MODULE.*/)[0]}\n${data.match(/GOPATH.*/)[0]}`
      ),
    )),
  )));

me.command('export npm')
  .alias('e npm')
  .action(script('export npm', writeCli(
    'npm list --depth 0 --no-unicode -g',
    'npm/list',
    (data) => data.replace(/.*\n/, '').replace(/[+`]-- /g, ''),
  )));

me.command('export vscode')
  .alias('e vscode')
  .action(script('export vscode', parallel(
    script('export vscode/extensions', writeCli(
      'ls ~/.vscode/extensions',
      'vscode/extensions',
    )),
    script('export vscode/keybindings', copyLocal(
      '~/Library/Application Support/Code/User/keybindings.json',
      'vscode/keybindings.json',
    )),
    script('export vscode/styles', copyLocal(
      '~/.vscode/markdown.styles.css',
      'vscode/markdown.styles.css',
    )),
    script('export vscode/settings', copyLocal(
      '~/Library/Application Support/Code/User/settings.json',
      'vscode/settings.json',
    )),
  )));

me.command('export zsh')
  .alias('e zsh')
  .action(script('export zsh', copyLocal(
    '~/.zshrc',
    'zsh/.zshrc',
  )));

me.command('export all')
  .alias('e all')
  .action(async () => {
    const branches = Object.values(me.tree).filter((branch) => (
      typeof branch === 'object'
      && !Array.isArray(branch)
      && branch !== null
      && branch.usage.includes('export')
      && branch.usage !== 'export all'
    ));
    await Promise.all(branches.map(({ handler }) => handler()));
  });

// ---

me.command('install editorconfig')
  .alias('i editorconfig')
  .action(script('install editorconfig', copyToLocal(
    'editorconfig/.editorconfig',
    '~/.editorconfig',
  )));

me.command('install git')
  .alias('i git')
  .action(script('install git', parallel(
    script('install git/.gitconfig', copyToLocal(
      'git/.gitconfig',
      '~/.gitconfig',
    )),
    script('install git/.gitignore', copyToLocal(
      'git/.gitignore',
      '~/.gitignore',
    )),
  )));

/**
 * @see https://stackoverflow.com/questions/54708191
 * @see https://stackoverflow.com/questions/8371790
 */
me.command('install icons')
  .alias('i icons')
  .action(script('install icons', async () => {
    if (!env.SUDO_UID) throw new Error('Requires sudo');
    async function findApp(name, directory = '/Applications') {
      const app = `${name}.app`;
      const apps = await readdir(directory);
      if (apps.includes(app)) return `${directory}/${app}`;
      if (apps.includes(name)) return findApp(name, `${directory}/${name}`);
      throw new Error(`${name} not found`);
    }
    const sources = `${DIRNAME}/resources/icons`;
    const icons = await readdir(sources);
    const temporary = `${tmpdir()}/icons`;
    if (!existsSync(temporary)) await mkdir(temporary);
    await Promise.all(icons.map((icon) => (
      script(`install icons/${icon}`, async () => {
        await copyFile(`${sources}/${icon}`, `${temporary}/${icon}`);
        const resource = `${temporary}/${icon.replace('.icns', '.rsrc')}`;
        await writeFile(resource, `read 'icns' (-16455) "${icon}";`);
        const app = await findApp(icon.replace('.icns', ''));
        const record = `${app}/Icon\r`;
        checkSpawn(() => spawnSync('Rez', ['-a', resource, '-o', record]));
        checkSpawn(() => spawnSync('SetFile', ['-a', 'C', app]));
        checkSpawn(() => spawnSync('SetFile', ['-a', 'V', record]));
        checkSpawn(() => spawnSync('touch', [app]));
      })()
    )));
  }));

me.command('install zsh')
  .alias('i zsh')
  .action(script('install zsh', async () => {
    await copyToLocal('zsh/.zshrc', '~/.zshrc')();
    try {
      execSync(`source ${homedir}/.zshrc`);
    } catch {
      // This is fine.
    }
  }));

// ---

me.parse(argv);
