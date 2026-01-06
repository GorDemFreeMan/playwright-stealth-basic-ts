import express from 'express';
import { chromium } from 'playwright';

const PORT = process.env.PORT || 3000;
const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Хранилище браузеров
const activeBrowsers = new Map<string, any>();

// ============ ENDPOINTS ============

// Проверка здоровья
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'playwright-stealth-api',
    timestamp: new Date().toISOString(),
    activeBrowsers: activeBrowsers.size
  });
});

// Список инструментов
app.get('/tools', (req, res) => {
  res.json({
    tools: [
      { name: 'launch_browser', description: 'Запустить браузер' },
      { name: 'navigate', description: 'Перейти на сайт' },
      { name: 'get_content', description: 'Получить контент страницы' },
      { name: 'click', description: 'Нажать на элемент' },
      { name: 'screenshot', description: 'Сделать скриншот' },
      { name: 'close', description: 'Закрыть браузер' }
    ]
  });
});

// Запустить браузер
app.post('/browser/launch', async (req, res) => {
  try {
    const { sessionId = 'default' } = req.body;

    if (activeBrowsers.has(sessionId)) {
      return res.status(400).json({ error: 'Session exists' });
    }

    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    activeBrowsers.set(sessionId, {
      browser,
      pages: new Map(),
      createdAt: new Date()
    });

    res.json({
      success: true,
      message: 'Browser launched',
      sessionId
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Перейти на сайт
app.post('/browser/navigate', async (req, res) => {
  try {
    const { sessionId = 'default', url, pageId = 'page1' } = req.body;

    const session = activeBrowsers.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    let page = session.pages.get(pageId);
    if (!page) {
      page = await session.browser.newPage();
      session.pages.set(pageId, page);
    }

    await page.goto(url, { waitUntil: 'networkidle' });

    res.json({
      success: true,
      title: await page.title(),
      url: page.url()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Получить контент
app.post('/browser/get-content', async (req, res) => {
  try {
    const { sessionId = 'default', pageId = 'page1', selector = null } = req.body;

    const session = activeBrowsers.get(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const page = session.pages.get(pageId);
    if (!page) return res.status(404).json({ error: 'Page not found' });

    let content;
    if (selector) {
      content = await page.$eval(selector, (el: any) => el.innerText);
    } else {
      content = await page.content();
    }

    res.json({ success: true, content });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Нажать на элемент
app.post('/browser/click', async (req, res) => {
  try {
    const { sessionId = 'default', pageId = 'page1', selector } = req.body;

    const session = activeBrowsers.get(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const page = session.pages.get(pageId);
    if (!page) return res.status(404).json({ error: 'Page not found' });

    await page.click(selector);
    await page.waitForLoadState('networkidle').catch(() => {});

    res.json({ success: true, message: 'Clicked' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Скриншот
app.post('/browser/screenshot', async (req, res) => {
  try {
    const { sessionId = 'default', pageId = 'page1' } = req.body;

    const session = activeBrowsers.get(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const page = session.pages.get(pageId);
    if (!page) return res.status(404).json({ error: 'Page not found' });

    const screenshot = await page.screenshot({ encoding: 'base64' });

    res.json({ success: true, screenshot });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Закрыть браузер
app.post('/browser/close', async (req, res) => {
  try {
    const { sessionId = 'default' } = req.body;

    const session = activeBrowsers.get(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    for (const page of session.pages.values()) {
      await page.close();
    }
    await session.browser.close();
    activeBrowsers.delete(sessionId);

    res.json({ success: true, message: 'Browser closed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🎭 Playwright Stealth API запущен на port ${PORT}`);
  console.log(`📊 Health: GET http://localhost:${PORT}/health`);
  console.log(`🔧 Tools: GET http://localhost:${PORT}/tools`);
});
