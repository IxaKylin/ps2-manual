# 第 12 章 I/O 处理器 IOP

IOP（Input/Output Processor）是 PS2 中负责输入输出的第二颗处理器。它以一颗 MIPS R3000A 兼容核心为中心，带有 2 MB 专用内存、中断控制器、13 通道 DMA 控制器和 6 个根计数器，管理光驱（CDVD）、声音处理器（SPU2）、手柄与存储卡（SIO2）、扩展接口（DEV9）和 USB 等外设。EE 不直接操作这些外设，而是经 SIF（第 11 章）把请求发给 IOP 上运行的驱动模块（IRX），由 IOP 完成实际的输入输出。

本章说明 IOP 核心与 IOP 一侧的系统外设：COP0、中断控制器、DMA 控制器、根计数器以及 SSBUS 配置寄存器。CDVD、SIO2、SPU2、DEV9、USB 等外设见第 13、14 章。

## 12.1 概述

IOP 的结构如图 12-1。R3000A 核心经 IOP 总线访问 IOP 内存与各外设寄存器；DMA 控制器同样挂在 IOP 总线上，在 IOP 内存与外设之间搬运数据，以字（32 位）为单位传输。EE 可以经 SBUS 地址窗口读写 IOP 内存与寄存器（第 2 章），但大量数据须经 SIF DMA 传输。

![图 12-1 IOP 内部结构](/img/fig12-1-iop.svg)

主要特性：

- MIPS I 指令集的 R3000A 核心，没有 TLB 与浮点单元，小端；
- 2 MB IOP 内存，在物理地址 0–8 MB 范围内镜像 4 份；
- 26 个中断源的中断控制器，输出到 CPU 的 IP2；
- 13 个 DMA 通道，分为两组寄存器，结束中断经 DICR 汇总为一个中断源；
- 6 个根计数器：3 个 16 位（T0–T2），3 个 32 位（T3–T5）；
- SSBUS 配置寄存器设定各外设地址窗口与访问时序，ICFG 寄存器可向 EE 发出 SBUS 中断。

### 12.1.1 地址分配

表 12-1 列出 IOP 一侧与本章相关的物理地址（完整地址图见第 2 章 2.4 节）。R3000A 没有 TLB，KSEG0（`0x80000000` 起）与 KSEG1（`0xA0000000` 起）去掉高 3 位即为物理地址；EE 经 SBUS 窗口访问 `0x1F000000`–`0x1F9FFFFF` 时，地址与 IOP 物理地址相同（例如 EE 一侧 `0xBF801070` 即 I_STAT）。

**表 12-1 IOP 地址分配（节选）**

| IOP 物理地址 | 大小 | 内容 | 状态 |
|---|---|---|---|
| `0x00000000` | 2 MB | IOP 内存，在 8 MB 内镜像 | <Status s="verified" /> |
| `0x1D000000` | 256 B | SIF（IOP 侧），见第 11 章 | <Status s="verified" /> |
| `0x1F402000` | 256 B | CDVD，见第 13 章 | <Status s="verified" /> |
| `0x1F800000` | 1 KB | IOP 暂存存储器 | <Status s="unimplemented" /> |
| `0x1F801000` | 0x24 | SSBUS 第一组 | <Status s="unimplemented" /> |
| `0x1F801040` | 0x20 | PS1 方式串口 SIO0/SIO1 | <Status s="unimplemented" /> |
| `0x1F801070` | 0x10 | IOP INTC | <Status s="verified" /> |
| `0x1F801080` | 0x80 | IOP DMA 第一组（通道 0–6、DPCR、DICR） | <Status s="verified" /> |
| `0x1F801100` | 0x30 | 根计数器 T0–T2 | <Status s="verified" /> |
| `0x1F801400` | 0x24 | SSBUS 第二组 | <Status s="unimplemented" /> |
| `0x1F801450` | 4 | ICFG | <Status s="verified" /> |
| `0x1F801460` | — | DEV9 桥接寄存器，见第 14 章 | <Status s="reference" /> |
| `0x1F801480` | 0x30 | 根计数器 T3–T5 | <Status s="verified" /> |
| `0x1F8014C0` | 0x10 | 实时时钟（RTC） | <Status s="unimplemented" /> |
| `0x1F801500` | 0x80 | IOP DMA 第二组（通道 7–12、DPCR2、DICR2、DMACEN、DMACINTEN） | <Status s="verified" /> |
| `0x1F801600` | — | USB OHCI，见第 14 章 | <Status s="verified" /> |
| `0x1F808200` | — | SIO2，见第 14 章 | <Status s="verified" /> |
| `0x1F808400` | 0x200 | i.LINK | <Status s="unimplemented" /> |
| `0x1F900000` | 0x800 | SPU2，见第 14 章 | <Status s="verified" /> |
| `0x1FC00000` | 4 MB | Boot ROM（与 EE 共用） | <Status s="verified" /> |
| `0xFFFE0130` | 4 | 缓存控制寄存器（KSEG2 虚拟地址） | <Status s="unimplemented" /> |

