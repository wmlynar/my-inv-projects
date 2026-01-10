const path = require('path');
const net = require('net');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const SERVER_DIR = path.resolve(__dirname, '..');
const START_TIMEOUT_MS = 8000;
const ACTION_TIMEOUT_MS = 6000;

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const getFreePort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });

const startServer = (port) =>
  new Promise((resolve, reject) => {
    const child = spawn('node', ['server.js'], {
      cwd: SERVER_DIR,
      env: {
        ...process.env,
        HOST: '127.0.0.1',
        PORT: String(port)
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('server_start_timeout'));
    }, START_TIMEOUT_MS);

    const handleStdout = (chunk) => {
      const text = chunk.toString();
      if (text.includes('fleet-ui-mock listening')) {
        clearTimeout(timeout);
        child.stdout.off('data', handleStdout);
        resolve(child);
      }
    };

    child.stdout.on('data', handleStdout);
    child.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
    });
    child.on('exit', (code) => {
      if (code && code !== 0) {
        reject(new Error(`server_exit_${code}`));
      }
    });
  });

const stopServer = (child) =>
  new Promise((resolve) => {
    if (!child || child.killed) return resolve();
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      resolve();
    }, 2000);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
    child.kill('SIGTERM');
  });

const parseViewBox = (viewBox) => {
  if (!viewBox) return null;
  const parts = viewBox.split(/\s+/).map((value) => Number(value));
  if (parts.some((value) => Number.isNaN(value))) return null;
  return parts;
};

const viewBoxChanged = (prev, next, epsilon = 1e-3) => {
  if (!prev || !next || prev.length !== next.length) return true;
  return prev.some((value, index) => Math.abs(value - next[index]) > epsilon);
};

const runTest = async (name, fn) => {
  const start = Date.now();
  try {
    await fn();
    console.log(`ok - ${name} (${Date.now() - start}ms)`);
  } catch (error) {
    console.error(`fail - ${name}`);
    throw error;
  }
};

const login = async (page) => {
  await page.fill('#login-user', 'admin');
  await page.fill('#login-pass', '123456');
  await Promise.all([
    page.waitForFunction(() => {
      const app = document.getElementById('app-view');
      return app && !app.classList.contains('hidden');
    }),
    page.click('#login-form button[type="submit"]')
  ]);
};

const waitForLayerHidden = async (page, selector, hidden) => {
  await page.waitForFunction(
    ({ selector, hidden }) => {
      const el = document.querySelector(selector);
      if (!el) return false;
      const hasHidden = el.classList.contains('map-layer-hidden');
      return hidden ? hasHidden : !hasHidden;
    },
    { timeout: ACTION_TIMEOUT_MS },
    { selector, hidden }
  );
};

const main = async () => {
  const port = await getFreePort();
  const server = await startServer(port);
  const baseUrl = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await login(page);
    await page.waitForSelector('#map-svg .map-edge', { timeout: ACTION_TIMEOUT_MS });

    await runTest('renders core map layers', async () => {
      const edgeCount = await page.locator('#map-svg .map-edge').count();
      const worksiteCount = await page.locator('#map-svg .worksite-marker').count();
      const robotCount = await page.locator('#map-svg .robot-marker').count();
      assert(edgeCount > 0, 'expected map edges to render');
      assert(worksiteCount > 0, 'expected worksite markers to render');
      assert(robotCount > 0, 'expected robot markers to render');
    });

    await runTest('layer toggles hide and show map groups', async () => {
      await page.waitForSelector('#map-layer-panel [data-layer="robots"]');
      await waitForLayerHidden(page, '#map-svg .map-robots', false);
      await page.click('#map-layer-panel [data-layer="robots"]');
      await waitForLayerHidden(page, '#map-svg .map-robots', true);
      await page.click('#map-layer-panel [data-layer="robots"]');
      await waitForLayerHidden(page, '#map-svg .map-robots', false);

      await waitForLayerHidden(page, '#map-svg .map-obstacles', false);
      await page.click('#map-layer-panel [data-layer="obstacles"]');
      await waitForLayerHidden(page, '#map-svg .map-obstacles', true);
      await page.click('#map-layer-panel [data-layer="obstacles"]');
      await waitForLayerHidden(page, '#map-svg .map-obstacles', false);
    });

    await runTest('pan and zoom update viewBox', async () => {
      const mapBox = await page.locator('#map-svg').boundingBox();
      assert(mapBox, 'map svg bounding box missing');
      await page.click('#reset-view-btn');
      const initialViewBox = parseViewBox(await page.getAttribute('#map-svg', 'viewBox'));
      assert(initialViewBox, 'initial viewBox missing');

      await page.mouse.move(mapBox.x + mapBox.width / 2, mapBox.y + mapBox.height / 2);
      await page.mouse.wheel(0, -300);
      await page.waitForFunction(
        (initial) => {
          const viewBox = document.querySelector('#map-svg')?.getAttribute('viewBox');
          return viewBox && viewBox !== initial;
        },
        { timeout: ACTION_TIMEOUT_MS },
        initialViewBox.join(' ')
      );
      const zoomedViewBox = parseViewBox(await page.getAttribute('#map-svg', 'viewBox'));
      assert(viewBoxChanged(initialViewBox, zoomedViewBox), 'viewBox should change after zoom');

      await page.mouse.move(mapBox.x + mapBox.width / 2, mapBox.y + mapBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(mapBox.x + mapBox.width / 2 + 80, mapBox.y + mapBox.height / 2 + 40);
      await page.mouse.up();
      const pannedViewBox = parseViewBox(await page.getAttribute('#map-svg', 'viewBox'));
      assert(viewBoxChanged(zoomedViewBox, pannedViewBox), 'viewBox should change after pan');
    });

    await runTest('fit and reset controls restore viewBox', async () => {
      await page.click('#reset-view-btn');
      const initialViewBox = parseViewBox(await page.getAttribute('#map-svg', 'viewBox'));
      assert(initialViewBox, 'initial viewBox missing');

      const mapBox = await page.locator('#map-svg').boundingBox();
      assert(mapBox, 'map svg bounding box missing');
      await page.mouse.move(mapBox.x + mapBox.width / 2, mapBox.y + mapBox.height / 2);
      await page.mouse.wheel(0, -200);
      const beforeFit = parseViewBox(await page.getAttribute('#map-svg', 'viewBox'));
      await page.click('#fit-view-btn');
      const afterFit = parseViewBox(await page.getAttribute('#map-svg', 'viewBox'));
      assert(viewBoxChanged(beforeFit, afterFit), 'fit view should update viewBox');

      await page.click('#reset-view-btn');
      await page.waitForFunction(
        (initial) => {
          const viewBox = document.querySelector('#map-svg')?.getAttribute('viewBox');
          return viewBox === initial;
        },
        { timeout: ACTION_TIMEOUT_MS },
        initialViewBox.join(' ')
      );
    });

    await runTest('worksite menu opens and closes', async () => {
      await page.click('#map-svg .worksite-marker');
      await page.waitForFunction(() => {
        const menu = document.getElementById('worksite-menu');
        return menu && !menu.classList.contains('hidden');
      });
      await page.click('.map-wrap', { position: { x: 12, y: 12 } });
      await page.waitForFunction(() => {
        const menu = document.getElementById('worksite-menu');
        return menu && menu.classList.contains('hidden');
      });
    });

    await runTest('mini map viewport is present', async () => {
      const miniCount = await page.locator('#mini-map-svg .mini-map-viewport').count();
      assert(miniCount === 1, 'mini map viewport not rendered');
    });
  } finally {
    await browser.close();
    await stopServer(server);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
