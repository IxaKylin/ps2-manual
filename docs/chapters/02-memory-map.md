# 第 2 章 存储器映射

PS2 有两套独立的物理地址空间：EE 一侧和 IOP 一侧。EE 可以经 SBUS 地址窗口访问 IOP 的内存与寄存器；IOP 不能直接访问 EE 的地址空间，两者之间的大块数据交换须经 SIF DMA（第 11 章）。

## 2.1 虚拟地址空间

R5900 与 R3000A 采用 MIPS 的固定分段方式。32 位虚拟地址按第 31:29 位分段，各段的映射方式、缓存方式与访问权限固定。分段的定义见 MIPS32 特权资源架构（Privileged Resource Architecture）规范 Rev 6.02 第 4 章（MIPS 文档 MD00090，见附录 C）。

### 2.1.1 分段

| 虚拟地址 | 第 31:29 位 | 段 | 映射方式 | 缓存 | 访问权限 |
|---|---|---|---|---|---|
| `0x00000000`–`0x7FFFFFFF` | `0b0xx` | KUSEG | 经 TLB | 由 TLB 项决定 | 用户、管理、内核 |
| `0x80000000`–`0x9FFFFFFF` | `0b100` | KSEG0 | 直接映射到物理地址 `0x00000000`–`0x1FFFFFFF` | 由 Config.K0 决定 | 内核 |
| `0xA0000000`–`0xBFFFFFFF` | `0b101` | KSEG1 | 直接映射到物理地址 `0x00000000`–`0x1FFFFFFF` | 不缓存 | 内核 |
| `0xC0000000`–`0xDFFFFFFF` | `0b110` | SSEG | 经 TLB | 由 TLB 项决定 | 管理、内核 |
| `0xE0000000`–`0xFFFFFFFF` | `0b111` | KSEG3 | 经 TLB | 由 TLB 项决定 | 内核 |

来源：MIPS32 特权资源架构规范 Rev 6.02 4.3 节表 4.1、4.6 节表 4.3。

- 经 TLB 的段称为映射段；直接映射的段称为非映射段，对应从物理地址 0 开始、与段等长的区域。
- 同一段按访问时的运行模式另有名称：KUSEG 又称 useg、suseg、kuseg，SSEG 又称 sseg、ksseg。本手册统一使用上表名称。
- R3000A 的资料把 `0xC0000000`–`0xFFFFFFFF` 合称 KSEG2，本手册 IOP 部分沿用该名称。

### 2.1.2 访问权限

各运行模式可访问的段如下：

| 虚拟地址 | 段 | 用户态 | 管理态 | 内核态 |
|---|---|---|---|---|
| `0x00000000`–`0x7FFFFFFF` | KUSEG | 经 TLB | 经 TLB | 经 TLB；Status.ERL = 1 时直接映射，不缓存 |
| `0x80000000`–`0x9FFFFFFF` | KSEG0 | 地址错误 | 地址错误 | 直接映射 |
| `0xA0000000`–`0xBFFFFFFF` | KSEG1 | 地址错误 | 地址错误 | 直接映射，不缓存 |
| `0xC0000000`–`0xDFFFFFFF` | SSEG | 地址错误 | 经 TLB | 经 TLB |
| `0xE0000000`–`0xFFFFFFFF` | KSEG3 | 地址错误 | 地址错误 | 经 TLB |

来源：MIPS32 特权资源架构规范 Rev 6.02 4.5 节表 4.2、4.7 节。

- 访问不允许的段产生地址错误异常：取指与读为 AdEL，写为 AdES，BadVAddr 记录出错地址。
- Status.ERL = 1 时 KUSEG 直接映射的规则只适用于 R5900。R3000A 没有 ERL 位。
- R5900 的运行模式由 Status.KSU、EXL、ERL 决定（第 3 章）。R3000A 由 SR.KUc 决定，只有用户态与内核态（12.2.2 节）。

### 2.1.3 KSEG0 与 KSEG1

KSEG0 与 KSEG1 不经 TLB，物理地址为虚拟地址与 `0x1FFFFFFF` 相与。同一物理地址在两段中各有一个虚拟地址，例如 Boot ROM `0x1FC00000` 对应 `0x9FC00000` 与 `0xBFC00000`。