### 12.1.2 时钟

**表 12-2 IOP 时钟**

| 时钟 | 频率 | 用途 | 状态 |
|---|---|---|---|
| IOP 时钟 | 36.864 MHz | R3000A 核心、根计数器基本时钟 | <Status s="verified" /> |
| PS1 模式时钟 | 33.8688 MHz | 兼容 PS1 游戏时 IOP 降频运行（PCSX2） | <Status s="unimplemented" /> |
| 像素时钟 | 13.5 MHz | T0 的外部时钟（MODE.EXT = 1） | <Status s="verified" /> |
| HBLANK | 15734 Hz（NTSC） | T1、T3 的外部时钟（MODE.EXT = 1） | <Status s="verified" /> |

36.864 MHz 约为 PS1 时钟 33.8688 MHz 的 1.09 倍。按 PCSX2，EE 写 SIF CTRL 第 19 位时 IOP 进入 PS1 模式并改用 33.8688 MHz；QEMU 不模拟 PS1 模式。

## 12.2 R3000A 核心

IOP 核心执行 MIPS I 指令集，与 EE 的 R5900（第 3 章）相比差别较大，见表 12-3。

**表 12-3 IOP 核心与 EE 核心的主要区别**

| 项目 | IOP（R3000A） | EE（R5900） |
|---|---|---|
| 指令集 | MIPS I，32 位 | MIPS III/IV 子集加多媒体指令，64 位 |
| PRID | `0x0000001F` | `0x00002E20` |
| TLB / FPU | 无 / 无 | 有 / 单精度 FPU |
| 异常状态 | SR 第 5:0 位的 KU/IE 三级栈，RFE 返回 | Status.EXL/ERL，ERET 返回 |
| 异常向量 | BEV = 1：`0xBFC00180`；BEV = 0：`0x80000080` | 见第 3 章 |
| CP0 定时器 | 无（寄存器 9、11 为断点掩码） | Count/Compare |
| 缓存操作 | 用 SR.IsC 隔离缓存后写存储器 | CACHE 指令 |

### 12.2.1 复位与启动

复位后 SR = `0x00400000`（只有 BEV = 1），PC = `0xBFC00000`。EE 与 IOP 从同一个 Boot ROM 的同一地址开始执行，ROM 中的启动代码读 PRID：读出值小于 `0x100` 时在 IOP 上运行，否则在 EE 上运行，两颗 CPU 由此分开走各自的启动路径。

### 12.2.2 异常与中断

R3000A 没有 EXL 位，SR 第 5:0 位构成三级 KU/IE 栈。IE 为中断允许位，KU 为内核/用户态位；后缀 c、p、o 分别表示当前级（current）、上一级（previous）与更早一级（old）。

| 位 | 名称 | 说明 |
|---|---|---|
| 0 | IEc | 中断允许：0 = 禁止，1 = 允许 |
| 1 | KUc | 运行模式：0 = 内核态，1 = 用户态 |
| 2 | IEp | 上一级的 IEc |
| 3 | KUp | 上一级的 KUc |
| 4 | IEo | 更早一级的 IEc |
| 5 | KUo | 更早一级的 KUc |

只有 KUc、IEc 影响 CPU 的行为：KUc = 1 时不能执行 COP0 指令（CU0 = 0 时）与访问 KSEG0、KSEG1、KSEG2（2.1.2 节）；IEc = 0 时不响应中断。其余四位只保存状态。

- **进入异常**：SR 第 5:0 位左移 2 位，`SR = (SR & ~0x3F) | ((SR << 2) & 0x3C)`。KUc、IEc 清零，即进入内核态并禁止中断；原 KUo、IEo 丢失。CPU 同时写 EPC、CAUSE.ExcCode 与 CAUSE.BD，转到异常向量。
- **返回**：RFE 把 SR 第 5:2 位右移到第 3:0 位，`SR = (SR & ~0xF) | ((SR >> 2) & 0xF)`。KUo、IEo 不变。RFE 不跳转，通常放在 `jr k1` 的延迟槽中执行（12.9.1 节）。

