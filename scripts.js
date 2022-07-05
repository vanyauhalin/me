import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { createServer } from 'node:http';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { log, script } from '@vanyauhalin/nosock';
import * as csso from 'csso';
import esbuild from 'esbuild';
import html from 'html-minifier';
import { Environment, FileSystemLoader } from 'nunjucks';
import puppeteer from 'puppeteer';

// ---

const server = createServer(async ({ url }, response) => {
  if (!url) return;
  const headers = {};
  const extension = extname(url);
  let file = `dist${url}`;
  try {
    if (extension) {
      if (extension === '.svg') headers['Content-Type'] = 'image/svg+xml';
    } else {
      file += '/index.html';
    }
    const raw = await readFile(file);
    response.writeHead(200, headers).end(raw.toString());
  } catch (error) {
    log.warn(error);
  }
});

async function findFiles(directory, extension) {
  const matched = [];
  async function deep(sub) {
    const dirents = await readdir(sub, { withFileTypes: true });
    await Promise.all(dirents.map(async (dirent) => {
      const file = `${sub}/${dirent.name}`;
      if (dirent.isDirectory()) {
        await deep(file);
        return;
      }
      if (!(dirent.isFile() && dirent.name.endsWith(extension))) return;
      matched.push(file);
    }));
  }
  await deep(directory);
  return matched;
}

function writePage(file, data, options) {
  return writeFile(file, html.minify(data, options || {
    collapseBooleanAttributes: true,
    collapseWhitespace: true,
    removeAttributeQuotes: true,
    removeComments: true,
    removeEmptyAttributes: true,
    removeRedundantAttributes: true,
    sortAttributes: true,
  }));
}

const build = script('build', async () => {
  if (existsSync('dist')) await rm('dist', { force: true, recursive: true });
  await mkdir('dist');
  await mkdir('dist/assets');
  await Promise.all([
    script('build/components', async () => {
      const components = await readdir('src/components');
      await Promise.all(components.map(async (name) => {
        const css = `src/components/${name}/${name}.css`;
        if (existsSync(css)) {
          const styles = await readFile(css);
          await writeFile(
            `dist/assets/${name}.css`,
            csso.minify(styles.toString()).css,
          );
        }
        await esbuild.build({
          allowOverwrite: true,
          entryPoints: [`src/components/${name}/${name}.js`],
          minify: true,
          outfile: `dist/assets/${name}.js`,
        });
      }));
    })(),
    script('build/pages', async () => {
      const updated = (new Intl.DateTimeFormat('en-us', {
        day: 'numeric',
        hour: 'numeric',
        hour12: false,
        minute: 'numeric',
        month: 'long',
        timeZone: 'utc',
        year: 'numeric',
      })).format(Date.now());
      const meta = {
        heading: 'Ivan Uhalin',
        description: 'Person from the world of science and technology',
        site: 'https://vanyauhalin.me',
      };
      const engine = new Environment(new FileSystemLoader('src'));
      const short = new Intl.DateTimeFormat('en-us', {
        month: 'short',
        year: 'numeric',
      });
      engine.addFilter('shortDate', (value) => short.format(new Date(value)));
      await Promise.all([
        script('build/404.njk', async () => {
          const page = engine.render('templates/page.njk', {
            ...meta,
            content: engine.render('pages/404.njk', {
              updated,
              heading: meta.heading,
              site: meta.site,
              url: `${meta.site}/404.html`,
            }),
            title: `${meta.heading} | 404`,
            url: `${meta.site}/404.html`,
          });
          await writePage('dist/404.html', page);
        })(),
        script('build/index.njk', async () => {
          const page = engine.render('templates/page.njk', {
            ...meta,
            content: engine.render('pages/index.njk', {
              updated,
              heading: meta.heading,
              site: meta.site,
              url: `${meta.site}/`,
            }),
            title: meta.heading,
            url: `${meta.site}/`,
          });
          await writePage('dist/index.html', page);
        })(),
        script('build/cv.njk', async () => {
          const data = await readFile('data/cv.json');
          const page = engine.render('templates/page.njk', {
            ...meta,
            content: engine.render('pages/cv.njk', {
              updated,
              data: JSON.parse(data.toString()),
              heading: meta.heading,
              url: `${meta.site}/cv`,
            }),
            description: `Software Engineer. ${meta.description}`,
            title: `${meta.heading} | Software Engineer`,
            url: `${meta.site}/cv`,
          });
          if (!existsSync('dist/cv')) await mkdir('dist/cv');
          await writePage('dist/cv/index.html', page);
          server.listen(3000);
          const browser = await puppeteer.launch();
          const browserPage = await browser.newPage();
          await browserPage.goto('http://localhost:3000/cv');
          const pdf = await browserPage.pdf({
            displayHeaderFooter: false,
            format: 'A4',
            margin: {
              top: '0.4in',
              bottom: '0.4in',
            },
            printBackground: true,
          });
          await browser.close();
          server.close();
          await Promise.all([
            writeFile('dist/cv.pdf', pdf),
            copyFile('data/cv.json', 'dist/cv.json'),
          ]);
        })(),
      ]);
    })(),
    script('build/styles', async () => {
      const files = await readdir('src/styles');
      await Promise.all(files.map(async (file) => {
        const styles = await readFile(`src/styles/${file}`);
        await writeFile(
          `dist/assets/${file}`,
          csso.minify(styles.toString()).css,
        );
      }));
    })(),
    script('build/images', () => Promise.all([
      copyFile('data/vanyauhalin.png', 'dist/vanyauhalin.png'),
      script('build/favicon.svg', async () => {
        const icon = await readFile('src/favicon.svg');
        await writePage('dist/favicon.svg', icon.toString(), {
          collapseWhitespace: true,
          sortAttributes: true,
        });
      })(),
    ]))(),
    script('copy/files', () => Promise.all([
      copyFile('src/manifest.json', 'dist/manifest.json'),
      copyFile('src/CNAME', 'dist/CNAME'),
    ]))(),
  ]);
  await script('build/hash', async () => {
    const assets = await readdir('dist/assets');
    const hashable = [
      ...assets.map((file) => `dist/assets/${file}`),
      'dist/favicon.svg',
      'dist/manifest.json',
    ];
    const hashed = await Promise.all(hashable.map(async (file) => {
      const raw = await readFile(file);
      const hash = createHash('md5')
        .update(raw.toString())
        .digest('hex')
        .slice(0, 10);
      const extension = extname(file);
      const resolved = file.replace('dist', '');
      return [
        resolved,
        resolved.replace(extension, `.${hash}${extension}`),
      ];
    }));
    const pages = await findFiles('dist', '.html');
    await Promise.all([...hashable, ...pages].map(async (file) => {
      const raw = await readFile(file);
      let content = raw.toString();
      for (const [non, modified] of hashed) {
        content = content.replace(non, modified);
      }
      await writeFile(file, content);
    }));
    await Promise.all(hashed.map(([non, modified]) => (
      rename(`dist${non}`, `dist${modified}`)
    )));
  })();
});

