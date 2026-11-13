# 第 8 章 图形接口 GIF

图形接口 GIF（Graphics Interface）位于 EE 与 GS 之间，GS 一般寄存器只能经 GIF 写入。GIF 从三条路径（PATH1、PATH2、PATH3）接收 GIF 数据包，按数据包中 GIFtag 的描述，把数据拆成一系列“寄存器地址 + 64 位数据”的写操作，经 64 位总线送往 GS。GS 的特权寄存器（PMODE、DISPLAY、CSR 等）不经过 GIF，直接映射在 EE 地址 `0x12000000` 起（第 9 章）。

## 8.1 概述

GIF 的三条输入路径分别来自 VU1、VIF1 和 DMAC 通道 2（图 8-1）。同一时刻只有一条路径向 GS 输出；一个数据包传完后，GIF 在有请求的路径中按优先级选择下一条。

![图 8-1 GIF 的三条 PATH](/img/fig8-1-gif-paths.svg)

主要特性：

- 三条输入路径，固定优先级 PATH1 > PATH2 > PATH3，在数据包边界切换；
- 数据以 GIF 数据包为单位，数据包由一个或多个图元组成，每个图元以 128 位的 GIFtag 开头；
- 三种数据格式：PACKED（每个寄存器一个四字）、REGLIST（每个寄存器一个双字）、IMAGE（图像数据直接送往 HWREG）；
- PACKED 模式下的 A+D 描述符可以写任意 GS 一般寄存器；
- PATH3 带 16 个四字的 GIF FIFO，可由 GIF_MODE.M3R 或 VIF1 的 MSKPATH3 VIFcode 屏蔽；
- 间歇传输模式（GIF_MODE.IMT）允许 PATH1、PATH2 插入正在进行的 PATH3 图像传输。

### 8.1.1 三条 PATH

**表 8-1 GIF 的输入路径**

| 路径 | 数据来源 | 启动方式 | 优先级 | QEMU |
|---|---|---|---|---|
| PATH1 | VU1 数据存储器 | VU1 微程序执行 XGKICK 指令，操作数（VI 寄存器）给出数据包在 VU1 数据存储器中的四字地址 | 最高 | <Status s="verified" /> |
| PATH2 | VIF1 | VIF1 处理 DIRECT 或 DIRECTHL VIFcode，把其后的若干四字送往 GIF | 中 | <Status s="verified" /> |
| PATH3 | 主存，经 DMAC 通道 2；或 R5900 直接写 GIF FIFO | 启动 DMAC 通道 2（`0x1000A000`，第 6 章）；或用 SQ 指令写 GIF FIFO 窗口 `0x10006000` | 最低 | GIF FIFO 直写：<Status s="verified" />；经 DMAC 通道 2：<Status s="reference" />（QEMU 已实现，但没有测试覆盖） |

三条路径的常见分工是：PATH1 送出 VU1 计算得到的顶点数据，VU1 微程序在数据存储器中组好数据包后用 XGKICK 送出，无需 EE 干预；PATH2 送出随 VIF1 数据流一起下发的 GS 设置；PATH3 送出主存中预先准备好的数据，尤其是纹理图像。

PATH1 与 PATH2 没有缓冲，数据直接进入 GIF；PATH3 的数据先进入 GIF FIFO，GIF_STAT.FQC 给出 FIFO 中的四字数（ps2tek §GIF PATH3 Masking）。

### 8.1.2 PATH 仲裁 <Status s="reference" />

GIF 同一时刻只处理一条路径的数据。正在输出的路径反映在 GIF_STAT.APATH 中，等待中的路径反映在 P1Q、P2Q、P3Q 中。仲裁规则如下（ps2tek §Graphics Interface (GIF)；PCSX2 pcsx2/Gif_Unit.h:793–815）：

1. 一条路径开始传送一个数据包后，一直传到 EOP = 1 的图元结束，期间不切换到其他路径；
2. 当前数据包结束时，若 PATH1 有请求则选择 PATH1，否则若 PATH2 有请求则选择 PATH2，否则若 PATH3 有请求且未被屏蔽则选择 PATH3；
3. 没有请求时 GIF 空闲，APATH = 0，OPH = 0。