嵌套异常时 SR 第 5:0 位的变化如下，位序为 KUo IEo KUp IEp KUc IEc：

| 步骤 | 事件 | SR[5:0] | 当前状态 |
|---|---|---|---|
| 1 | 用户程序运行 | `0x03` | 用户态，允许中断 |
| 2 | 中断，压栈 | `0x0C` | 内核态，禁止中断 |
| 3 | 保存 SR 前再次发生异常，压栈 | `0x30` | 内核态，禁止中断 |
| 4 | RFE | `0x3C` | 同步骤 2 |
| 5 | RFE | `0x3F` | 同步骤 1 |

- 硬件最多保存两级。处理程序在重新允许中断之前，须把 SR 与 EPC 保存到存储器。
- RFE 不清除 KUo、IEo，步骤 5 之后第 5:2 位为旧值，不影响运行。

R5900 使用 Status.EXL，不使用 KU/IE 栈：进入异常时置 EXL，ERET 清 EXL 并转到 EPC；EXL = 1 时发生的异常不更新 EPC（第 3 章 3.5.2 节）。

<Status s="verified" /> QEMU 中进入异常由 `target/mips/tcg/system/tlb_helper.c`（`r3000_enter_exception`）实现，RFE 由 `target/mips/tcg/system/special_helper.c`（`helper_rfe`）实现；qtest `r3000a/cpu` 检查 SYSCALL 与中断进入时的压栈结果。

中断只有 IP2 一路来自硬件，即 IOP INTC 的输出（12.3 节）。CPU 响应中断的条件为 SR.IEc = 1 且 CAUSE.IP 与 SR.IM 有同为 1 的位。IP0、IP1 是软件中断，写 CAUSE 第 9:8 位产生。

### 12.2.3 缓存隔离

R3000A 用 SR.IsC（第 16 位）隔离数据缓存：IsC = 1 时存储操作只进入缓存，不到达存储器。IOP 内核清除指令缓存时，先在缓存控制寄存器 `0xFFFE0130` 中选择指令缓存，再置 IsC，对每个缓存行写 0，最后恢复（12.9.5 节）。<Status s="verified" /> QEMU 中 IsC = 1 时对 RAM、ROM 的写入被丢弃，读仍从存储器读出，对外设寄存器的写入照常生效；没有缓存模型，缓存控制寄存器为未实现窗口。

## 12.3 中断控制器

IOP INTC 收集各中断源的请求，经 I_STAT、I_MASK 与 I_CTRL 三级门控后送往 R3000A 的 IP2（图 12-2）。

![图 12-2 IOP 中断路径](/img/fig12-2-iop-irq.svg)

- **I_STAT**：中断源信号出现上升沿时对应位置 1 并保持，直到软件写 0 清除（与 EE INTC 的“写 1 清零”相反）。
- **I_MASK**：为 1 的位允许对应中断源。
- **I_CTRL**：第 0 位为总允许。读 I_CTRL 返回当前值并将其清零，可用一次读操作同时保存状态并关闭中断。

INTC 输出 = I_CTRL.0 && (I_STAT & I_MASK) ≠ 0。中断源编号见表 12-4，与 ps2sdk intrman 的中断号一致。

**表 12-4 IOP 中断源**

| 位 | 名称 | 中断源 | 状态 |
|---|---|---|---|
| 0 | VBLANK | GS 场消隐开始（同时送 EE INTC 第 2 位） | <Status s="verified" /> |
| 1 | SBUS | EE → IOP 的 SBUS 中断 | <Status s="unimplemented" /> |
| 2 | CDVD | CDVD 光驱 | <Status s="verified" /> |
| 3 | DMA | IOP DMA（DICR.31） | <Status s="verified" /> |
| 4、5、6 | RTC0–RTC2 | 根计数器 T0–T2 | <Status s="verified" /> |
| 7、8 | SIO0、SIO1 | PS1 方式串口 | <Status s="unimplemented" /> |
| 9 | SPU2 | SPU2 | <Status s="verified" /> |
| 10 | PIO | 并行口 | <Status s="unimplemented" /> |
| 11 | EVBLANK | GS 场消隐结束（同时送 EE INTC 第 3 位） | <Status s="verified" /> |
| 12 | DVD | 用途不明 | <Status s="unimplemented" /> |
| 13 | DEV9 | DEV9 扩展接口 | <Status s="verified" /> |
| 14、15、16 | RTC3–RTC5 | 根计数器 T3–T5 | <Status s="verified" /> |
| 17 | SIO2 | SIO2 | <Status s="verified" /> |
| 18–21 | HTR0–HTR3 | 用途不明 | <Status s="unimplemented" /> |
| 22 | USB | USB OHCI | <Status s="verified" /> |
| 23 | EXTR | 主板扩展接口 | <Status s="unimplemented" /> |
| 24、25 | ILINK、FDMA | i.LINK 及其 DMA | <Status s="unimplemented" /> |