script('serve', async () => {
  await build();
  await new Promise(() => {
    server.listen(8080);
  });
});

// ---

const FILENAME = fileURLToPath(import.meta.url);
const DIRNAME = dirname(FILENAME);

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

script('build-env', () => Promise.all([
  script('build-env/act', copyLocal(
    '~/.actrc',
    'act/.actrc',
  ))(),
  script('build-env/brew', () => Promise.all([
    script('build-env/brew/cask', writeCli(
      'brew list --cask',
      'brew/cask',
    ))(),
    script('build-env/brew/formulae', writeCli(
      'brew leaves',
      'brew/formulae',
    ))(),
  ]))(),
  script('build-env/.editorconfig', copyLocal(
    '~/.editorconfig',
    'editorconfig/.editorconfig',
  ))(),
  script('build-env/fnm', writeCli(
    'fnm env',
    'fnm/env',
    (data) => `${data.match(/FNM_DIR.*/)[0]}`,
  ))(),
  script('build-env/git', () => Promise.all([
    script('build-env/git/.gitconfig', copyLocal(
      '~/.gitconfig',
      'git/.gitconfig',
    ))(),
    script('build-env/git/.gitignore', copyLocal(
      '~/.gitignore',
      'git/.gitignore',
    ))(),
  ]))(),
  script('build-env/go', () => Promise.all([
    script('build-env/go/bin', writeCli(
      'ls -1 ~/.go/bin',
      'go/bin',
    ))(),
    script('build-env/go/env', writeCli(
      'go env',
      'go/env',
      (data) => (
        `${data.match(/GO111MODULE.*/)[0]}\n${data.match(/GOPATH.*/)[0]}`
      ),
    ))(),
  ]))(),
  script('build-env/npm', writeCli(
    'npm list --depth 0 --no-unicode -g',
    'npm/list',
    (data) => data.replace(/.*\n/, '').replace(/[+`]-- /g, ''),
  ))(),
  script('build-env/vscode', () => Promise.all([
    script('build-env/vscode/extensions', writeCli(
      'ls ~/.vscode/extensions',
      'vscode/extensions',
    ))(),
    script('build-env/vscode/keybindings', copyLocal(
      '~/Library/Application Support/Code/User/keybindings.json',
      'vscode/keybindings.json',
    ))(),
    script('build-env/vscode/styles', copyLocal(
      '~/.vscode/markdown.styles.css',
      'vscode/markdown.styles.css',
    ))(),
    script('build-env/vscode/settings', copyLocal(
      '~/Library/Application Support/Code/User/settings.json',
      'vscode/settings.json',
    ))(),
  ]))(),
]));

function checkSpawn(callback) {
  const process = callback();
  const error = process.stderr.toString();
  if (error) throw new Error(error);
}

/**
 * @see https://stackoverflow.com/questions/54708191
 * @see https://stackoverflow.com/questions/8371790
 */
script('icons', async () => {
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
    script(`icons/${icon}`, async () => {
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
});

// ---

script.exec();
