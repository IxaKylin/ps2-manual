# 第 7 章 向量处理单元 VPU

EE 中有两个向量处理单元（Vector Processing Unit，VPU）：VPU0 与 VPU1。每个 VPU 由一个向量单元（Vector Unit，VU）和一个向量单元接口（VIF）组成。VU 是专用的 SIMD 浮点处理器，一条指令同时处理 4 个单精度浮点数（x、y、z、w），用于坐标变换、光照、裁剪等几何计算；VIF 是 VU 的 DMA 接口，负责把微程序装入 VU 的微程序存储器、把压缩的顶点数据解压后写入 VU 的数据存储器，并启动微程序。VPU1 还可以经 GIF 直接向 GS 送出图形数据。

## 7.1 概述

图 7-1 是两个 VPU 的内部结构与外部连接。

![图 7-1 VPU0 与 VPU1 的内部结构](/img/fig7-1-vpu.svg)

两个 VU 的指令集与寄存器结构基本相同，差别在于存储器大小、可用的功能单元以及与 EE 其他部分的连接方式：

- **VU0** 紧挨着 R5900，作为 R5900 的协处理器 2（COP2）。R5900 可以用 COP2 指令直接执行 VU0 的运算（宏模式），也可以让 VU0 独立运行微程序（微模式）。VU0 通常用来分担 R5900 的向量计算，例如物理、动画、矩阵运算。
- **VU1** 只能以微模式工作，靠 VIF1 送来数据和启动命令。它有 EFU（初等函数单元），并能用 XGKICK 指令把数据存储器中的 GIF 数据包经 PATH1 直接送往 GIF，因此通常承担主要的几何处理：VIF1 送入顶点，VU1 变换、裁剪后生成 GS 绘图命令，再由 XGKICK 送出。

**表 7-1 VPU0 与 VPU1 对比**

| 项目 | VPU0（VU0 + VIF0） | VPU1（VU1 + VIF1） |
|---|---|---|
| 微程序存储器 | 4 KB（512 个指令对） | 16 KB（2048 个指令对） |
| 数据存储器 | 4 KB（256 个四字） | 16 KB（1024 个四字） |
| 工作模式 | 宏模式（COP2）与微模式 | 仅微模式 |
| EFU 与 P 寄存器 | 无 | 有 |
| 向 GIF 输出 | 无 | XGKICK（PATH1）；VIF1 的 DIRECT/DIRECTHL（PATH2） |
| 微程序启动方式 | VIF0 的 MSCAL/MSCNT；R5900 的 VCALLMS/VCALLMSR | VIF1 的 MSCAL/MSCALF/MSCNT；R5900 经 CTC2 写 CMSAR1 |
| VIF FIFO 深度 | 8 个四字 | 16 个四字 |
| VIF 双缓冲（BASE/OFST/TOPS/TOP） | 无 | 有 |
| VIF 专有 VIFcode | — | OFFSET、BASE、MSKPATH3、FLUSH、FLUSHA、MSCALF、DIRECT、DIRECTHL |
| DMAC 通道 | 通道 0，存储器 → VIF0 | 通道 1，双向（D1_CHCR.DIR） |
| INTC 中断源 | 4（VIF0）、6（VU0）、14（VU0 看门狗） | 5（VIF1）、7（VU1） |

MSCALF 在 ps2tek 中列为 VIF1 专有；QEMU 在 VIF0 上也照常执行 MSCALF（7.10 节）。INTC 的 VIF/VU 中断源见第 4 章，QEMU 均未接线 <Status s="unimplemented" />。

### 7.1.1 存储器地址

VU 的微程序存储器与数据存储器都映射在 EE 物理地址空间中，R5900 和 DMAC 可以直接读写。VU 运行微程序时，EE 一侧不应访问其存储器。

**表 7-2 VU 存储器的 EE 地址**

| 地址 | 窗口 | 内容 | 状态 |
|---|---|---|---|
| `0x11000000`–`0x11003FFF` | 16 KB | VU0 微程序存储器，4 KB，在窗口中重复 4 次 | <Status s="verified" /> |
| `0x11004000`–`0x11007FFF` | 16 KB | VU0 数据存储器，4 KB，在窗口中重复 4 次 | <Status s="verified" /> |
| `0x11008000`–`0x1100BFFF` | 16 KB | VU1 微程序存储器 | <Status s="verified" /> |
| `0x1100C000`–`0x1100FFFF` | 16 KB | VU1 数据存储器 | <Status s="verified" /> |

VU 内部用另一种地址：微程序地址以指令对（8 字节）为单位，数据地址以四字（16 字节）为单位。例如 MSCAL 的 IMMEDIATE = 0x10 表示从微程序存储器字节偏移 0x80 处开始执行；UNPACK 的 ADDR = 0x20 表示数据存储器字节偏移 0x200。

VU0 的微程序在数据地址第 10 位为 1 时（字节地址 `0x4000` 起）访问到的不是数据存储器，而是 VU1 的寄存器：四字地址 `0x400`–`0x41F` 对应 VU1 的 VF00–VF31，`0x420`–`0x43F` 对应 VU1 编号 0–31 的 VI 与控制寄存器（每个寄存器占一个四字，只有 x 字段有效）。这是 VU0 微程序读取 VU1 状态的途径。<Status s="verified" />

### 7.1.2 数据通路