DMA 中断只占 I_STAT 一位。ps2sdk 的 intrman 在软件中把它再分解为各通道的子中断号：通道 0–6 为 `0x20 + n`，通道 7–12 为 `0x21 + n`（`0x27` 留给总线错误），处理程序读 DICR/DICR2 的结束标志确定是哪个通道。

## 12.4 DMA 控制器

### 12.4.1 通道

IOP DMA 控制器有 13 个通道（表 12-5）。通道 0–6 的寄存器与 PS1 兼容，位于第一组 `0x1F801080`，由 DPCR、DICR 控制；通道 7–12 是 PS2 新增的，位于第二组 `0x1F801500`，由 DPCR2、DICR2 控制。每个通道有 4 个寄存器：MADR（+0x0）、BCR（+0x4）、CHCR（+0x8）、TADR（+0xC）。

**表 12-5 IOP DMA 通道**

| 通道 | 名称 | 基地址 | 允许位 | 结束标志 | 用途 | QEMU |
|---|---|---|---|---|---|---|
| 0 | MDECin | `0x1F801080` | DPCR.3 | DICR.24 | PS1 MDEC 输入 | <Status s="unimplemented" /> |
| 1 | MDECout | `0x1F801090` | DPCR.7 | DICR.25 | PS1 MDEC 输出 | <Status s="unimplemented" /> |
| 2 | SIF2 | `0x1F8010A0` | DPCR.11 | DICR.26 | SIF2（PS1 GPU 方式通道） | <Status s="unimplemented" /> |
| 3 | CDVD | `0x1F8010B0` | DPCR.15 | DICR.27 | CDVD 读出数据 | <Status s="unimplemented" /> |
| 4 | SPU2 core0 | `0x1F8010C0` | DPCR.19 | DICR.28 | SPU2 核心 0 | <Status s="verified" /> |
| 5 | PIO | `0x1F8010D0` | DPCR.23 | DICR.29 | 并行口 | <Status s="unimplemented" /> |
| 6 | OTC | `0x1F8010E0` | DPCR.27 | DICR.30 | PS1 排序表清除 | <Status s="unimplemented" /> |
| 7 | SPU2 core1 | `0x1F801500` | DPCR2.3 | DICR2.24 | SPU2 核心 1 | <Status s="verified" /> |
| 8 | DEV9 | `0x1F801510` | DPCR2.7 | DICR2.25 | DEV9 扩展接口 | <Status s="unimplemented" /> |
| 9 | SIF0 | `0x1F801520` | DPCR2.11 | DICR2.26 | IOP → EE | <Status s="verified" /> |
| 10 | SIF1 | `0x1F801530` | DPCR2.15 | DICR2.27 | EE → IOP | <Status s="verified" /> |
| 11 | SIO2in | `0x1F801540` | DPCR2.19 | DICR2.28 | 送往 SIO2 的数据 | <Status s="verified" /> |
| 12 | SIO2out | `0x1F801550` | DPCR2.23 | DICR2.29 | SIO2 送回的数据 | <Status s="verified" /> |

“QEMU”列为未实现的通道在 QEMU 中没有接外设：启动后立即结束（按 DICR/DICR2 置标志），不搬运数据，并记录 LOG_UNIMP。

### 12.4.2 启动与结束

1. 软件写 MADR、BCR（链模式写 TADR），再写 CHCR 使 START（第 24 位）为 1。
2. 若 DPCR/DPCR2 中该通道的允许位为 1，通道开始传输。允许位为 0 时 START 保持为 1，但通道不启动。
3. 传输结束时 START 清零。若 DICR/DICR2 中该通道的屏蔽位为 1，置结束标志；SIF0、SIF1 两个通道无论屏蔽位如何总置结束标志。
4. DICR.15（BERR）为 1，或 DICR.MASTER（第 23 位）为 1 且两组结束标志中有 1 时，DICR.31 为 1，IOP INTC 第 3 位置位。