例外是间歇传输模式：GIF_MODE.IMT = 1 且 PATH3 正在传送 IMAGE 数据时，PATH1 或 PATH2（DIRECT）的请求可以在 PATH3 图像数据中途插入，GIF_STAT.IP3 置 1，插入的数据包结束后 PATH3 从中断处继续（PCSX2 pcsx2/Gif_Unit.h:759–766、878）。DIRECTHL 与 DIRECT 的区别在于 DIRECTHL 不插入正在进行的 PATH3 图像传输（PCSX2 pcsx2/Gif_Unit.h:863–871）。

::: warning
ps2tek 指出：PATH1 运行期间不要在 PATH3 上使用 A+D 描述符，否则 GS 可能死锁。
:::

<Status s="unimplemented" /> QEMU 不模拟仲裁：每条路径的数据在产生时立即送入同一个包解析器（见 8.9 节）。

## 8.2 数据包与 GIFtag

GIF 传送的基本单位是 **GIF 数据包**（GIF packet）。一个数据包由一个或多个**图元**（primitive）组成，每个图元以一个 GIFtag 开头，后面跟随该图元的数据；最后一个图元的 GIFtag 中 EOP = 1。GIFtag 和数据都按四字（128 位）对齐。

![图 8-2 GIFtag 位域与 PACKED 数据包示例](/img/fig8-2-giftag.svg)

