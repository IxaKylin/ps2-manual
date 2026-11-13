import { defineConfig } from 'vitepress'

const base = process.env.DOCS_BASE || '/ps2-manual/'

export default defineConfig({
  lang: 'zh-CN',
  title: 'PS2 芯片技术手册',
  description: 'PlayStation 2 主机芯片架构、总线与寄存器参考（非官方，逆向整理）',
  base,
  cleanUrls: true,
  srcExclude: ['data/**', 'README.md'],
  lastUpdated: false,
  head: [['link', { rel: 'icon', href: `${base}img/favicon.svg` }]],
  markdown: { math: false, lineNumbers: false },
  themeConfig: {
    logo: '/img/favicon.svg',
    nav: [
      { text: '首页', link: '/' },
      { text: '手册', link: '/chapters/01-overview' },
      { text: '寄存器速查', link: '/appendix/register-index' }
    ],
    sidebar: [
      {
        text: '前言',
        items: [
          { text: '关于本手册', link: '/guide/about' },
          { text: '阅读约定', link: '/guide/conventions' }
        ]
      },
      {
        text: '系统',
        items: [
          { text: '1 概述', link: '/chapters/01-overview' },
          { text: '2 存储器映射', link: '/chapters/02-memory-map' }
        ]
      },
      {
        text: 'Emotion Engine',
        items: [
          { text: '3 EE 核心 R5900', link: '/chapters/03-ee-core' },
          { text: '4 EE 中断控制器', link: '/chapters/04-ee-intc' },
          { text: '5 EE 定时器', link: '/chapters/05-ee-timer' },
          { text: '6 DMA 控制器', link: '/chapters/06-dmac' }
        ]
      },
      {
        text: '图形',
        items: [
          { text: '7 向量处理单元 VPU', link: '/chapters/07-vpu' },
          { text: '8 图形接口 GIF', link: '/chapters/08-gif' },
          { text: '9 图形合成器 GS', link: '/chapters/09-gs' },
          { text: '10 图像处理单元 IPU', link: '/chapters/10-ipu' }
        ]
      },
      {
        text: 'I/O 处理器',
        items: [
          { text: '11 子系统接口 SIF', link: '/chapters/11-sif' },
          { text: '12 IOP', link: '/chapters/12-iop' },
          { text: '13 CDVD 与 MechaCon', link: '/chapters/13-cdvd' },
          { text: '14 外设', link: '/chapters/14-peripherals' }
        ]
      },
      {
        text: '启动',
        items: [{ text: '15 启动流程', link: '/chapters/15-boot' }]
      },
      {
        text: '附录',
        items: [
          { text: 'A 寄存器地址速查', link: '/appendix/register-index' },
          { text: 'B 术语表', link: '/appendix/glossary' },
          { text: 'C 参考资料', link: '/appendix/references' },
          { text: 'D 未验证项与已知差异', link: '/appendix/known-gaps' }
        ]
      }
    ],
    outline: { level: [2, 3], label: '本页目录' },
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索', buttonAriaLabel: '搜索' },
          modal: {
            noResultsText: '没有找到结果',
            resetButtonTitle: '清除',
            footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' }
          }
        }
      }
    },
    docFooter: { prev: '上一章', next: '下一章' },
    darkModeSwitchLabel: '外观',
    sidebarMenuLabel: '目录',
    returnToTopLabel: '返回顶部',
    footer: {
      message: '非官方资料。PlayStation 为 Sony Interactive Entertainment 的商标，本手册与其无关。',
      copyright: '内容依据公开资料、开源模拟器与 QEMU 建模结果整理'
    }
  }
})
