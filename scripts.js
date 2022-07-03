import { existsSync } from 'node:fs';
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname } from 'node:path';
import { log, script } from '@vanyauhalin/nosock';
import * as csso from 'csso';
import esbuild from 'esbuild';
import html from 'html-minifier';
import { Environment, FileSystemLoader } from 'nunjucks';
import puppeteer from 'puppeteer';

const server = createServer(({ url }, response) => {
  if (!url) return;
  /* eslint-disable promise/prefer-await-to-then */
  readFile(`dist${extname(url) ? url : `${url}/index.html`}`)
    .then((data) => (
      response
        .writeHead(200, {
          ...extname(url) === '.svg'
            ? { 'Content-Type': 'image/svg+xml' }
            : {},
        })
        .end(data.toString())
    ))
    .catch(log.warn);
  /* eslint-enable promise/prefer-await-to-then */
});

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
  if (!existsSync('dist')) await mkdir('dist');
  if (!existsSync('dist/assets')) await mkdir('dist/assets');
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

      await script('build/index.njk', async () => {
        const page = engine.render('template.njk', {
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
      })();
      await script('build/cv.njk', async () => {
        const data = await readFile('data/cv.json');
        const page = engine.render('template.njk', {
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
        await writeFile('dist/cv.pdf', pdf);
        await copyFile('data/cv.json', 'dist/cv.json');
      })();
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
    script('copy/manifest.json', () => (
      copyFile('src/manifest.json', 'dist/manifest.json')
    ))(),
    script('build/favicon.svg', async () => {
      const icon = await readFile('src/favicon.svg');
      await writePage('dist/favicon.svg', icon.toString(), {
        collapseWhitespace: true,
        sortAttributes: true,
      });
    })(),
  ]);
});

script('serve', async () => {
  await build();
  await new Promise(() => {
    server.listen(8080);
  });
});

script.exec();
