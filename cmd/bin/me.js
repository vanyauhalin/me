/**
 * @typedef {import('@vanyauhalin/nosock/lib/scripter').Scripter} Scripter
 */

import { execSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, resolve } from 'node:path';
import { argv, env } from 'node:process';
import { fileURLToPath } from 'node:url';
import { script } from '@vanyauhalin/nosock';
import sade from 'sade';

const HOME_DIRECTORY = homedir();
const FILE_NAME = fileURLToPath(import.meta.url);
const DIRECTORY_NAME = dirname(resolve(`${FILE_NAME}/../..`));
const pack = await readFile(`${DIRECTORY_NAME}/package.json`);
const me = sade('me').version(JSON.parse(pack.toString()).version);

/**
 * @param {string} path
 * @returns {string}
 */
function tilde(path) {
  return path.replace(/^~\//, `${HOME_DIRECTORY}/`);
}

/**
 * @param {string} label
 * @param {Parameters<Scripter>[1][]} actions
 * @returns
 */
function parallelize(label, ...actions) {
  return script(label, () => Promise.all(actions.map((action) => action())));
}

/**
 * @param {string} file
 * @returns {Promise<string>}
 */
async function createDirectory(file) {
  const directory = file.replace(new RegExp(`/${basename(file)}$`), '');
  if (!existsSync(directory)) await mkdir(directory, { recursive: true });
  return file;
}

// ---

/**
 * @param {string} application
 * @returns {Promise<string>}
 */
function createExportDirectory(application) {
  return createDirectory(`${DIRECTORY_NAME}/cmd/env/${application}`);
}

/**
 * @param {string} command
 * @returns {string}
 */
function readFrom(command) {
  const [bin, ...arguments_] = command.split(' ');
  const process = spawnSync(bin, arguments_.map((argument) => tilde(argument)));
  const error = process.stderr.toString();
  if (error) throw new Error(error);
  return process.stdout.toString();
}

/**
 * @param {string} command
 * @param {string} to
 * @param {((data: string) => string)=} callback
 * @returns {ReturnType<Scripter>}
 */
function exportizeFrom(command, to, callback) {
  return script(`export ${to}`, async () => {
    let data = readFrom(command);
    if (callback) data = callback(data);
    const file = await createExportDirectory(to);
    await writeFile(file, data);
  });
}

/**
 * @param {string} from
 * @param {string} to
 * @returns {ReturnType<Scripter>}
 */
function exportize(from, to) {
  return script(`export ${to}`, async () => {
    const file = await createExportDirectory(to);
    await copyFile(tilde(from), file);
  });
}

me.command('export act')
  .alias('e act')
  .action(exportize(
    '~/.actrc',
    'act/.actrc',
  ));

me.command('export brew')
  .alias('e brew')
  .action(parallelize(
    'export brew',
    exportizeFrom(
      'brew list --cask',
      'brew/cask',
    ),
    exportizeFrom(
      'brew leaves',
      'brew/formulae',
    ),
  ));

me.command('export editorconfig')
  .alias('e editorconfig')
  .action(exportize(
    '~/.editorconfig',
    'editorconfig/.editorconfig',
  ));

me.command('export fnm')
  .alias('e fnm')
  .action(exportizeFrom(
    'fnm env',
    'fnm/env',
    (data) => `${data.match(/FNM_DIR.*/)[0]}`,
  ));

me.command('export git')
  .alias('e git')
  .action(parallelize(
    'export git',
    exportize(
      '~/.gitconfig',
      'git/.gitconfig',
    ),
    exportize(
      '~/.gitignore',
      'git/.gitignore',
    ),
  ));

me.command('export go')
  .alias('e go')
  .action(parallelize(
    'export go',
    exportizeFrom(
      'ls -1 ~/.go/bin',
      'go/bin',
    ),
    exportizeFrom(
      'go env',
      'go/env',
      (data) => (
        `${data.match(/GO111MODULE.*/)[0]}\n${data.match(/GOPATH.*/)[0]}`
      ),
    ),
  ));

me.command('export npm')
  .alias('e npm')
  .action(exportizeFrom(
    'npm list --depth 0 --no-unicode -g',
    'npm/list',
    (data) => data.replace(/.*\n/, '')
      .replace(/[+`]-- (.*)@.*/g, '$1')
      .replace(/\n\n/, '\n'),
  ));

me.command('export ssh')
  .alias('e ssh')
  .action(exportize(
    '~/.ssh/config',
    'ssh/config',
  ));

me.command('export vscode')
  .alias('e vscode')
  .action(parallelize(
    'export vscode',
    exportizeFrom(
      'ls ~/.vscode/extensions',
      'vscode/extensions',
      (data) => data.replace(/-[\d.]*$/gm, ''),
    ),
    exportize(
      '~/Library/Application Support/Code/User/keybindings.json',
      'vscode/keybindings.json',
    ),
    exportize(
      '~/.vscode/markdown.styles.css',
      'vscode/markdown.styles.css',
    ),
    exportize(
      '~/Library/Application Support/Code/User/settings.json',
      'vscode/settings.json',
    ),
  ));

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

function installFile(from, to) {
  return () => copyFile(`${DIRECTORY_NAME}/env/${from}`, tilde(to));
}

function createLocalDirectory(to) {
  return createDirectory(`${env.PWD}/${to}`);
}

function localFile(from, to) {
  return async () => {
    const file = await createLocalDirectory(to);
    await copyFile(tilde(from), file);
  };
}

function localLink(from, to) {
  return async () => {
    const file = await createLocalDirectory(to);
    await symlink(tilde(from), file);
  };
}

me.command('install editorconfig')
  .alias('i editorconfig')
  .option('-l, --local', 'Install locally')
  .action(({ local }) => (local
    ? script('install locally editorconfig', localFile(
      '~/.editorconfig',
      '.editorconfig',
    ))
    : script('install editorconfig', installFile(
      'editorconfig/.editorconfig',
      '~/.editorconfig',
    ))
  )());

me.command('install git')
  .alias('i git')
  .action(parallelize(
    'install git',
    script('install git/.gitconfig', installFile(
      'git/.gitconfig',
      '~/.gitconfig',
    )),
    script('install git/.gitignore', installFile(
      'git/.gitignore',
      '~/.gitignore',
    )),
  ));

function checkSpawn(callback) {
  const process = callback();
  const error = process.error ? process.error : process.stderr.toString();
  if (error) throw new Error(error);
}

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
    const sources = `${DIRECTORY_NAME}/resources/icons`;
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

const EMAIL = 'vanyauhalin@gmail.com';
const DEVICE = 'macbook-q6l4';

function keygen(file) {
  execSync(`
    ssh-keygen \
      -C ${EMAIL} \
      -N "" \
      -f ${file} \
      -t ed25519 \
      -q \
      <<< y \
      > /dev/null \
      2>&1
  `);
}

me.command('install ssh [domain]')
  .alias('i ssh')
  .option('-f, --force', 'Do not check if domain exists', false)
  .action(script('install ssh', async (domain, options) => {
    if (domain) {
      await script(`install ssh/${domain}`, () => {
        const file = tilde(`~/.ssh/${domain}`);
        if (!options.force && existsSync(file)) {
          throw new Error('Domain already exists');
        }
        switch (domain) {
          case 'github.com':
            keygen(file);
            spawnSync('gh', ['ssh-key', 'add', file, '-t', DEVICE]);
            break;
          case 'gitlab.com':
            keygen(file);
            spawnSync('glab', ['ssh-key', 'add', file, '-t', DEVICE]);
            break;
          default:
            keygen(file);
        }
      })();
      return;
    }
    await installFile('ssh/config', '~/.ssh/config')();
  }));

me.command('install vscode')
  .alias('i vscode')
  .option('-l, --local', 'Install locally')
  .action(({ local }) => {
    if (local) {
      script('local vscode', localLink(
        '~/.vscode/markdown.styles.css',
        '.vscode/markdown.styles.css',
      ))();
    }
  });

// ---

me.parse(argv);