GIFtag 的位域见 8.7 节的 [GIFtag](#giftag)。低 64 位是控制信息：

- **NLOOP**：循环次数。PACKED/REGLIST 模式下，一次循环依次使用 REGS 中的前 NREG 个描述符；IMAGE 模式下为数据的四字数。
- **EOP**：为 1 表示本图元是数据包的最后一个。GIF 只在 EOP 处切换路径。
- **PRE / PRIM**：PRE = 1 时，GIF 在处理数据之前先把 PRIM 位域写入 GS 的 PRIM 寄存器，省去一个 PRIM 描述符。只在 PACKED 模式下有效（PCSX2 pcsx2/GS/GSState.cpp:3380；QEMU 相同）。
- **FLG**：数据格式，0 为 PACKED，1 为 REGLIST，2 和 3 为 IMAGE。
- **NREG**：每次循环使用的描述符个数，1–15，0 表示 16。

高 64 位 REGS 为 16 个 4 位寄存器描述符，第 67:64 位为 REGS0，最先使用。

图元数据的长度（不含 GIFtag，单位为四字）由 FLG 决定（表 8-2）。

**表 8-2 图元数据长度**

| FLG | 格式 | 数据长度（四字） |
|---|---|---|
| 0 | PACKED | NLOOP × NREG |
| 1 | REGLIST | ⌈NLOOP × NREG / 2⌉ |
| 2、3 | IMAGE | NLOOP |

处理规则：

- NLOOP = 0 时，该 GIFtag 不带数据，除 EOP 外其余位域都被忽略，下一个四字仍是 GIFtag。因此 NLOOP = 0、EOP = 1 的 GIFtag 可以用来结束一个数据包。
- 每读入一个 GIFtag，GS 内部供 RGBAQ 使用的 Q 值复位为 1.0（ps2tek §GIFtags）。
- GIF 数据包本身没有总长度字段：PATH1 由 XGKICK 从起始地址开始逐个解析 GIFtag，直到 EOP；PATH2、PATH3 的长度由 VIFcode 或 DMA 传输给出，与数据包边界无关。

## 8.3 数据格式

### 8.3.1 PACKED

每个描述符对应一个四字。描述符为 0x0–0xD 时，GIF 按表 8-3 的格式从四字中取出各分量，组合成对应 GS 寄存器的 64 位值；描述符为 0xE（A+D）时，四字本身给出寄存器地址和数据；为 0xF（NOP）时不输出。PACKED 格式中颜色、坐标等分量各占一个 32 位字，便于 VU1 直接用向量寄存器生成，代价是数据量较大。

### 8.3.2 REGLIST

每个描述符对应一个双字（64 位），一个四字装两个：低 64 位对应先处理的描述符，高 64 位对应下一个。此时描述符就是 GS 寄存器地址 0x00–0x0F，数据原样写入，不做 PACKED 的格式转换。NLOOP × NREG 为奇数时，最后一个四字的高 64 位被丢弃。REGLIST 的数据密度是 PACKED 的两倍，适合 EE 一侧已按 GS 寄存器格式准备好的数据。

QEMU 中 REGLIST 模式遇到描述符 0xE、0xF 时，跳过对应的双字，不写 GS。

### 8.3.3 IMAGE

IMAGE 模式不使用描述符，NLOOP 个四字的数据全部送往 GS 的 HWREG 寄存器（每个四字相当于两次 64 位写入），用于主机 → 本地存储器的图像传输。传输前应先用 A+D 设置 BITBLTBUF、TRXPOS、TRXREG，并写 TRXDIR = 0 启动主机 → 本地传输（第 9 章）。

QEMU 中，若当前没有进行中的主机 → 本地传输，IMAGE 数据被丢弃并记录 LOG_GUEST_ERROR。

## 8.4 PACKED 模式寄存器描述符

表 8-3 列出 PACKED 模式下各描述符的含义与四字中各分量的位置，“写入的 GS 寄存器”一列括号中为 GS 寄存器地址。

**表 8-3 PACKED 模式寄存器描述符**

| 描述符 | 名称 | 写入的 GS 寄存器 | 四字中的数据格式 |
|---|---|---|---|
| 0x0 | PRIM | PRIM（0x00） | 第 10:0 位为 PRIM 值，其余位不用 |
| 0x1 | RGBAQ | RGBAQ（0x01） | R 第 7:0 位，G 第 39:32 位，B 第 71:64 位，A 第 103:96 位；Q 取最近一次 ST 描述符给出的值（GIFtag 之后初值为 1.0） |
| 0x2 | ST | ST（0x02） | S 第 31:0 位，T 第 63:32 位，Q 第 95:64 位，均为单精度浮点数。S、T 写入 ST，Q 暂存，供其后的 RGBAQ 使用 |
| 0x3 | UV | UV（0x03） | U 第 13:0 位，V 第 45:32 位（14 位无符号定点数，4 位小数） |
| 0x4 | XYZF2 | XYZF2（0x04）或 XYZF3（0x0C） | X 第 15:0 位，Y 第 47:32 位，Z 第 91:68 位（24 位），F 第 107:100 位（8 位），ADC 第 111 位 |
| 0x5 | XYZ2 | XYZ2（0x05）或 XYZ3（0x0D） | X 第 15:0 位，Y 第 47:32 位，Z 第 95:64 位（32 位），ADC 第 111 位 |
| 0x6 | TEX0_1 | TEX0_1（0x06） | 低 64 位原样写入 |
| 0x7 | TEX0_2 | TEX0_2（0x07） | 低 64 位原样写入 |
| 0x8 | CLAMP_1 | CLAMP_1（0x08） | 低 64 位原样写入 |
| 0x9 | CLAMP_2 | CLAMP_2（0x09） | 低 64 位原样写入 |
| 0xA | FOG | FOG（0x0A） | F 第 107:100 位，写入 FOG 寄存器的第 63:56 位 |
| 0xB | 保留 | — | 不应使用。QEMU 把低 64 位写入 GS 地址 0x0B |
| 0xC | XYZF3 | XYZF3（0x0C） | 格式同 0x4，总是写入 XYZF3 |
| 0xD | XYZ3 | XYZ3（0x0D） | 格式同 0x5，总是写入 XYZ3 |
| 0xE | A+D | 由第 71:64 位指定 | 第 63:0 位为数据，第 71:64 位为 GS 寄存器地址 |
| 0xF | NOP | 不写入 | 数据被丢弃 |

说明：

- X、Y 为 16 位定点数，含 4 位小数。
- ADC（第 111 位）为 1 时，XYZF2、XYZ2 描述符的数据改为写入 XYZF3、XYZ3，即顶点进入 GS 顶点队列但不触发绘制（ps2tek §GIF Data Formats）。
- 0x6–0x9 以外的 GS 寄存器（如 TEX1、ALPHA、FRAME、TRXDIR 等）在 PACKED 模式下只能经 A+D 写入。
- 各分量的位置在 ps2tek §GIF Data Formats、PCSX2 pcsx2/GS/GSRegs.h:1007–1074 与 QEMU `ps2_gs_write_packed()` 中一致。

### 8.4.1 A+D

A+D（Address + Data）描述符使 PACKED 数据包可以写任意 GS 一般寄存器：四字的低 64 位为数据，第 71:64 位为寄存器地址，其余位不用。只含一个 A+D 描述符的 GIFtag 最为常用：

```
GIFtag 低 64 位 = NLOOP | (EOP << 15) | (1 << 60)     ; FLG = 0，NREG = 1
GIFtag 高 64 位 = 0x000000000000000E                   ; REGS0 = A+D
数据四字 i      = 低 64 位：寄存器值；高 64 位：寄存器地址
```

GS 的 SIGNAL（0x60）、FINISH（0x61）、LABEL（0x62）等事件寄存器也经 A+D 写入，写入后 GS 在 CSR 中置对应事件位，并可产生中断（第 9 章）。

## 8.5 PATH3 屏蔽与间歇模式 <Status s="reference" />

PATH3 可以被两种方式屏蔽：

- **GIF_MODE.M3R = 1**：由 EE 程序设定，状态反映在 GIF_STAT.M3R；
- **VIF1 的 MSKPATH3 VIFcode**：VIFcode 第 15 位为 1 时屏蔽、为 0 时解除，状态反映在 GIF_STAT.M3P（PCSX2 pcsx2/Vif_Codes.cpp:515–516）。MSKPATH3 在 VIF1 数据流中执行，因此可以与 PATH2、PATH1 的数据同步。

屏蔽只阻止尚未开始的 PATH3 数据包，正在传送的 PATH3 数据包会继续传到结束（PCSX2 pcsx2/Gif_Unit.h:880–881；ps2tek §GIF I/O）。屏蔽期间 DMAC 送来的数据留在 GIF FIFO 中，FIFO 满后通道 2 无法继续写入。典型用法是让 PATH3 预先把纹理数据送入 FIFO 排队，待 PATH1 的几何数据告一段落后再解除屏蔽（ps2tek §GIF PATH3 Masking）。

**间歇模式**（GIF_MODE.IMT = 1）只影响 PATH3 的 IMAGE 数据：PATH1、PATH2 可以在图像数据中途插入（8.1.2 节）。IMT = 0 时，大块纹理传输期间 PATH1 必须等待整个 PATH3 数据包结束。

<Status s="unimplemented" /> QEMU 中 M3R、IMT 只保存，MSKPATH3 按空操作处理，PATH3 从不被屏蔽或切分。

## 8.6 寄存器汇总

<RegSummary block="gif" />

GIFtag 不是寄存器，没有总线地址，这里按寄存器的格式列出，便于查阅位域：

<RegSummary block="giftag" />

## 8.7 寄存器说明

### GIF_CTRL
<Reg block="gif" name="GIF_CTRL" />

### GIF_MODE
<Reg block="gif" name="GIF_MODE" />

### GIF_STAT
<Reg block="gif" name="GIF_STAT" />

### GIF_TAG0
<Reg block="gif" name="GIF_TAG0" />

### GIF_TAG1
<Reg block="gif" name="GIF_TAG1" />

### GIF_TAG2
<Reg block="gif" name="GIF_TAG2" />

### GIF_TAG3
<Reg block="gif" name="GIF_TAG3" />

### GIF_CNT
<Reg block="gif" name="GIF_CNT" />

### GIF_P3CNT
<Reg block="gif" name="GIF_P3CNT" />

### GIF_P3TAG
<Reg block="gif" name="GIF_P3TAG" />

### GIF_FIFO
<Reg block="gif" name="GIF_FIFO" />

### GIFtag
<Reg block="giftag" name="GIFtag" />

## 8.8 编程要点

### 8.8.1 初始化

1. 写 GIF_CTRL（`0x10003000`）= `0x00000001`，复位 GIF，丢弃未完成的数据包。
2. 写 GIF_MODE（`0x10003010`）= `0x00000000`：不屏蔽 PATH3，使用连续传输模式。
3. 确认 DMAC 通道 2 空闲（D2_CHCR.STR = 0），VIF1 与 VU1 没有正在发送的数据。

### 8.8.2 经 GIF FIFO 写 GS 寄存器

以下步骤用 A+D 写 GS 的 FINISH 寄存器，再从 GS CSR 读出 FINISH 事件，与 QEMU qtest `ps2/gif` 的做法相同。程序经 KSEG1 访问时 FIFO 地址写作 `0xB0006000`。

1. 写 GIFtag：用 SQ 把一个四字写到 `0x10006000`，低 64 位 = `0x1000000000008001`（NLOOP = 1，EOP = 1，FLG = 0，NREG = 1），高 64 位 = `0x000000000000000E`（REGS0 = A+D）。
2. 写数据：用 SQ 把一个四字写到 `0x10006000`，低 64 位 = 0（FINISH 的值不重要），高 64 位 = `0x0000000000000061`（FINISH 的地址）。
3. 读 GS CSR（`0x12001000`），第 1 位 FINISH 为 1 表示前面的数据已经处理完；向该位写 1 清除。

每个四字必须用 SQ 写入，或者按先低 64 位、后高 64 位的顺序用两次 SD 写入。QEMU 只按到达顺序拼接字节，不检查地址（8.9 节）。

### 8.8.3 经 DMAC 通道 2 发送

在主存中准备好 GIF 数据包（可用 DMAtag 链表组织多个数据包），按第 6 章 6.8.2 节的步骤启动通道 2。GIF 通道一般应使 D2_CHCR.TTE = 0，否则 DMAtag 的高 64 位会被 GIF 当作数据。一个数据包可以跨越多个 DMA 数据块，GIF 只按 GIFtag 解析数据流。

### 8.8.4 主机 → 本地图像传输

1. 用一个 A+D 数据包（NLOOP = 4）依次写 BITBLTBUF（0x50，目的缓冲区基址、宽度与像素格式）、TRXPOS（0x51，目的坐标）、TRXREG（0x52，宽、高）、TRXDIR（0x53）= 0。
2. 发送一个 IMAGE GIFtag：FLG = 2，NLOOP = 图像字节数 / 16，EOP = 1。
3. 紧接着发送 NLOOP 个四字的像素数据。

纹理图像通常经 PATH3 发送；需要与 PATH1 并行时可置 GIF_MODE.IMT = 1，使 PATH1 能在图像传输中途插入（8.5 节）。

### 8.8.5 等待 GIF 空闲

在真实硬件上，修改 GS 设置或修改正在被 GIF 读取的存储器之前，应等待 GIF 空闲：读 GIF_STAT，直到 APATH = 0 且 FQC = 0；也可以在数据包末尾写 FINISH，等待 GS CSR.FINISH 置 1。<Status s="unimplemented" /> QEMU 中 GIF_STAT 读出恒为 0，传输在写入时立即完成，两种方法都会立即结束；FINISH 的方法在真实硬件和 QEMU 上行为一致，可移植性更好。

## 8.9 QEMU 模型说明

QEMU 中 GIF 不是独立设备，而是 `hw/display/ps2_gs.c` 中 `ps2-gs` 设备的一部分：第 1 个 MMIO 区 `ps2-gs-gif` 映射在 `0x10003000`（窗口 `0x100`），第 2 个 MMIO 区 `ps2-gs-gif-fifo` 映射在 `0x10006000`（窗口 `0x1000`），映射由 `hw/mips/ps2_ee.c` 完成。两个窗口都只接受 4–8 字节的访问。三条路径都调用 `ps2_gs_gif_write()`：

- PATH1：`hw/display/ps2_vu1.c` 的 XGKICK 回调先从起始地址逐个解析 GIFtag 直到 EOP，算出总长度，再一次送出全部数据；地址在 VU1 数据存储器末尾回绕；
- PATH2：VIF1 的 DIRECT/DIRECTHL 数据逐字送出；
- PATH3：DMAC 通道 2 的数据块，以及 GIF FIFO 窗口的每次写入。

相关 qtest：`ps2/gif`（FIFO 上的 A+D、XGKICK 回绕、1023/1024 四字边界、PACKED/REGLIST/IMAGE 数据长度、主机 → 本地图像传输）。

已模拟：

| 功能 | 说明 |
|---|---|
| GIFtag 解析 | NLOOP、FLG、NREG（0 表示 16）、REGS；PACKED 模式下的 PRE/PRIM；每个 GIFtag 把 Q 复位为 1.0；FLG = 3 按 IMAGE 处理 |
| PACKED | 表 8-3 中全部描述符，包括 ADC 位、A+D、NOP |
| REGLIST | 每个四字两个寄存器，个数为奇数时丢弃最后一个双字；描述符 0xE、0xF 跳过 |
| IMAGE | 数据送入进行中的主机 → 本地传输；没有传输时丢弃并记录 LOG_GUEST_ERROR |
| GIF_CTRL.RST | 丢弃当前 GIFtag 的剩余计数和未凑满的四字，结束 GS 的主机 ⇄ 本地传输 |
| XGKICK | 解析到 EOP，在 VU1 数据存储器末尾回绕；总长度达到 1024 个四字时整个 XGKICK 被丢弃并记录 LOG_GUEST_ERROR（与 PCSX2 对 BIOS 的处理相同） |
| GIF FIFO | 任意偏移的 4/8 字节写入按到达顺序拼成四字；SQ 的低、高 64 位顺序正确 |

未模拟或与硬件不同：

| 功能 | 说明 |
|---|---|
| PATH 仲裁 | 没有优先级、排队和数据包边界切换，各路径的数据在产生时立即解析。三条路径共用一个解析器状态和一个未凑满的四字缓冲：若一条路径在数据包中途停下（例如 FIFO 只写了半个四字，或 DMA 在图元中间结束），另一条路径的数据会接在后面解析 |
| 时序 | 传输不耗时，写入即完成 |
| PATH3 屏蔽 | GIF_MODE.M3R 只保存，VIF1 的 MSKPATH3 按空操作处理 |
| 间歇模式 | GIF_MODE.IMT 只保存，PATH3 不会被切分 |
| GIF_CTRL.PSE | 只保存，不暂停传输 |
| GIF_STAT | 读出恒为 0；写入被忽略并记录 LOG_UNIMP |
| GIF_TAG0–3、GIF_CNT、GIF_P3CNT、GIF_P3TAG | 不解码，读出为 0 并记录 LOG_UNIMP |
| GIF FIFO | 没有 16 个四字的深度限制，不会使 DMAC 反压；读 FIFO 返回 0 并记录 LOG_GUEST_ERROR；不采用 PCSX2 把 32/64 位写入扩展为补零四字的做法 |
| 传输方向 | GIF_STAT.DIR 不反映 GS → EE 方向的传输 |
| 迁移 | 已知问题 G-R3-1：复位后 GIF 的 NREG 计数为 0，`ps2_gs_post_load()` 的检查会拒绝空闲 GIF 的状态，`-M ps2` 的迁移流无法加载 |

## 8.10 来源

- QEMU `include/hw/display/ps2_gs.h`、`hw/display/ps2_gs.c`（`ps2_gs_gif_qword`、`ps2_gs_write_packed`、`ps2_gif_read`、`ps2_gif_write`、`ps2_gif_fifo_write`）、`hw/display/ps2_vu1.c`（`vu1_xgkick`、`vu1_direct`）、`hw/mips/ps2_ee.c`、`tests/qtest/ps2-test.c`（`test_gif`）
- PCSX2 pcsx2/Gif.h:85–271（GIF 寄存器位域）、pcsx2/Hw.h:113–122（寄存器地址）、pcsx2/Gif_Unit.h:27–101（GIFtag 与数据长度）、pcsx2/Gif_Unit.h:737–881（仲裁与屏蔽）、pcsx2/GS/GSRegs.h:48–65（描述符）、pcsx2/GS/GSRegs.h:1007–1074（PACKED 格式）、pcsx2/GS/GSState.cpp:3365–3381（GIFtag 处理）、pcsx2/HwWrite.cpp:90–117（GIF_CTRL、GIF_MODE 写入）、pcsx2/Vif_Codes.cpp:510–523（MSKPATH3）
- ps2tek §Graphics Interface (GIF)、§GIF I/O、§GIFtags、§GIF Data Formats、§GIF PATH3 Masking