- **VIF0/VIF1 → VU 存储器**：MPG 写微程序存储器，UNPACK 解压后写数据存储器，STROW/STCOL/STMASK 等设置解压参数（7.4、7.5 节）。
- **R5900 ↔ VU0**：COP2 指令在 R5900 的 GPR 与 VU0 的 VF/VI/控制寄存器之间传送数据（QMFC2/QMTC2/CFC2/CTC2），或者在主存与 VF 之间直接装入 / 存储（LQC2/SQC2）。
- **VU1 → GIF**：XGKICK 从 VU1 数据存储器中取 GIF 数据包，经 PATH1 送 GIF；VIF1 的 DIRECT/DIRECTHL 把数据流中的 GIF 数据包经 PATH2 送 GIF。GIF 的 PATH3 来自 DMAC 通道 2（第 8 章）。
- **GS → 主存**：GS 本地存储器到主存的传输（local → host）经 VIF1 反方向传送，由 DMAC 通道 1 以 DIR = 0 完成。

## 7.2 VU 体系结构

### 7.2.1 寄存器

每个 VU 有以下寄存器（表 7-3）。R5900 经 CFC2/CTC2 用寄存器编号 0–31 访问 VU0 的 VI 寄存器与控制寄存器，编号见 7.7 节汇总表；VF 寄存器经 QMFC2/QMTC2 访问。

**表 7-3 VU 寄存器**

| 寄存器 | 数量 × 位宽 | 说明 |
|---|---|---|
| VF00–VF31 | 32 × 128 位 | 浮点向量寄存器，每个由 x、y、z、w 四个单精度浮点字段组成（x 在低 32 位）。VF00 固定为 (0.0, 0.0, 0.0, 1.0)，写入无效 |
| VI00–VI15 | 16 × 16 位 | 整数寄存器，用于地址、循环计数、分支。VI00 固定为 0 |
| ACC | 1 × 128 位 | 累加器，格式同 VF。MADD、MSUB、OPMULA 等指令以它为中间结果 |
| I | 32 位 | 立即数浮点寄存器，由上部指令的 I 位装入 |
| Q | 32 位 | FDIV（DIV、SQRT、RSQRT）的结果 |
| P | 32 位 | EFU 的结果，仅 VU1 |
| R | 32 位 | 随机数寄存器，值在 [1.0, 2.0) 之间 |
| STATUS、MAC、CLIP | 12 / 16 / 24 位 | 状态标志、MAC 标志、裁剪标志（7.2.5 节） |
| TPC | 16 位 | 微程序结束后的程序计数器（指令对地址） |

另有几个用于控制两个 VU 的寄存器，只能由 R5900 经 CFC2/CTC2 访问：CMSAR0（VCALLMSR 的起始地址）、FBRST（强制中止、复位与调试允许）、VPU_STAT（两个 VU 的运行状态），以及写入即启动 VU1 的 CMSAR1。

### 7.2.2 指令对

VU 的微指令为 64 位，由两条 32 位指令组成一个指令对：低 32 位为下部指令，高 32 位为上部指令。两条指令同时发射，分别由上部、下部执行单元执行。

- **上部指令**主要是浮点向量运算：ADD、SUB、MUL、MADD、MSUB、MAX、MINI 以及带广播字段（bc）、I、Q 后缀的变体，ITOF/FTOI 定点转换，ABS，OPMULA/OPMSUB（外积），CLIP。每条上部指令用 4 位 dest 字段选择要写入的 x、y、z、w 字段，4 个 FMAC 并行运算。
- **下部指令**包括 VU 数据存储器的装入 / 存储（LQ、SQ、LQI、SQD、ILW、ISW 等）、整数运算（IADD、IADDI、IAND 等）、分支与跳转（B、BAL、IBEQ、JR 等，带一个延迟槽）、FDIV 指令（DIV、SQRT、RSQRT、WAITQ）、标志检查（FSAND、FMAND、FCAND 等）、随机数（RINIT、RNEXT 等）、寄存器传送（MOVE、MR32、MTIR、MFIR），以及 VU1 专有的 EFU 指令、MFP、WAITP、XGKICK、XTOP、XITOP。

上部指令的最高 5 位为控制位：

- 第 31 位 **I**：本指令对的下部 32 位不作为指令执行，而作为浮点数装入 I 寄存器。<Status s="verified" />
- 第 30 位 **E**：微程序结束。E 位所在指令对之后的一个指令对（延迟槽）仍会执行，然后 VU 停止，TPC 指向下一个指令对。<Status s="verified" />
- 第 29 位 **M**：仅 VU0，解除 R5900 一侧 QMTC2.I/CTC2.I 的互锁。<Status s="unimplemented" />
- 第 28 位 **D**、第 27 位 **T**：调试中止。FBRST 中对应的 DE/TE 为 1 时，VU 停止并向 INTC 申请中断，VPU_STAT 记录停止原因。<Status s="unimplemented" />

同一指令对中，上部指令读到的是下部指令执行之前的寄存器值。<Status s="verified" />

### 7.2.3 执行单元与延迟

| 单元 | 所在 | 用途 | 延迟（ps2tek） |
|---|---|---|---|
| FMAC × 4 | 上部 | 浮点乘加，每个字段一个 | 结果与标志在写回级更新，标志延迟 4 个周期 |
| FDIV | 下部 | DIV、SQRT、RSQRT，结果写 Q | DIV/SQRT 7 个周期，RSQRT 13 个周期 |
| EFU | 下部，仅 VU1 | ESADD、ERSADD、ELENG、ERLENG、EATAN、EATANxy、EATANxz、ESUM、ESQRT、ERSQRT、ERCPR、ESIN、EEXP，结果写 P | 11–54 个周期，因指令而异 |
| 整数单元 | 下部 | 整数运算、分支 | 1 个周期 |

