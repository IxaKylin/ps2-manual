# 第 2 章 存储器映射

PS2 有两套独立的物理地址空间：EE 一侧和 IOP 一侧。EE 可以经 SBUS 地址窗口访问 IOP 的内存与寄存器；IOP 不能直接访问 EE 的地址空间，两者之间的大块数据交换须经 SIF DMA（第 11 章）。

## 2.1 EE 虚拟地址空间

R5900 采用 MIPS 的标准分段方式，32 位虚拟地址空间划分如下：

| 虚拟地址 | 段 | 映射方式 | 缓存 | 访问权限 |
|---|---|---|---|---|
| `0x00000000`–`0x7FFFFFFF` | KUSEG | 经 TLB | 由 TLB 项决定 | 用户、管理、内核 |
| `0x80000000`–`0x9FFFFFFF` | KSEG0 | 直接映射到物理地址 `0x00000000`–`0x1FFFFFFF` | 缓存 | 内核 |
| `0xA0000000`–`0xBFFFFFFF` | KSEG1 | 直接映射到物理地址 `0x00000000`–`0x1FFFFFFF` | 不缓存 | 内核 |
| `0xC0000000`–`0xDFFFFFFF` | SSEG | 经 TLB | 由 TLB 项决定 | 管理、内核 |
| `0xE0000000`–`0xFFFFFFFF` | KSEG3 | 经 TLB | 由 TLB 项决定 | 内核 |

访问外设寄存器时应使用 KSEG1 地址（物理地址加 `0xA0000000`），以免经过数据缓存。

PS2 内核（BIOS 中的 EE 内核）启动后会设置固定的 TLB 项，常见约定如下（<Status s="reference" />）：

| 虚拟地址 | 用途 |
|---|---|
| `0x00000000`–`0x01FFFFFF` | 主存，缓存访问 |
| `0x20000000`–`0x21FFFFFF` | 主存，不缓存访问 |
| `0x30000000`–`0x31FFFFFF` | 主存，不缓存加速（uncached accelerated）访问 |
| `0x70000000`–`0x70003FFF` | 暂存存储器 SPR |

### 暂存存储器

暂存存储器（Scratchpad RAM，SPR）是 EE 核心内 16 KB 的高速 SRAM，**不在物理地址空间中**。它只能通过 S 位为 1 的 TLB 项访问：TLB 项的 S 位置 1 时，该页映射到 SPR，忽略 PFN。DMAC 通道 8（fromSPR）与通道 9（toSPR）用 SADR 寄存器寻址 SPR（第 6 章）。

## 2.2 EE 物理地址空间

![图 2-1 EE 物理地址空间](/img/memmap-ee-physical.svg)

| 物理地址 | 大小 | 内容 | 状态 |
|---|---|---|---|
| `0x00000000` | 32 MB | 主存 RDRAM | <Status s="verified" /> |
| `0x10000000` | 64 KB | EE 寄存器区（见 2.3 节） | <Status s="verified" /> |
| `0x11000000` | 16 KB | VU0 微程序存储器（4 KB，在 16 KB 窗口内镜像） | <Status s="verified" /> |
| `0x11004000` | 16 KB | VU0 数据存储器（4 KB，镜像） | <Status s="verified" /> |
| `0x11008000` | 16 KB | VU1 微程序存储器 | <Status s="verified" /> |
| `0x1100C000` | 16 KB | VU1 数据存储器 | <Status s="verified" /> |
| `0x12000000` | 32 MB 窗口 | GS 特权寄存器（第 9 章） | <Status s="verified" /> |
| `0x14000000` | 64 KB | SBUS 窗口：IOP 侧 DEV9 SPEED（`0x10000000`） | <Status s="verified" /> |
| `0x1A000000` | 64 KB | DVE 视频编码器 | <Status s="verified" /> |
| `0x1C000000` | 8 MB | SBUS 窗口：IOP 内存（2 MB，镜像至 8 MB） | <Status s="verified" /> |
| `0x1E000000` | 4 MB | ROM1：DVD 播放器（QEMU 映射为空 ROM，不加载映像） | <Status s="verified" /> |
| `0x1E400000` | 4 MB | ROM2：中文字库（部分型号；QEMU 同上） | <Status s="verified" /> |
| `0x1F000000` | 10 MB | SBUS 窗口：IOP 寄存器区 `0x1F000000`–`0x1F9FFFFF` | <Status s="verified" /> |
| `0x1FC00000` | 4 MB | ROM0：BIOS，复位向量 `0xBFC00000` | <Status s="verified" /> |

未列出的地址没有设备，访问会产生总线错误异常。

## 2.3 EE 寄存器区

EE 片上外设集中在物理地址 `0x10000000`–`0x1000FFFF`。

![图 2-2 EE 寄存器区](/img/memmap-ee-registers.svg)

