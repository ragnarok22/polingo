import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Polingo',
  description: 'Modern i18n library using .po/.mo files for universal JavaScript',
  base: '/polingo/',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Step-by-Step', link: '/guide/step-by-step-guide' },
      { text: 'API', link: '/api/reference' },
      { text: 'Examples', link: '/examples/interactive' },
      { text: 'FAQ', link: '/guide/faq' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Step-by-Step Project', link: '/guide/step-by-step-guide' },
            { text: 'Catalog Management', link: '/guide/catalog-management' },
            { text: 'Runtime Translators', link: '/guide/runtime' },
            { text: 'Development Workflow', link: '/guide/development-workflow' },
            { text: 'Polingo vs i18next & react-intl', link: '/guide/comparison' },
            { text: 'FAQ', link: '/guide/faq' },
            { text: 'Troubleshooting', link: '/guide/troubleshooting' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Full Reference', link: '/api/reference' },
            { text: 'Core', link: '/api/core' },
            { text: 'Node', link: '/api/node' },
            { text: 'Web', link: '/api/web' },
            { text: 'React', link: '/api/react' },
            { text: 'Vue', link: '/api/vue' },
            { text: 'CLI', link: '/api/cli' },
          ],
        },
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Interactive Playground', link: '/examples/interactive' },
            { text: 'Express & Fastify', link: '/examples/express-and-fastify' },
            { text: 'Browser Integration', link: '/examples/browser' },
          ],
        },
      ],
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/ragnarok22/polingo' }],
  },
});
