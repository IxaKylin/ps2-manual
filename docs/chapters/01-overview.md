# 第 1 章 概述

## 1.1 系统组成

PS2 由两颗主要处理器芯片和一颗图形芯片构成：

- **Emotion Engine（EE）**：主处理器芯片。集成 R5900 CPU 核心、两个向量处理单元（VPU0、VPU1）、10 通道 DMA 控制器、图像处理单元（IPU）、图形接口（GIF）、中断控制器、定时器以及与 IOP 通信的子系统接口（SIF）。
- **Graphics Synthesizer（GS）**：图形合成器。负责光栅化、纹理映射与显示输出，片上集成 4 MB 嵌入式 DRAM 作为本地存储器。
- **I/O 处理器（IOP）**：以 R3000A 为核心的输入输出子系统，管理光驱、手柄、存储卡、声音处理器（SPU2）、USB、扩展接口等外设。IOP 同时兼作 PS1 兼容模式下的主处理器。

EE 与 GS 之间通过 GIF 相连；EE 与 IOP 之间通过 SIF 交换数据，EE 还可以经 SBUS 地址窗口直接访问 IOP 的内存和寄存器。

![图 1-1 PlayStation 2 系统框图](/img/fig1-1-system.svg)

## 1.2 主要规格

| 项目 | 规格 |
|---|---|
| 主处理器 | Emotion Engine，R5900 核心，294.912 MHz，MIPS III/IV 子集加 128 位多媒体指令（MMI） |
| 主处理器缓存 | 指令缓存 16 KB，数据缓存 8 KB，暂存存储器（Scratchpad RAM，SPR）16 KB |
| 浮点 | COP1 单精度 FPU；VU0（可作 COP2）、VU1 各含 4 路单精度向量浮点单元 |
| 主存 | 32 MB Direct RDRAM，双通道，峰值带宽约 3.2 GB/s |
| EE 总线时钟 | 147.456 MHz（CPU 时钟的 1/2），EE 定时器以此为基准 |
| 图形处理器 | Graphics Synthesizer，147.456 MHz，16 条像素流水线 |
| GS 本地存储器 | 4 MB 嵌入式 DRAM，内部总线位宽 2560 位 |
| 视频输出 | 隔行与逐行，NTSC / PAL；复合、S 端子、色差、RGB（经 DVE 编码） |
| I/O 处理器 | R3000A，36.864 MHz（PS1 模式下 33.8688 MHz） |
| IOP 内存 | 2 MB |
| 声音 | SPU2，两个核心共 48 个声部，2 MB 声音存储器 |
| 光驱 | CD-ROM / DVD-ROM，由 MechaCon 控制 |
| 引导 ROM | ROM0 4 MB（BIOS），EE 与 IOP 共用 |
| 外设接口 | 手柄与存储卡端口各 2 个（SIO2），USB 1.1 两个端口，扩展接口（DEV9），i.LINK（早期型号） |

## 1.3 主要数据通路

PS2 的设计核心是让数据在各单元之间以 DMA 方式流动，CPU 只负责组织数据包：

1. **几何处理**：EE 的 DMAC 把顶点数据和微程序从主存送到 VIF1；VIF1 解包后写入 VU1 的数据存储器；VU1 运行微程序完成坐标变换与光照，再用 `XGKICK` 指令把结果送往 GIF（PATH1）。
2. **图像数据**：纹理等数据由 DMAC 通道 2 直接送往 GIF（PATH3）；VIF1 也可以把数据直接转发给 GIF（PATH2）。
3. **GIF 到 GS**：GIF 在三条路径之间仲裁，把 GIF 数据包解析成 GS 一般寄存器写操作，经 64 位总线送入 GS。
4. **EE 与 IOP**：SIF 提供两个方向的 DMA：EE DMAC 通道 5（SIF0，IOP→EE）、通道 6（SIF1，EE→IOP）与 IOP DMA 通道 9、10 对接，另有通道 7（SIF2）用于调试。命令、RPC 都建立在 SIF DMA 与 SIF 标志寄存器之上。
5. **外设数据**：光驱、声音、存储卡等数据先由 IOP 的 DMA 读入 IOP 内存，再经 SIF 传给 EE。

各通路的寄存器细节分别见第 6 章（DMAC）、第 7 章（VPU）、第 8 章（GIF）和第 11 章（SIF）。

## 1.4 与 Copetti 架构文章的对应关系

本手册的章节结构参照了 Rodrigo Copetti 的[《PlayStation 2 架构》](https://www.copetti.org/zh-hans/writings/consoles/playstation-2/)。该文从功能角度介绍各模块，本手册在其基础上补充寄存器级细节。对应关系如下：

| Copetti 文章章节 | 本手册章节 |
|---|---|
| CPU：Emotion Engine 与 R5900 核心 | [第 3 章](/chapters/03-ee-core)、[第 4 章](/chapters/04-ee-intc)、[第 5 章](/chapters/05-ee-timer) |
| CPU：DMA 与数据流 | [第 6 章](/chapters/06-dmac) |
| CPU：向量处理单元（VPU0、VPU1） | [第 7 章](/chapters/07-vpu) |
| CPU：IPU | [第 10 章](/chapters/10-ipu) |
| 图形：GIF 与 Graphics Synthesizer | [第 8 章](/chapters/08-gif)、[第 9 章](/chapters/09-gs) |
| 音频：SPU2 | [第 14 章](/chapters/14-peripherals) |
| I/O：IOP 与 SIF | [第 11 章](/chapters/11-sif)、[第 12 章](/chapters/12-iop) |
| I/O：光驱、外设与扩展接口 | [第 13 章](/chapters/13-cdvd)、[第 14 章](/chapters/14-peripherals) |
| 操作系统：BIOS 与引导 | [第 15 章](/chapters/15-boot)、[第 16 章](/chapters/16-linux) |

## 1.5 QEMU 模型覆盖情况

本手册的“已验证”内容来自 QEMU `-M ps2` 机型：QEMU 已实现，并有 qtest 测试用例或真实 BIOS / Linux 启动记录覆盖；已实现但没有测试覆盖的功能标为“参考”。该机型能运行真实 BIOS（SCPH-39001）直到显示 OSDSYS 主菜单，也能通过自带的精简 BIOS 引导 Linux 内核。各模块的实现情况如下：

| 模块 | QEMU 实现 | 本手册详细程度 |
|---|---|---|
| R5900、COP0、TLB、MMI、COP1 | 已实现 | 逐位 |
| EE INTC、定时器、DMAC、SIO、MCH | 已实现 | 逐位 |
| VU0/VU1、VIF0/VIF1 | 已实现（微程序解释执行） | 逐位 |
| GIF | 已实现（无 PATH 仲裁） | 仅 FIFO 已验证，GIF_CTRL 为参考，其余寄存器未实现 |
| GS | 已实现（软件绘制主要图元，PCRTC 输出） | 逐位 |
| DVE | 寄存器级 | 逐位 |
| IPU | 未实现 | 地址与概述 |
| SIF | 已实现 | 逐位 |
| IOP R3000A、INTC、DMA、根计数器 | 已实现 | 逐位 |
| SSBUS | 仅保存写入值，按未实现标注；ICFG 已验证 | 逐位 |
| CDVD / MechaCon | 已实现（无光盘，NVM、RTC 可用） | 逐位 |
| SIO2、SPU2、DEV9/ATA、USB | 寄存器级（SPU2 不发声） | 逐位或参考 |
| i.LINK | 未实现 | 地址与概述 |