SPU2 与 SIO2 通道使用切片模式（CHCR.SYNC = 1），按 BCR 给出的块大小与块数传输。SIF0、SIF1 使用链模式，以 IOP 一侧的标签描述每段数据：

- **SIF0**（IOP → EE）：TADR 指向 4 字的标签。字 0 第 23:0 位为数据在 IOP 内存中的地址，第 31 位（ERT）或第 30 位（INT）为 1 表示这是最后一段；字 1 第 19:0 位为数据字数；字 2–3 为送给 EE 一侧 DMAC 的 DMAtag。DMA 控制器把从 TADR+8 起的 4 个字（DMAtag 两字及其后两字）作为一个四字推入 SIF FIFO，再推入数据，TADR 加 16 后读下一个标签。
- **SIF1**（EE → IOP）：IOP 一侧不读内存中的标签。EE 一侧每段数据前的第一个四字带有 IOP 标签（IOP 地址、字数与 ERT/INT），IOP DMA 控制器从 FIFO 中取出后，把其后的数据写到该地址。

SIF 通道的数据经 128 字的 FIFO 传送，传输速度由另一侧 DMAC 取走或送来数据的速度决定。详见第 11 章。

## 12.5 根计数器

IOP 有 6 个根计数器（root counter），每个有 COUNT、MODE、TARGET 三个寄存器。T0–T2 为 16 位，与 PS1 兼容；T3–T5 为 32 位。计数器可在达到目标值或溢出时申请中断，IOP 内核用它们实现定时与闹钟功能（Sony BIOS 的 IOP 内核使用 T5）。

**表 12-6 根计数器**

| 计数器 | 基地址 | 宽度 | 时钟（EXT = 0） | 外部时钟（EXT = 1） | 预分频 | 门控信号 | 中断 |
|---|---|---|---|---|---|---|---|
| T0 | `0x1F801100` | 16 | 36.864 MHz | 像素时钟 13.5 MHz | — | HBLANK | 4 |
| T1 | `0x1F801110` | 16 | 36.864 MHz | HBLANK | — | VBLANK | 5 |
| T2 | `0x1F801120` | 16 | 36.864 MHz | — | MODE.DIV8：1/8 | 无 | 6 |
| T3 | `0x1F801480` | 32 | 36.864 MHz | HBLANK | — | VBLANK | 14 |
| T4 | `0x1F801490` | 32 | 36.864 MHz | — | MODE.PSC：1/8、1/16、1/256 | 无 | 15 |
| T5 | `0x1F8014A0` | 32 | 36.864 MHz | — | MODE.PSC：1/8、1/16、1/256 | 无 | 16 |

门控信号按 ps2tek 与 PCSX2 给出。<Status s="unimplemented" /> QEMU 不模拟 T0、T1、T3 的消隐门控（照常计数）；HBLANK 固定为 NTSC 的 15734 Hz。

计数器的中断方式：

- **CMPE / OVFE**：计数值达到 TARGET、或从最大值回绕到 0 时置 CMPF / OVFF，对应允许位为 1 时申请中断。
- **ZRET**：为 1 时达到 TARGET 后计数值回到 0，可实现周期中断。
- **REPEAT**：为 0 时只中断一次，直到读 MODE 清除标志；为 1 时每次事件都中断。
- **LEVL**：LEVL = 1 且对应中断允许（CMPE / OVFE）为 1 时：IRQEN 为 1 的事件把它翻转为 0；IRQEN 为 0 时仅在 REPEAT = 1 时翻回 1。只有 IRQEN 为 1 时才产生中断，因此与 REPEAT 同时使用时每两次事件中断一次；REPEAT = 0 时只中断一次，IRQEN 保持为 0，直到读或写 MODE。

## 12.6 SSBUS 与 ICFG

SSBUS 是 IOP 与各外设之间的总线。SSBUS 控制器的两组寄存器（`0x1F801000`、`0x1F801400`）设定 SPEED、SPU2、DEV1、DEV5、DEV9 等外设的地址窗口和访问时序，由 Boot ROM 在启动早期写入，之后一般不再改动。例如 Sony BIOS 中 IOP 写 ROM_DELAY（`0x1F801010`）= `0x0016244F`。<Status s="unimplemented" /> QEMU 只保存这些寄存器的值并可读回，外设地址固定，访问时序无影响。

