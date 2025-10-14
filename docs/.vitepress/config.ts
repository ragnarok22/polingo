import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Polingo',
  description: 'Modern i18n library using .po/.mo files for universal JavaScript',
  base: '/polingo/',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/node' },
      { text: 'Examples', link: '/examples/express-and-fastify' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Catalog Management', link: '/guide/catalog-management' },
            { text: 'Runtime Translators', link: '/guide/runtime' },
            { text: 'Development Workflow', link: '/guide/development-workflow' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Node', link: '/api/node' },
            { text: 'Web', link: '/api/web' },
            { text: 'Core', link: '/api/core' },
          ],
        },
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Express & Fastify', link: '/examples/express-and-fastify' },
            { text: 'Browser Integration', link: '/examples/browser' },
          ],
        },
      ],
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/ragnarok22/polingo' }],
  },
});