硬件流水线暴露给程序：读 Q、P 时不检查是否就绪，FDIV/EFU 尚未完成时读到旧值，需要用 WAITQ/WAITP 等待；FMAC 之间的寄存器相关会引起停顿（ps2tek §VU Pipelining）。QEMU 不模拟周期与停顿，只按指令对计数模拟 Q（7/13 个指令对）与 P（统一 12 个指令对）的延迟（7.10 节）。

### 7.2.4 浮点格式

VU 使用 IEEE 754 单精度格式，但不支持无穷大、NaN 和非规格化数。QEMU 的处理方式为：指数为 0 的数按 ±0 处理，指数为 255 的数按绝对值最大的规格化数（`0x7F7FFFFF`，带原符号）处理，结果溢出时同样钳位到最大值 <Status s="verified" />。硬件在舍入方式等细节上与此不同，QEMU 未做模拟。

### 7.2.5 标志

FMAC 运算的结果产生 MAC 标志：每个字段 4 位（零 Z、符号 S、下溢 U、上溢 O），共 16 位。STATUS 的低 6 位汇总 MAC 标志并加上 FDIV 的无效运算（I）与除零（D）标志，高 6 位为它们的累积标志。CLIP 指令把 x、y、z 与 ±|w| 比较，结果按 6 位一组移入 24 位的 CLIP 标志，保留最近 4 次判定，常用于三角形的视锥裁剪。各位定义见 7.8 节 [STATUS](#status)、[MAC](#mac)、[CLIP](#clip)。

QEMU 只产生 Z、S 两类标志及其累积标志；U、O、I、D 不产生 <Status s="unimplemented" />。

## 7.3 微模式与宏模式

**宏模式**（macro mode）只适用于 VU0。R5900 把 VU0 当作 COP2，在自己的指令流中执行 VU0 的运算：

| 指令 | 作用 |
|---|---|
| QMFC2 / QMTC2 | 在 R5900 的 128 位 GPR 与 VF 寄存器之间传送 |
| CFC2 / CTC2 | 在 GPR 与 VI 寄存器、控制寄存器（编号 0–31）之间传送 32 位 |
| LQC2 / SQC2 | 在主存与 VF 寄存器之间直接装入 / 存储四字 |
| VADD、VMUL、VMADD、VDIV、VSQRT、VIADD 等 | 宏指令：执行一条相当于上部或下部微指令的运算 |
| VCALLMS / VCALLMSR | 启动 VU0 微程序：从指令中的立即数 / 从 CMSAR0 指定的指令对地址开始 |

使用 COP2 指令前须在 R5900 的 Status 中置 CU2（第 3 章），否则产生协处理器不可用异常。

**微模式**（micro mode）下 VU 从微程序存储器取指令对独立执行，与 R5900 并行。启动方式有：VIF 数据流中的 MSCAL/MSCALF（从 IMMEDIATE 指定的地址）和 MSCNT（从 TPC 继续）；R5900 的 VCALLMS/VCALLMSR（VU0）；R5900 经 CTC2 写 CMSAR1（VU1）。微程序执行到 E 位并执行完延迟槽后停止，停止位置记入 TPC。

在硬件上，R5900 可以读 VPU_STAT 查询 VU 是否仍在运行，VIF 用 FLUSHE 等命令等待微程序结束，带 .I 后缀的 COP2 指令可与微程序同步。QEMU 中微程序一经启动就在启动它的操作中同步执行完毕（7.10 节），因此 VPU_STAT 读出恒为 0。

## 7.4 VIF

### 7.4.1 数据包的处理

VIF 从 FIFO 接收 32 位字组成的数据流。数据流由 VIFcode 和其后的数据交替组成：VIF 读入一个 VIFcode，按命令码确定后面还要读多少个字作为数据，数据收完后的下一个字又是 VIFcode（格式见 7.6 节）。

数据流通常由 DMAC 送入：

1. 普通模式下，DMAC 把一块数据原样送入 VIF FIFO，块中须自带 VIFcode；
2. 源链模式下置 D0_CHCR/D1_CHCR 的 TTE 位，DMAtag 的高 64 位随数据送往 VIF，因此每个 DMAtag 可以携带两个 VIFcode（例如 STCYCL 与 UNPACK），后面紧跟 DMAtag 引用的数据块（第 6 章）。

EE 也可以直接向 VIF FIFO 地址（VIF0 `0x10004000`，VIF1 `0x10005000`）写入 VIFcode 与数据，QEMU 接受 32 位与 64 位写入。

一个典型的 VIF1 数据包依次包含：STCYCL（设定 CL/WL）、若干 UNPACK（写入顶点、矩阵等数据）、MSCAL（启动微程序），以及可能的 DIRECT（送出 GIF 数据包）。

### 7.4.2 VIF 寄存器的写法

VIF0 与 VIF1 的寄存器格式相同，只是基地址不同。本章用 `VIFn_STAT`、`VIFn_CYCLE` 等名称描述一次，偏移相对于 VIF 的寄存器基地址（表 7-4）。例如 VIF1_STAT 位于 `0x10003C00`，VIF0_CYCLE 位于 `0x10003840`。寄存器之间相隔 16 字节，每个寄存器只有低 32 位有效。

**表 7-4 VIF 寄存器基地址与存在情况**

| 寄存器 | 偏移 | VIF0（基地址 `0x10003800`） | VIF1（基地址 `0x10003C00`） |
|---|---|---|---|
| STAT、FBRST、ERR、MARK | `+0x000`–`+0x030` | √ | √ |
| CYCLE、MODE、NUM、MASK、CODE、ITOPS | `+0x040`–`+0x090` | √ | √ |
| BASE、OFST、TOPS | `+0x0A0`–`+0x0C0` | — | √ |
| ITOP | `+0x0D0` | √ | √ |
| TOP | `+0x0E0` | — | √ |
| R0–R3 | `+0x100`–`+0x130` | √ | √ |
| C0–C3 | `+0x140`–`+0x170` | √ | √ |
| FIFO | — | `0x10004000`–`0x10004FFF` | `0x10005000`–`0x10005FFF` |

EE 只能写 FBRST、ERR、MARK 以及 VIF1 的 STAT.FDR，其余寄存器为只读，由 VIFcode 设置。QEMU 中对只读寄存器的写入被忽略并记录 LOG_GUEST_ERROR，但 STAT 例外：VIF0 的 STAT 写入、VIF1 的 STAT 除 FDR 以外的位均被静默丢弃，不记录日志；VIF0 一侧的 BASE、OFST、TOPS、TOP 读出为 0。

### 7.4.3 微程序的装入与启动

**MPG** 把其后的 NUM 个指令对（NUM = 0 表示 256 个，即 2 KB）写入微程序存储器，起始指令对地址为 IMMEDIATE。VU1 的微程序存储器为 16 KB，大的微程序需要分几条 MPG 装入。数据超过存储器末尾时回绕到开头。

**MSCAL** 以 IMMEDIATE 为指令对地址启动微程序；**MSCALF** 相同，但在硬件上还要等待 PATH1、PATH2 空闲；**MSCNT** 从 TPC 继续执行，即上一个微程序 E 位之后的下一个指令对，适合把一个微程序分成若干段，每段处理完一批数据后停下，等 VIF 送来下一批数据再继续。

启动微程序时，VIF 把 ITOPS 复制到 ITOP（VIF0 先截为 8 位）；VIF1 还把 TOPS 复制到 TOP 并切换双缓冲（7.4.4 节）。微程序用 XITOP、XTOP 读取 ITOP、TOP，以得知本批数据的个数与存放位置。硬件上 VIF 在 VU 正在运行时遇到 MSCAL、MSCNT、MPG 会等待 VU 结束。

### 7.4.4 VIF1 双缓冲

VIF1 用 BASE、OFST、TOPS、TOP 与 STAT.DBF 实现 VU1 数据存储器中的双缓冲：VU1 处理一块缓冲区时，VIF1 把下一批数据解压到另一块缓冲区。

1. 用 BASE VIFcode 设定缓冲区 0 的地址，用 OFFSET VIFcode 设定缓冲区 1 相对缓冲区 0 的偏移。OFFSET 同时把 DBF 清零、TOPS 设为 BASE。
2. UNPACK 的 FLG 位为 1 时，写入地址为 ADDR + TOPS，即写入当前缓冲区。
3. MSCAL/MSCALF/MSCNT 启动微程序时：TOP ← TOPS；DBF 翻转；TOPS ← BASE（DBF = 0）或 BASE + OFST（DBF = 1）。
4. 微程序用 XTOP 取得 TOP，处理这块缓冲区；与此同时 VIF1 已在向另一块缓冲区写入。

ps2tek 对 OFFSET 的描述为“BASE 设为 TOPS”，与 PCSX2 和 QEMU 的“TOPS 设为 BASE”方向相反，本书按后者。

### 7.4.5 PATH2：DIRECT 与 DIRECTHL

VIF1 的 DIRECT 把其后 IMMEDIATE 个四字（0 表示 65536 个）原样送往 GIF，作为 PATH2 的 GIF 数据包；DIRECTHL 相同，但不会打断 PATH3 正在进行的 IMAGE 模式传输。这样可以把 GS 寄存器设置、纹理上传等 GIF 数据包与 VU1 的顶点数据放在同一条 VIF1 DMA 链中。QEMU 把 DIRECT/DIRECTHL 的数据逐字送入 GS 的 GIF 解析器，不模拟 PATH 仲裁。

### 7.4.6 停顿与中断 <Status s="unimplemented" />

硬件上 VIF 在以下情况停顿，DMAC 通道随之暂停：VIFcode 的 i 位为 1（产生 VIF 中断，STAT.INT、VIS 置 1，除非 ERR.MII = 1）；EE 写 FBRST 的 FBK 或 STP；收到无效 VIFcode（ER1，除非 ERR.ME1 = 1）；DMAtag 不匹配（ER0，除非 ERR.ME0 = 1）。EE 写 FBRST.STC 解除停顿。QEMU 不模拟停顿与 VIF 中断。

## 7.5 UNPACK

### 7.5.1 数据流

UNPACK 把数据流中的压缩数据展开为四字写入 VU 数据存储器，是向 VU 传送顶点数据的主要手段。图 7-2 是其处理过程：从 FIFO 取出压缩元素，按格式扩展为 x、y、z、w 四个 32 位字段，再按 MASK 与 MODE 决定每个字段写入什么，最后按 CYCLE 决定的地址写入。

![图 7-2 UNPACK 的数据流](/img/fig7-2-unpack.svg)

### 7.5.2 格式

CMD 的第 3:2 位为 VN（元素个数），第 1:0 位为 VL（元素位宽），第 4 位为 m（屏蔽写入）。表 7-5 列出 m = 0 时的 CMD 值，m = 1 时 CMD 加 `0x10`。

**表 7-5 UNPACK 格式**

| CMD | 格式 | 每向量位数 | 展开方式 |
|---|---|---|---|
| `0x60` | S-32 | 32 | 一个值复制到 x、y、z、w |
| `0x61` | S-16 | 16 | 扩展为 32 位后复制到 4 个字段 |
| `0x62` | S-8 | 8 | 同上 |
| `0x64` | V2-32 | 64 | x、y；z、w 不确定 |
| `0x65` | V2-16 | 32 | 同上，每个元素扩展为 32 位 |
| `0x66` | V2-8 | 16 | 同上 |
| `0x68` | V3-32 | 96 | x、y、z；w 不确定 |
| `0x69` | V3-16 | 48 | 同上 |
| `0x6A` | V3-8 | 24 | 同上 |
| `0x6C` | V4-32 | 128 | x、y、z、w |
| `0x6D` | V4-16 | 64 | 同上 |
| `0x6E` | V4-8 | 32 | 同上 |
| `0x6F` | V4-5 | 16 | RGBA5551：R、G、B 各 5 位左移 3 位，A 1 位左移 7 位 |

位宽为 8 位与 16 位的元素按 IMMEDIATE 的 USN 位做符号扩展（USN = 0）或零扩展（USN = 1）。`0x63`、`0x67`、`0x6B` 无效，QEMU 按 V4-5 处理。V2 的 z、w 与 V3 的 w 在硬件上不确定，QEMU 中 V2 重复 x、y，V3 取下一个元素，程序不应依赖。数据总长按字对齐：一条 UNPACK 的数据量为 ⌈取数据的向量数 × 每向量位数 / 32⌉ 个字，例如 3 个 V3-16 向量共 144 位，补齐为 5 个字。

### 7.5.3 CYCLE：跳写与补写

CYCLE.CL 与 CYCLE.WL（由 STCYCL 设定）决定第 n 个四字（n = 0 … NUM − 1）的写入地址：

- **CL ≥ WL（跳写）**：每 CL 个四字的地址中只写前 WL 个，跳过其余 CL − WL 个，被跳过的四字保持原值。地址 = ADDR + ⌊n / WL⌋ × CL + (n mod WL)。每个写入的四字都消耗一个向量的数据。CL = WL 时为连续写入，最常用的设定是 CL = WL = 1。
- **CL < WL（补写）**：地址连续，为 ADDR + n。每 WL 个四字中只有前 CL 个消耗数据，其余 WL − CL 个没有数据，用 ROW 或 COL 寄存器补写。

NUM 是写入的四字数（包括补写的四字），而不是数据中的向量数。QEMU 中 WL = 0 按 1 处理。

### 7.5.4 MASK、ROW、COL 与 MODE

m = 1 时，每个四字的每个字段按 MASK 中的 2 位决定写入内容。MASK 的行号 r 为该四字在 WL 周期中的序号（n mod WL，大于 3 时取 3），列号为字段（x、y、z、w）：

| MASK 项 | 写入内容 |
|---|---|
| 0 | 解压数据，再按 MODE 处理 |
| 1 | ROW 寄存器中对应字段的值（x 取 R0 … w 取 R3） |
| 2 | COL 寄存器 C[r] |
| 3 | 不写，保持原值 |

m = 0 时所有字段按 MASK 项为 0 处理。补写的四字没有数据，QEMU 中 MASK 项为 0 的字段按 1 处理（写入 ROW）。

MODE（由 STMOD 设定）只作用于写入解压数据的字段：MODE = 0 直接写入；MODE = 1（偏移）写入“数据 + Rf”，ROW 不变；MODE = 2（差分）先令 Rf = Rf + 数据，再写入新的 Rf，可用于差分编码的数据。常见用法是用 STROW 把 R3 设为 1.0，再用 MASK 让 V3 数据的 w 字段取 ROW，得到齐次坐标。

## 7.6 VIFcode

VIFcode 是 32 位命令字：第 15:0 位为 IMMEDIATE，第 23:16 位为 NUM，第 30:24 位为命令码 CMD，第 31 位为中断位 i。表 7-6 列出全部命令，位域详见 7.8 节 [VIFcode](#vifcode) 与 [VIFcode_UNPACK](#vifcode-unpack)。

**表 7-6 VIFcode 命令**

| CMD | 名称 | VIF0 | VIF1 | 数据 | 作用 | QEMU |
|---|---|---|---|---|---|---|
| `0x00` | NOP | √ | √ | — | 不操作，常用于对齐 | <Status s="verified" /> |
| `0x01` | STCYCL | √ | √ | — | CYCLE = IMMEDIATE | <Status s="verified" /> |
| `0x02` | OFFSET | — | √ | — | OFST = IMMEDIATE[9:0]，DBF = 0，TOPS = BASE | <Status s="verified" /> |
| `0x03` | BASE | — | √ | — | BASE = IMMEDIATE[9:0] | <Status s="verified" /> |
| `0x04` | ITOP | √ | √ | — | ITOPS = IMMEDIATE[9:0] | <Status s="verified" /> |
| `0x05` | STMOD | √ | √ | — | MODE = IMMEDIATE[1:0] | <Status s="reference" /> QEMU 已实现，但没有测试覆盖 |
| `0x06` | MSKPATH3 | — | √ | — | IMMEDIATE 第 15 位为 1 时屏蔽 PATH3 | <Status s="unimplemented" /> |
| `0x07` | MARK | √ | √ | — | MARK = IMMEDIATE，STAT.MRK = 1 | <Status s="verified" /> |
| `0x10` | FLUSHE | √ | √ | — | 等待微程序结束 | <Status s="reference" /> QEMU 已实现，但没有测试覆盖 |
| `0x11` | FLUSH | — | √ | — | 等待微程序结束且 PATH1、PATH2 空闲 | <Status s="reference" /> QEMU 已实现，但没有测试覆盖 |
| `0x13` | FLUSHA | — | √ | — | 同 FLUSH，并等待 PATH3 没有传输请求 | <Status s="reference" /> QEMU 已实现，但没有测试覆盖 |
| `0x14` | MSCAL | √ | √ | — | 从 IMMEDIATE 启动微程序 | <Status s="verified" /> |
| `0x15` | MSCALF | — | √ | — | 等待 PATH1、PATH2 空闲后从 IMMEDIATE 启动微程序 | <Status s="reference" /> QEMU 已实现，但没有测试覆盖 |
| `0x17` | MSCNT | √ | √ | — | 从 TPC 继续执行微程序 | <Status s="reference" /> QEMU 已实现，但没有测试覆盖 |
| `0x20` | STMASK | √ | √ | 1 个字 | 写 MASK | <Status s="reference" /> QEMU 已实现，但没有测试覆盖 |
| `0x30` | STROW | √ | √ | 4 个字 | 写 R0–R3 | <Status s="verified" /> |
| `0x31` | STCOL | √ | √ | 4 个字 | 写 C0–C3 | <Status s="reference" /> QEMU 已实现，但没有测试覆盖 |
| `0x4A` | MPG | √ | √ | NUM × 2 个字 | 装入微程序，起始指令对地址为 IMMEDIATE | <Status s="verified" /> |
| `0x50` | DIRECT | — | √ | IMMEDIATE × 4 个字 | 经 PATH2 送 GIF | <Status s="verified" /> |
| `0x51` | DIRECTHL | — | √ | IMMEDIATE × 4 个字 | 同 DIRECT，不打断 PATH3 的 IMAGE 传输 | <Status s="verified" /> |
| `0x60`–`0x7F` | UNPACK | √ | √ | 见 7.5 节 | 解压写入 VU 数据存储器 | V4-32 且 CL = WL = 1：<Status s="verified" />；其他格式、USN、MASK、MODE 与补写：<Status s="reference" /> QEMU 已实现，但没有测试覆盖 |

QEMU 中 VIFcode 一经收到就执行完毕，FLUSHE、FLUSH、FLUSHA 无需等待，按 NOP 处理；VIF0 收到 VIF1 专有的 OFFSET、BASE、MSKPATH3、FLUSH、FLUSHA、DIRECT、DIRECTHL 时记录 LOG_GUEST_ERROR 并丢弃。程序须保证每条 VIFcode 后的数据长度正确，否则后续数据会被误当作 VIFcode。

## 7.7 寄存器汇总

VIF 寄存器（名称以 `VIFn_` 开头）的“地址”列为相对于 VIF 寄存器基地址的偏移（表 7-4）；VIF0_FIFO、VIF1_FIFO 为绝对地址。

<RegSummary block="vif" />

VIFcode 不是寄存器，没有总线地址，这里按寄存器的格式列出：

<RegSummary block="vifcode" />

VU 的整数寄存器与控制寄存器没有总线地址，“地址”列为 CFC2/CTC2 使用的寄存器编号，以十六进制显示（例如 STATUS 为编号 16，显示为 `+0x010`）：

<RegSummary block="vu" />

## 7.8 寄存器说明

### VIFn_STAT
<Reg block="vif" name="VIFn_STAT" />

### VIFn_FBRST
<Reg block="vif" name="VIFn_FBRST" />

### VIFn_ERR
<Reg block="vif" name="VIFn_ERR" />

### VIFn_MARK
<Reg block="vif" name="VIFn_MARK" />

### VIFn_CYCLE
<Reg block="vif" name="VIFn_CYCLE" />

### VIFn_MODE
<Reg block="vif" name="VIFn_MODE" />

### VIFn_NUM
<Reg block="vif" name="VIFn_NUM" />

### VIFn_MASK
<Reg block="vif" name="VIFn_MASK" />

### VIFn_CODE
<Reg block="vif" name="VIFn_CODE" />

### VIFn_ITOPS
<Reg block="vif" name="VIFn_ITOPS" />

### VIFn_BASE
<Reg block="vif" name="VIFn_BASE" />

### VIFn_OFST
<Reg block="vif" name="VIFn_OFST" />

### VIFn_TOPS
<Reg block="vif" name="VIFn_TOPS" />

### VIFn_ITOP
<Reg block="vif" name="VIFn_ITOP" />

### VIFn_TOP
<Reg block="vif" name="VIFn_TOP" />

### VIFn_R0
<Reg block="vif" name="VIFn_R0" />

### VIFn_C0
<Reg block="vif" name="VIFn_C0" />

### VIF0_FIFO
<Reg block="vif" name="VIF0_FIFO" />

### VIF1_FIFO
<Reg block="vif" name="VIF1_FIFO" />

### VIFcode
<Reg block="vifcode" name="VIFcode" />

### VIFcode_UNPACK
<Reg block="vifcode" name="VIFcode_UNPACK" />

### VI00
<Reg block="vu" name="VI00" />

### VI01-VI15
<Reg block="vu" name="VI01-VI15" />

### STATUS
<Reg block="vu" name="STATUS" />

### MAC
<Reg block="vu" name="MAC" />

### CLIP
<Reg block="vu" name="CLIP" />

### R
<Reg block="vu" name="R" />

### I
<Reg block="vu" name="I" />

### Q
<Reg block="vu" name="Q" />

### P
<Reg block="vu" name="P" />

### TPC
<Reg block="vu" name="TPC" />

### CMSAR0
<Reg block="vu" name="CMSAR0" />

### FBRST
<Reg block="vu" name="FBRST" />

### VPU_STAT
<Reg block="vu" name="VPU_STAT" />

### CMSAR1
<Reg block="vu" name="CMSAR1" />

## 7.9 编程要点

### 7.9.1 初始化

1. 写 VIF0_FBRST（`0x10003810`）与 VIF1_FBRST（`0x10003C10`）= `0x00000001`，复位两个 VIF。
2. 写 VIF0_ERR（`0x10003820`）、VIF1_ERR（`0x10003C20`）= `0x00000002`（ME0 = 1）。
3. 在 R5900 的 Status 中置 CU2，允许 COP2 指令。
4. 经 CTC2 写 VU0 的 STATUS（编号 16）= 0，清除累积标志。

### 7.9.2 经 VIF1 装入微程序并处理数据

以下数据流可放在一条 VIF1 源链中，DMAtag 置 TTE 携带 VIFcode：

1. `MPG`：NUM = 微程序指令对数（不超过 256），IMMEDIATE = 0，后跟微程序；超过 256 个指令对时分多条 MPG。
2. `STCYCL`：CL = WL = 1（IMMEDIATE = `0x0101`），连续写入。
3. `BASE`、`OFFSET`：例如 BASE = `0x000`，OFFSET = `0x200`，把 VU1 数据存储器分为两块各 512 个四字的缓冲区。
4. 每批数据：若干 `UNPACK`（FLG = 1，ADDR 为缓冲区内偏移），可用 `ITOP` 传递顶点数，然后 `MSCAL` 或 `MSCNT` 启动微程序。
5. 微程序开头用 XTOP 取得本批数据所在缓冲区的地址，用 XITOP 取得 ITOP；处理完后在数据存储器中组装 GIF 数据包并执行 XGKICK，最后以 E 位结束。
6. 下一批数据经 FLG = 1 的 UNPACK 自动写入另一块缓冲区。

启动 DMAC 通道 1 前确认 D1_CHCR.STR = 0，写 D1_CHCR 时置 DIR = 1（存储器 → VIF1）。

### 7.9.3 用 VU0 宏模式计算

下面的指令序列用 VU0 宏模式计算 4 × 4 矩阵与向量的乘积：VF4–VF7 中预先装入矩阵的四列（例如用 LQC2），VF1 为输入向量，结果在 VF2 中。

```
qmtc2        $t0, $vf1            # 输入向量送入 VF1
vmulax.xyzw  $ACC, $vf4, $vf1x    # ACC = 第 0 列 × x
vmadday.xyzw $ACC, $vf5, $vf1y    # ACC += 第 1 列 × y
vmaddaz.xyzw $ACC, $vf6, $vf1z    # ACC += 第 2 列 × z
vmaddw.xyzw  $vf2, $vf7, $vf1w    # VF2 = ACC + 第 3 列 × w
qmfc2        $t1, $vf2            # 取回结果
```

也可以先由 R5900 写 VU0 微程序存储器（`0x11000000`）与数据存储器（`0x11004000`），再用 VCALLMS 启动微程序。

### 7.9.4 等待 VU 结束 <Status s="reference" />

在硬件上，R5900 修改 VU 存储器或读取结果前须确认微程序已结束：读 VPU_STAT 的 VBS0（VU0）或 VBS1（VU1），或在 VIF 数据流中用 FLUSHE/FLUSH/FLUSHA。QEMU 中微程序同步执行完毕，VPU_STAT 恒为 0，这些等待立即通过。

## 7.10 QEMU 模型说明

QEMU 中 VU 核心由 `hw/display/ps2_vu.c` 实现，两个 VIF 共用 `hw/display/ps2_vif.c`；`ps2-vu0`（`hw/display/ps2_vu0.c`，含 VIF0，实现 R5900 的 `r5900-cop2` 接口）与 `ps2-vu1`（`hw/display/ps2_vu1.c`，含 VIF1）是 `ps2-ee` 片上系统中的两个设备，映射地址见表 7-2 与表 7-4。DMAC 通道 0、1 的数据分别送入 VIF0、VIF1；通道 1 的 DIR = 0 方向读出 GS 的 local → host 传输数据。相关 qtest：`ps2/cop2`、`ps2/vif0`（含与 VIF1 的对照）、`ps2/gif`（VIF1 的 MPG、UNPACK、MSCAL 与 XGKICK）、`ps2/dmac/spr`（VIF1 下载）、`ps2/memory-map`。

已模拟：

| 功能 | 说明 |
|---|---|
| VU 指令 | 上部 / 下部指令对（上部读到下部执行之前的寄存器）、I 位、带一个延迟槽的 E 位、分支、整数与标志指令、CLIP（24 位历史）、MAC/STATUS 及累积标志、FDIV（Q 延迟 7 / 13 个指令对）、VU1 的 EFU（P 延迟 12 个指令对；EFU 指令与 P 寄存器 <Status s="reference" /> QEMU 已实现，但没有测试覆盖） |
| 浮点 | 无无穷大、NaN、非规格化数，按 7.2.4 节钳位 |
| COP2 | QMFC2/QMTC2/CFC2/CTC2/LQC2/SQC2 与宏指令（含 VCALLMS/VCALLMSR）；CU2 为 0 时产生协处理器不可用异常 |
| 控制寄存器 | R 只保留 23 位尾数；MAC、TPC、VPU_STAT 只读；STATUS 只可写累积标志；FBRST 保存 `0x0C0C` 中的位；写 CMSAR1 启动 VU1 |
| VU0 访问 VU1 寄存器 | VU0 数据地址第 10 位为 1 时访问 VU1 的 VF/VI/控制寄存器 |
| VIFcode | 除 MSKPATH3 外的全部命令；VIF0 丢弃 VIF1 专有命令 |
| UNPACK | 全部格式、USN、CL/WL 跳写与补写、MASK、ROW/COL、MODE 偏移与差分、VIF1 的 FLG + TOPS；地址按存储器大小回绕 |
| VIF1 双缓冲 | BASE、OFST、TOPS、TOP、STAT.DBF（<Status s="reference" /> QEMU 已实现，但没有测试覆盖） |
| XGKICK 与 DIRECT | XGKICK 沿 GIFtag 走到 EOP（越过存储器末尾时回绕）后一次送 GS；总长达到 1024 个四字时整个 XGKICK 被丢弃（LOG_GUEST_ERROR）；DIRECT/DIRECTHL 数据送 GS |
| VIF 寄存器 | FBRST.RST 丢弃当前 VIFcode 并清除 ERR（VIF1 清除 STAT，VIF0 保留 MRK）；ERR 保存低 3 位；写 MARK 清除 MRK；VIF1 的 STAT.FDR 可写 |

未模拟或与硬件不同：

| 功能 | 说明 |
|---|---|
| 并行执行 | 微程序在 MSCAL/VCALLMS/CMSAR1 等启动操作中同步执行到结束，与 R5900 不并行；执行 16M 个指令对仍未结束时强制停止并记录 LOG_GUEST_ERROR |
| 时序 | 不模拟周期、流水线停顿与 FMAC 标志延迟；宏模式下 Q 没有延迟 |
| 调试位 | 上部指令的 M、D、T 位无效；FBRST 的 FB/RS 动作不执行，DE/TE 只保存 |
| VPU_STAT | 读出恒为 0 |
| 标志 | MAC/STATUS 的 U、O、I、D 不产生 |
| 中断 | VIFcode 的 i 位、VIF 停顿与中断、VU0/VU1 中断、VU0 看门狗均未模拟，INTC 第 4–7、14 位不会置位 |
| VIF 状态 | STAT 的 VPS、VEW、VGW、FQC 等恒为 0；FBRST 的 FBK、STP、STC 无效；不产生 ER0/ER1；FIFO 读出为 0 |
| MSKPATH3 | 按 NOP 处理；GIF 也不模拟 PATH3 屏蔽与 PATH 仲裁 |
| VIF0 的 MSCALF | QEMU 在 VIF0 上也执行（ps2tek 列为 VIF1 专有） |
| NUM 寄存器 | 只在 UNPACK 开始时写入，不随数据递减；MPG 不更新 |
| 字节序 | VU/VIF 存储器按主机字节序保存，不支持大端主机 |
| BC2F/BC2T | R5900 的 COP2 条件转移指令未实现 |

## 7.11 来源

- QEMU `include/hw/display/ps2_vif.h`、`ps2_vu.h`、`ps2_vu0.h`、`ps2_vu1.h`，`hw/display/ps2_vif.c`、`ps2_vu.c`、`ps2_vu0.c`、`ps2_vu1.c`，`hw/mips/ps2_ee.c`，`tests/qtest/ps2-test.c`
- PCSX2 pcsx2/Vif.h:11–213（STAT、FBRST、ERR 与寄存器布局）、pcsx2/Hw.h:25–33、125–171（VIF 地址）、pcsx2/Vif_Codes.cpp:72–110（启动微程序与双缓冲）、pcsx2/Vif_Codes.cpp:578（OFFSET）、pcsx2/Vif.cpp:67、142（FBRST）、pcsx2/VU.h:7–23（控制寄存器编号）、pcsx2/VU0.cpp:140–200（CFC2/CTC2）、pcsx2/VU0microInterp.cpp:40–62 与 pcsx2/VU1microInterp.cpp:45–62（D/T 位与 VPU_STAT）
- ps2tek §VIF I/O Registers、§VIF Commands、§VIF UNPACK、§VU Architecture、§VU Registers、§VU Instruction Format and Decoding、§VU Pipelining