| 地址范围 | 模块 | 章节 |
|---|---|---|
| `0x10000000`–`0x10001FFF` | 定时器 T0–T3，间隔 `0x800` | [第 5 章](/chapters/05-ee-timer) |
| `0x10002000`–`0x10002FFF` | IPU 寄存器 | [第 10 章](/chapters/10-ipu) |
| `0x10003000`–`0x100030FF` | GIF 寄存器 | [第 8 章](/chapters/08-gif) |
| `0x10003800`–`0x10003BFF` | VIF0 寄存器 | [第 7 章](/chapters/07-vpu) |
| `0x10003C00`–`0x10003FFF` | VIF1 寄存器 | [第 7 章](/chapters/07-vpu) |
| `0x10004000`–`0x10004FFF` | VIF0 FIFO | [第 7 章](/chapters/07-vpu) |
| `0x10005000`–`0x10005FFF` | VIF1 FIFO | [第 7 章](/chapters/07-vpu) |
| `0x10006000`–`0x10006FFF` | GIF FIFO | [第 8 章](/chapters/08-gif) |
| `0x10007000`–`0x10007FFF` | IPU FIFO | [第 10 章](/chapters/10-ipu) |
| `0x10008000`–`0x1000DFFF` | DMAC 通道 0–9 | [第 6 章](/chapters/06-dmac) |
| `0x1000E000`–`0x1000E0FF` | DMAC 全局寄存器 | [第 6 章](/chapters/06-dmac) |
| `0x1000F000`–`0x1000F01F` | INTC | [第 4 章](/chapters/04-ee-intc) |
| `0x1000F100`–`0x1000F1FF` | SIO 调试串口 | [第 14 章](/chapters/14-peripherals) |
| `0x1000F200`–`0x1000F2FF` | SIF（EE 侧） | [第 11 章](/chapters/11-sif) |
| `0x1000F430`–`0x1000F44F` | MCH（RDRAM 初始化接口） | [第 14 章](/chapters/14-peripherals) |
| `0x1000F500`–`0x1000F5FF` | DMAC 使能（D_ENABLER、D_ENABLEW） | [第 6 章](/chapters/06-dmac) |

## 2.4 IOP 物理地址空间

IOP 的 R3000A 没有 TLB，虚拟地址按 KUSEG/KSEG0/KSEG1 直接映射到 29 位物理地址。下图与下表均为物理地址，唯一例外是 KSEG2 中的缓存控制寄存器 `0xFFFE0130`，它只能以该虚拟地址访问。

![图 2-3 IOP 物理地址空间](/img/memmap-iop-physical.svg)

| 物理地址 | 大小 | 内容 | 状态 |
|---|---|---|---|
| `0x00000000` | 2 MB | IOP 内存，在 8 MB 范围内镜像 | <Status s="verified" /> |
| `0x10000000` | 64 KB | DEV9 SPEED 芯片与 ATA 接口 | <Status s="verified" /> |
| `0x16000000` | 2 MB | DEV9 扩展窗口 | <Status s="unimplemented" /> |
| `0x1D000000` | 256 B | SIF（IOP 侧） | <Status s="verified" /> |
| `0x1E000000` | 4 MB | ROM1 | <Status s="verified" /> |
| `0x1E400000` | 4 MB | ROM2 | <Status s="verified" /> |
| `0x1F402000` | 256 B | CDVD / MechaCon | <Status s="verified" /> |
| `0x1F800000` | 1 KB | IOP 暂存存储器 | <Status s="unimplemented" /> |
| `0x1F801000` / `0x1F801400` | — | SSBUS 总线配置（两组） | <Status s="unimplemented" /> |
| `0x1F801070` | — | IOP INTC | <Status s="verified" /> |
| `0x1F801080` / `0x1F801500` | — | IOP DMA 第一组 / 第二组 | <Status s="verified" /> |
| `0x1F801100` / `0x1F801480` | — | 根计数器 0–2 / 3–5 | <Status s="verified" /> |
| `0x1F801450` | — | ICFG | <Status s="verified" /> |
| `0x1F801460` | — | DEV9 桥接寄存器（只有窗口映射有 qtest，寄存器均未验证） | <Status s="reference" /> |
| `0x1F801600` | — | USB OHCI | <Status s="verified" /> |
| `0x1F808200` | 256 B | SIO2 | <Status s="verified" /> |
| `0x1F808400` | 512 B | i.LINK | <Status s="unimplemented" /> |
| `0x1F900000` | 2 KB | SPU2，核心 1 在 `+0x400` | <Status s="verified" /> |
| `0x1FC00000` | 4 MB | ROM0（与 EE 共用） | <Status s="verified" /> |
| `0xFFFE0130` | — | 缓存控制寄存器 | <Status s="unimplemented" /> |

## 2.5 SBUS 地址窗口

EE 可以通过三个地址窗口直接读写 IOP 一侧的资源。这些窗口经 SBUS 转发，访问速度远低于 EE 本地总线，主要用于初始化与调试；大量数据传输应使用 SIF DMA。

| EE 物理地址 | 大小 | IOP 物理地址 | 内容 |
|---|---|---|---|
| `0x1C000000` | 8 MB | `0x00000000` | IOP 内存（2 MB，8 MB 范围内共 4 份） |
| `0x1F000000` | 10 MB | `0x1F000000`–`0x1F9FFFFF` | IOP 寄存器区，例如 IOP INTC 在 EE 一侧为 `0xBF801070` |
| `0x14000000` | 64 KB | `0x10000000` | DEV9 SPEED |

<Status s="verified" /> 上述映射由 QEMU 测试用例 `ps2/sbus` 验证：经 EE `0x1C000000` 窗口写入 IOP 内存后，在窗口内各镜像位置读出一致；SPEED 与 USB OHCI 寄存器可经窗口访问。

## 2.6 中断与 DMA 连接

| 信号 | 源 | 目标 |
|---|---|---|
| EE INT0（Cause.IP2） | EE INTC | R5900 |
| EE INT1（Cause.IP3） | EE DMAC | R5900 |
| GS 中断 | GS | EE INTC 第 0 位 |
| SBUS 中断 | IOP（SSBUS） | EE INTC 第 1 位 |
| 场消隐开始 / 结束 | GS | EE INTC 第 2、3 位；IOP INTC VBLANK 两个中断源 |
| 定时器 0–3 | EE 定时器 | EE INTC 第 9–12 位 |
| CPCOND0 | DMAC | R5900 `BC0T`/`BC0F` 条件 |

各中断源的详细编号见第 4 章与第 12 章，DMA 通道分配见第 6 章与第 12 章。