ICFG（`0x1F801450`）是 IOP 的配置寄存器。其第 1 位用于 IOP → EE 的通知：IOP 以半字或字写入且该位为 1 时，EE INTC 第 1 位（SBUS）置位。IOP 的 SIF 层在送出 SIF 数据后用它通知 EE。<Status s="verified" />

## 12.7 寄存器汇总

### 12.7.1 COP0 寄存器

“地址”列为 CP0 寄存器编号，用 MFC0/MTC0 访问。

<RegSummary block="iop-cop0" />

### 12.7.2 中断控制器

<RegSummary block="iop-intc" />

### 12.7.3 DMA 控制器

通道寄存器（名称以 `Dn_` 开头）的偏移相对于通道基地址（表 12-5）；全局寄存器给出绝对地址。

<RegSummary block="iop-dma" />

### 12.7.4 根计数器

寄存器的偏移相对于计数器基地址（表 12-6）。

<RegSummary block="iop-rcnt" />

### 12.7.5 SSBUS 与 ICFG

SSBUS 寄存器名取自 PCSX2，位定义未公开，这里只列出地址。

<RegSummary block="iop-ssbus" />

## 12.8 寄存器说明

### BPC
<Reg block="iop-cop0" name="BPC" />

### BDA
<Reg block="iop-cop0" name="BDA" />

### JUMPDEST
<Reg block="iop-cop0" name="JUMPDEST" />

### DCIC
<Reg block="iop-cop0" name="DCIC" />

### BadVaddr
<Reg block="iop-cop0" name="BadVaddr" />

### BDAM
<Reg block="iop-cop0" name="BDAM" />

### BPCM
<Reg block="iop-cop0" name="BPCM" />

### SR
<Reg block="iop-cop0" name="SR" />

### CAUSE
<Reg block="iop-cop0" name="CAUSE" />

### EPC
<Reg block="iop-cop0" name="EPC" />

### PRID
<Reg block="iop-cop0" name="PRID" />

### I_STAT
<Reg block="iop-intc" name="I_STAT" />

### I_MASK
<Reg block="iop-intc" name="I_MASK" />

### I_CTRL
<Reg block="iop-intc" name="I_CTRL" />

### Dn_MADR
<Reg block="iop-dma" name="Dn_MADR" />

### Dn_BCR
<Reg block="iop-dma" name="Dn_BCR" />

### Dn_CHCR
<Reg block="iop-dma" name="Dn_CHCR" />

### Dn_TADR
<Reg block="iop-dma" name="Dn_TADR" />

### DPCR
<Reg block="iop-dma" name="DPCR" />

### DICR
<Reg block="iop-dma" name="DICR" />

### DPCR2
<Reg block="iop-dma" name="DPCR2" />

### DICR2
<Reg block="iop-dma" name="DICR2" />

### DMACEN
<Reg block="iop-dma" name="DMACEN" />

### DMACINTEN
<Reg block="iop-dma" name="DMACINTEN" />

### Tn_COUNT
<Reg block="iop-rcnt" name="Tn_COUNT" />

### Tn_MODE
<Reg block="iop-rcnt" name="Tn_MODE" />

### Tn_TARGET
<Reg block="iop-rcnt" name="Tn_TARGET" />

### ICFG
<Reg block="iop-ssbus" name="ICFG" />

## 12.9 编程要点

### 12.9.1 安装异常处理程序

复位后 BEV = 1，异常进入 ROM 中的 `0xBFC00180`。IOP 内核切换到 RAM 中的异常向量：

1. 把异常入口代码（通常只有几条指令，跳到真正的处理程序）复制到 IOP 内存 `0x00000080`（KSEG0 `0x80000080`）。
2. 写 SR 使 BEV = 0，之后的异常进入 `0x80000080`。
3. 处理程序保存寄存器后读 CAUSE：ExcCode = 0 为中断，8 为 SYSCALL，9 为 BREAK 等。
4. 返回时把返回地址放入 k1（中断为 EPC，SYSCALL 为 EPC + 4），执行 `jr k1`，延迟槽中放 `rfe`。

::: warning
R3000A 没有 EXL 位。处理程序在 RFE 之前若再次发生异常，三级栈会再左移一次，最早一级状态丢失，EPC 也被覆盖。处理程序中不要在保存 EPC 之前重新开中断。
:::

