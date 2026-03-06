export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // Enable Nuxt 4 compatibility
  future: {
    compatibilityVersion: 4,
  },

  app: {
    head: {
      title: 'SubX - 自动化视频字幕提取与翻译工具',
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap' }
      ]
    }
  },

  modules: [
    '@nuxt/ui'
  ],

  css: ['~/app.css'],

  // UI Configuration
  ui: {
    // Standard UI config if needed
  },

  // Nitro server configuration
  nitro: {
    experimental: {
      openAPI: true
    },
    externals: {
      external: ['better-sqlite3']
    }
  },

  experimental: {
    // Any extra features
  },

  runtimeConfig: {
    public: {
      // Public vars
    }
  }
})
