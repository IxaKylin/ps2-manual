---
layout: home

hero:
  name: PS2 芯片技术手册
  text: 架构、总线与寄存器参考
  tagline: 依据公开资料、开源模拟器与 QEMU 建模结果整理的非官方手册
  image:
    src: /img/favicon.svg
    alt: PS2
  actions:
    - theme: brand
      text: 开始阅读
      link: /chapters/01-overview
    - theme: alt
      text: 寄存器地址速查
      link: /appendix/register-index
    - theme: alt
      text: 关于本手册
      link: /guide/about

features:
  - title: 芯片架构
    details: Emotion Engine、向量处理单元、图形合成器与 I/O 处理器的内部结构和互连方式。
  - title: 总线与数据流
    details: EE 主总线、DMA 通道、GIF 三条路径、SIF 双处理器通信与 SBUS 地址窗口。
  - title: 寄存器参考
    details: 按 datasheet 格式给出地址、位宽、属性、复位值、位域图与典型操作步骤。
  - title: 可信度标注
    details: 每个寄存器都标明来源，并区分“已验证”“参考”“未实现”三个等级。
---