### 12.9.2 中断处理

1. 初始化：写 I_MASK = 0，写 I_STAT = 0 清除所有待处理位；对需要的中断源 n 置 I_MASK 第 n 位；写 I_CTRL = 1；在 SR 中置 IM2（第 10 位）与 IEc。
2. 中断进入后：读 I_STAT & I_MASK，得到待处理的中断源。
3. 对每个待处理的源 n：先清除中断源自身的状态（例如读 Tn_MODE、写 DICR 结束标志、清 SIO2 状态），再写 I_STAT = ~(1 << n) 清除该位。
4. 处理完后返回。由于 I_STAT 按上升沿锁存，若中断源信号一直为高，清除 I_STAT 后不会再次置位，必须先清除中断源。

### 12.9.3 临界区

读 I_CTRL 会把它清零，因此“读出即关中断”：

```c
old = *(volatile u32 *)0xBF801078;   /* 读出并关闭 INTC 输出 */
/* 临界区 */
*(volatile u32 *)0xBF801078 = old;   /* 恢复 */
```

这种方式只影响 IP2，不改动 SR。

### 12.9.4 周期定时器

以 T5 产生 1 ms 周期中断为例（36.864 MHz，PSC = 0）：

1. 写 T5_MODE（`0x1F8014A4`）= `0x0000`，关闭中断并清除计数值。
2. 写 T5_TARGET（`0x1F8014A8`）= 36864。
3. 写 T5_MODE = `0x0058`（ZRET、CMPE、REPEAT）。
4. 置 I_MASK 第 16 位。
5. 中断处理程序中读 T5_MODE 清除 CMPF，再写 I_STAT = `0xFFFEFFFF`。

ps2-lite-bios 的 IOP 内核用同样的方法以 T5 实现闹钟，最短间隔 3686 个计数（约 100 µs）。

### 12.9.5 清除指令缓存

ps2sdk 的 FlushIcache 按以下顺序清除 IOP 指令缓存，整个过程在不缓存的 KSEG1 中运行：

1. 写 SR = 0，关中断；
2. 清除 ICFG 第 0 位；保存 DMACEN 并写 0，停止 DMA；
3. 保存缓存控制寄存器 `0xFFFE0130`，写 `0xC04`；
4. 写 SR = `0x00010000`（IsC = 1），对 `0x0000`–`0x0FF0`（共 4 KB）每隔 16 字节写一个 0；
5. 写 SR = 0，恢复缓存控制寄存器、DMACEN、ICFG 与 SR。

<Status s="unimplemented" /> QEMU 没有缓存模型，上述过程只有 IsC 期间写 RAM 被丢弃这一效果；缓存控制寄存器、DMACEN 与 ICFG 第 0 位无作用。

### 12.9.6 SIF0 发送

1. 在 IOP 内存中准备数据与 4 字标签（12.4.2 节），标签地址按 16 字节对齐，最后一个标签置 ERT（第 31 位）。
2. 置 DPCR2 第 11 位（SIF0 允许）。SIF0 总置结束标志，DICR2 屏蔽位可不设。
3. 写 D9_TADR（`0x1F80152C`）= 标签地址，D9_CHCR（`0x1F801528`）= `0x01000101`。
4. 等待 D9_CHCR.START = 0，或在 DMA 中断中检查 DICR2 第 26 位。
5. 写 ICFG 第 1 位通知 EE（12.6 节）。

## 12.10 QEMU 模型说明

QEMU 中 IOP 由 `hw/mips/ps2_iop.c` 的 `ps2-iop` 设备实现：R3000A 位于 CPU 簇 1，时钟 36.864 MHz；子设备包括 `ps2-iop-intc`（`hw/intc/ps2_iop_intc.c`）、`ps2-iop-dma`（`hw/dma/ps2_iop_dma.c`）、`ps2-iop-rcnt`（`hw/timer/ps2_iop_rcnt.c`）、`ps2-iop-ssbus`（`hw/misc/ps2_iop_ssbus.c`）与 SIO2。IOP 有自己的 4 GB 地址空间 `ps2.iop`，EE 经 SBUS 别名访问。R3000A 的 CPU 模型在 `target/mips` 中，型号名为 `R3000A`。

