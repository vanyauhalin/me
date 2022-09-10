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

const HOMEDIR = homedir();
const FILENAME = fileURLToPath(import.meta.url);
const DIRNAME = dirname(resolve(`${FILENAME}/..`));
const pack = await readFile(`${DIRNAME}/package.json`);
const me = sade('me').version(JSON.parse(pack.toString()).version);

function tilde(path) {
  return path.replace('~', HOMEDIR);
}

function parallel(...actions) {
  return () => Promise.all(actions.map((action) => action()));
}

async function createDirectory(file) {
  const directory = file.replace(new RegExp(`/${basename(file)}$`), '');
  if (!existsSync(directory)) await mkdir(directory, { recursive: true });
  return file;
}

// ---

function createAppDirectory(to) {
  return createDirectory(`${DIRNAME}/env/${to}`);
}

function exportCli(line, to, callback) {
  return async () => {
    const [command, ...arguments_] = line.split(' ');
    const process = spawnSync(command, arguments_.map((argument) => (
      tilde(argument)
    )));
    const error = process.stderr.toString();
    if (error) throw new Error(error);
    let data = process.stdout.toString();
    if (callback) data = callback(data);
    const file = await createAppDirectory(to);
    await writeFile(file, data);
  };
}

function exportFile(from, to) {
  return async () => {
    const file = await createAppDirectory(to);
    await copyFile(tilde(from), file);
  };
}

me.command('export act')
  .alias('e act')
  .action(script('export act', exportFile(
    '~/.actrc',
    'act/.actrc',
  )));

me.command('export brew')
  .alias('e brew')
  .action(script('export brew', parallel(
    script('export brew/cask', exportCli(
      'brew list --cask',
      'brew/cask',
    )),
    script('export brew/formulae', exportCli(
      'brew leaves',
      'brew/formulae',
    )),
  )));

me.command('export editorconfig')
  .alias('e editorconfig')
  .action(script('export editorconfig', exportFile(
    '~/.editorconfig',
    'editorconfig/.editorconfig',
  )));

me.command('export fnm')
  .alias('e fnm')
  .action(script('export fnm', exportCli(
    'fnm env',
    'fnm/env',
    (data) => `${data.match(/FNM_DIR.*/)[0]}`,
  )));

me.command('export git')
  .alias('e git')
  .action(script('export git', parallel(
    script('export git/.gitconfig', exportFile(
      '~/.gitconfig',
      'git/.gitconfig',
    )),
    script('export git/.gitignore', exportFile(
      '~/.gitignore',
      'git/.gitignore',
    )),
  )));

me.command('export go')
  .alias('e go')
  .action(script('export go', parallel(
    script('export go/bin', exportCli(
      'ls -1 ~/.go/bin',
      'go/bin',
    )),
    script('export go/env', exportCli(
      'go env',
      'go/env',
      (data) => (
        `${data.match(/GO111MODULE.*/)[0]}\n${data.match(/GOPATH.*/)[0]}`
      ),
    )),
  )));

me.command('export npm')
  .alias('e npm')
  .action(script('export npm', exportCli(
    'npm list --depth 0 --no-unicode -g',
    'npm/list',
    (data) => data.replace(/.*\n/, '')
      .replace(/[+`]-- (.*)@.*/g, '$1')
      .replace(/\n\n/, '\n'),
  )));

me.command('export ssh')
  .alias('e ssh')
  .action(script('export ssh', exportFile(
    '~/.ssh/config',
    'ssh/config',
  )));

me.command('export vscode')
  .alias('e vscode')
  .action(script('export vscode', parallel(
    script('export vscode/extensions', exportCli(
      'ls ~/.vscode/extensions',
      'vscode/extensions',
      (data) => data.replace(/-[\d.]*$/gm, ''),
    )),
    script('export vscode/keybindings', exportFile(
      '~/Library/Application Support/Code/User/keybindings.json',
      'vscode/keybindings.json',
    )),
    script('export vscode/styles', exportFile(
      '~/.vscode/markdown.styles.css',
      'vscode/markdown.styles.css',
    )),
    script('export vscode/settings', exportFile(
      '~/Library/Application Support/Code/User/settings.json',
      'vscode/settings.json',
    )),
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

function installFile(from, to) {
  return () => copyFile(`${DIRNAME}/env/${from}`, tilde(to));
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
  .action(script('install git', parallel(
    script('install git/.gitconfig', installFile(
      'git/.gitconfig',
      '~/.gitconfig',
    )),
    script('install git/.gitignore', installFile(
      'git/.gitignore',
      '~/.gitignore',
    )),
  )));

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