| 段 | 虚拟地址 | 物理地址 | 缓存方式 |
|---|---|---|---|
| KSEG0 | `0x80000000`–`0x9FFFFFFF` | `0x00000000`–`0x1FFFFFFF` | Config.K0 |
| KSEG1 | `0xA0000000`–`0xBFFFFFFF` | `0x00000000`–`0x1FFFFFFF` | 不缓存 |

来源：MIPS32 特权资源架构规范 Rev 6.02 4.6 节表 4.3、4.10.1.2 节。

- 复位向量为 `0xBFC00000`（物理地址 `0x1FC00000`），位于 KSEG1。EE 与 IOP 复位后都从该地址取指（第 15 章）。
- 外设寄存器以 KSEG1 地址访问，即物理地址加 `0xA0000000`。
- KSEG0 与 KSEG1 访问同一物理地址时互为别名。经 KSEG0 写入的数据可能仍在数据缓存中；在经 KSEG1 读取或启动 DMA 之前，须写回相应的缓存行。

### 2.1.4 EE 与 IOP 的差异

MIPS32 处理器须实现 KUSEG、KSEG0 与 KSEG1；使用 TLB 的处理器还须实现 KSEG3。R5900 与 R3000A 早于 MIPS32，差异如下：

| 项目 | MIPS32 | EE（R5900） | IOP（R3000A） |
|---|---|---|---|
| 运行模式 | 用户、管理、内核 | 用户、管理、内核 | 用户、内核 |
| KSEG0、KSEG1 | 直接映射，KSEG1 不缓存 | 同 MIPS32 | 同 MIPS32 |
| KUSEG | 经 TLB | 经 TLB（48 项） | 无 TLB，物理地址等于虚拟地址 |
| `0xC0000000`–`0xFFFFFFFF` | SSEG 与 KSEG3，经 TLB | 同 MIPS32 | KSEG2，物理地址等于虚拟地址 |
| 地址宽度 | 32 位 | 32 位，寄存器 64 位（[3.1.2 节](/chapters/03-ee-core#_3-1-2-地址宽度)） | 32 位 |

MIPS32 为无 TLB 的处理器定义了可选的固定映射 MMU：Status.ERL = 0 时 KUSEG 加 `0x40000000`，SSEG 与 KSEG3 不变。R3000A 不采用该方式，KUSEG 与 KSEG2 均不加偏移。IOP 的缓存控制寄存器 `0xFFFE0130` 以 KSEG2 地址访问（2.4 节）。

来源：MIPS32 特权资源架构规范 Rev 6.02 4.4 节，附录 A.1 表 A.1。

### 2.1.5 地址转换过程

MIPS32 的虚拟地址按图 2-1 的步骤转换为物理地址。

![图 2-1 MIPS32 虚拟地址转换](/img/fig2-1-addr-translation.svg)

1. 按 VA 第 31:29 位确定所在段（2.1.1 节）。
2. 当前运行模式不能访问该段时，产生地址错误异常，BadVAddr 写入 VA（2.1.2 节）。
3. 非映射段（KSEG0、KSEG1）：PA = VA & `0x1FFFFFFF`。KSEG0 的缓存方式由 Config.K0 决定，KSEG1 不缓存（2.1.3 节）。
4. 映射段（KUSEG、SSEG、KSEG3）：查 TLB，见下文。

**TLB 项**

每个 TLB 项由比较部分与转换部分组成，转换部分有两组，分别对应一对相邻虚拟页中的偶数页与奇数页。各字段与 COP0 寄存器一一对应，由 TLBWI、TLBWR 写入（3.6.1 节）：

| 部分 | 字段 | 来自寄存器 | 说明 |
|---|---|---|---|
| 比较 | VPN2 | EntryHi | 虚拟页号除以 2，一项映射两页 |
| 比较 | ASID | EntryHi | 地址空间标识，区分不同进程 |
| 比较 | G | EntryLo0、EntryLo1 | 全局位，为 1 时不比较 ASID |
| 比较 | Mask | PageMask | 页大小 |
| 转换（偶数页） | PFN0、C0、D0、V0 | EntryLo0 | 物理页号、缓存方式、可写位、有效位 |
| 转换（奇数页） | PFN1、C1、D1、V1 | EntryLo1 | 同上 |

**查找过程**

1. 所有 TLB 项同时比较。项匹配的条件为：VA 的页号与 VPN2 相等，PageMask 屏蔽的位不比较；并且项的 G = 1，或项的 ASID 等于 EntryHi.ASID。
2. 没有匹配项时，产生 TLB 重填异常。
3. 按项的页大小取 VA 的奇偶位，为 0 时选偶数页一组，为 1 时选奇数页一组：

   | 页大小 | 4 KB | 16 KB | 64 KB | 256 KB | 1 MB | 4 MB | 16 MB |
   |---|---|---|---|---|---|---|---|
   | 奇偶位 | 12 | 14 | 16 | 18 | 20 | 22 | 24 |

4. V = 0 时，产生 TLB 无效异常。
5. 写操作且 D = 0 时，产生 TLB 修改异常。
6. PA 由 PFN 与 VA 的页内偏移拼接而成，缓存方式取 C 字段。

**地址转换异常**

| 异常 | 条件 | ExcCode |
|---|---|---|
| 地址错误 | 运行模式不能访问该段 | `0x04` AdEL（取指、读），`0x05` AdES（写） |
| TLB 重填 | 映射段中没有匹配的 TLB 项 | `0x02` TLBL（取指、读），`0x03` TLBS（写） |
| TLB 无效 | 匹配项的 V = 0 | `0x02` TLBL，`0x03` TLBS |
| TLB 修改 | 写操作，匹配项的 D = 0 | `0x01` Mod |

TLB 重填与 TLB 无效使用相同的 ExcCode。Status.EXL = 0 时，TLB 重填进入专用向量（偏移 `0x000`），其余异常进入一般异常向量（偏移 `0x180`），见 3.5.1 节。

来源：MIPS32 特权资源架构规范 Rev 6.02 4.9.1、4.9.2 节（图 4.4）、4.9.4 节。

R5900 按上述过程转换，TLB 有 48 项，页大小为 4 KB～16 MB；TLB 项另有 S 位，用于映射暂存存储器（2.1.7 节）。R3000A 没有 TLB，第 4 步改为 PA = VA（2.1.4 节），不产生 TLB 异常。

### 2.1.6 EE 内核的 TLB 约定

PS2 内核（BIOS 中的 EE 内核）启动后设置固定的 TLB 项，常见约定如下（<Status s="reference" />）：

| 虚拟地址 | 用途 |
|---|---|
| `0x00000000`–`0x01FFFFFF` | 主存，缓存访问 |
| `0x20000000`–`0x21FFFFFF` | 主存，不缓存访问 |
| `0x30000000`–`0x31FFFFFF` | 主存，不缓存加速（uncached accelerated）访问 |
| `0x70000000`–`0x70003FFF` | 暂存存储器 SPR |

上述地址均在 KUSEG 中，缓存方式由 TLB 项的 C 位决定。

### 2.1.7 暂存存储器

暂存存储器（Scratchpad RAM，SPR）是 EE 核心内 16 KB 的高速 SRAM，**不在物理地址空间中**。它只能通过 S 位为 1 的 TLB 项访问：TLB 项的 S 位置 1 时，该页映射到 SPR，忽略 PFN。DMAC 通道 8（fromSPR）与通道 9（toSPR）用 SADR 寄存器寻址 SPR（第 6 章）。

## 2.2 EE 物理地址空间

![图 2-2 EE 物理地址空间](/img/memmap-ee-physical.svg)

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

![图 2-3 EE 寄存器区](/img/memmap-ee-registers.svg)

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

![图 2-4 IOP 物理地址空间](/img/memmap-iop-physical.svg)

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

## 2.7 来源

- MIPS32 特权资源架构（Privileged Resource Architecture）规范 Rev 6.02：4.2～4.7 节（分段、访问权限、KSEG0 与 KSEG1 的地址转换与缓存方式、ERL = 1 时的 KUSEG），4.9 节与图 4.4（TLB 项与地址转换），4.10.1.2 节（复位向量），附录 A.1 与表 A.1（固定映射 MMU）。
- 物理地址空间、寄存器区与 SBUS 窗口的来源见 `hw/mips/ps2.c`、`hw/mips/ps2_ee.c`、`hw/mips/ps2_iop.c` 与 qtest `ps2/memory-map`、`ps2/sbus`。