相关 qtest：`r3000a/cpu`（Malta 板上以 `-cpu R3000A` 运行）、`ps2/prid-split`、`ps2/iop-intc`、`ps2/iop-dma`、`ps2/sif-dma`、`ps2/iop-rcnt`、`ps2/iop-ssbus`、`ps2/sbus`、`ps2/memory-map`。此外 Sony BIOS 可经 IOP 内核启动到 OSDSYS；ps2-lite-bios 的 IOP 内核使用 T5 闹钟、SIF DMA 与 RAM 异常向量。

已模拟：

| 功能 | 说明 |
|---|---|
| R3000A | MIPS I，PRID `0x1F`，SR 可写位掩码 `0x1043FF3F`，KU/IE 三级栈与 RFE，BEV 两组向量，用户态地址错误与 CU0 检查 |
| 保留指令 | ERET、BEQL 等分支可能指令、WAIT、TLB 指令、sel ≠ 0 的 MFC0/MTC0、LL/SC 产生 RI 异常 |
| 缓存隔离 | IsC = 1 时写 RAM/ROM 被丢弃，读照常，写外设寄存器照常 |
| IOP 内存 | 2 MB，在 8 MB 内镜像 4 份 |
| INTC | 上升沿锁存、写 0 清零、I_CTRL 读清零，输出到 IP2；14 个中断源已接线（表 12-4） |
| DMA | 两组寄存器、DPCR/DPCR2 允许位、DICR/DICR2 屏蔽与结束标志、DICR.31 汇总；SPU2、SIF、SIO2 共 6 个通道接外设 |
| 根计数器 | 6 个计数器的计数、清零与中断方式，T0 像素时钟、T1/T3 HBLANK、T2/T4/T5 预分频，T2/T4/T5 门控 |
| ICFG | 半字或字写第 1 位时向 EE INTC 第 1 位发出中断 |

未模拟或与硬件不同：

| 功能 | 说明 |
|---|---|
| 调试寄存器 | BPC、BDA、DCIC、BDAM、BPCM 只保存，不产生断点；CP0 寄存器 6 读出 `0xFFFFFFFF` |
| 流水线细节 | 不模拟载入延迟槽；没有指令/数据缓存，缓存控制寄存器与暂存存储器为未实现窗口 |
| PS1 模式 | 不模拟 33.8688 MHz 时钟与 PS1 兼容外设（SIO0/SIO1、MDEC 等） |
| SBUS 中断（IOP 第 1 位） | 未接线 |
| DMA 时序 | 传输立即完成（SIF 通道受 FIFO 节奏限制）；优先级、DMAW/CPUW 无效 |
| DMA 全局控制 | DMACEN、DMACINTEN 只保存，不影响传输与中断 |
| DMA 中断细分 | DICR 第 6:0 位（切片中断）与 DICR2 第 12:0 位（标签中断）只保存；BERR 不会自动置位 |
| 无外设的通道 | 通道 0、1、2、3、5、6、8 启动后立即结束 |
| 计数器门控 | T0、T1、T3 的消隐门控不模拟；HBLANK 固定为 NTSC；单次中断后 IRQEN 不变为 0 |
| SSBUS | 地址窗口与时序寄存器只保存；ICFG 第 0 位无作用 |
| 中断源电平 | USB 等电平信号只在上升沿置位一次（PCSX2 在电平保持期间反复置位） |
| i.LINK、RTC | 未实现 |

## 12.11 参考资料

- QEMU `hw/mips/ps2_iop.c`、`hw/intc/ps2_iop_intc.c`、`hw/dma/ps2_iop_dma.c`、`hw/timer/ps2_iop_rcnt.c`、`hw/misc/ps2_iop_ssbus.c`、`hw/misc/ps2_sif.c`、`target/mips/tcg/system/tlb_helper.c`
- PCSX2 pcsx2/R3000A.cpp:42–85（复位与异常入口）、pcsx2/R3000A.cpp:51（IOP 时钟）、pcsx2/IopHw.h:21–52（SSBUS 与 ICFG 地址）、pcsx2/IopHw.h:77–201（DMA 寄存器）、pcsx2/IopCounters.cpp:206–261（计数器中断）、pcsx2/HwWrite.cpp:170–181（SIF CTRL 对 IOP 的作用）
- ps2sdk iop/system/intrman/include/intrman.h:26–56（中断号）、common/include/iop_cop0_defs.h（COP0）、iop/system/loadcore/src/loadcore.c:1410–1480（FlushIcache）、iop/system/sifman/src/sifman.c:512–521
- ps2tek §IOP Interrupts、§IOP DMA、§IOP Timers
