# 第 5 章 EE 定时器

EE 内有 4 个结构相同的 16 位定时器 T0–T3，挂在 EE 总线上，寄存器位于物理地址 `0x10000000`–`0x10001FFF`。每个定时器可从 4 种计数时钟中选择一种，在计数值达到比较值或计数溢出时向 EE 中断控制器（第 4 章）发出中断，也可受行、场消隐信号门控。T0 与 T1 另有一个 HOLD 寄存器，在 SBUS 中断发生时锁存当前计数值。

## 5.1 概述

### 5.1.1 结构

![图 5-1 EE 定时器通道结构](/img/fig5-1-ee-timer.svg)

每个定时器通道由以下部分组成（图 5-1）：

1. **时钟选择**：由 Tn_MODE.CLKS 从 BUSCLK、BUSCLK/16、BUSCLK/256 和 HBLNK 中选择一路作为计数时钟。
2. **门控逻辑**：Tn_MODE.GATE 为 1 时，计数受 HBLNK 或 VBLNK 信号控制，可在消隐期暂停计数，或在消隐信号边沿清零计数器。
3. **16 位计数器 Tn_COUNT**：Tn_MODE.CUE 为 1 时每个计数时钟加 1。
4. **比较器与溢出检测**：计数值达到 Tn_COMP 时产生比较相等事件；计数值由 `0xFFFF` 变为 `0x0000` 时产生溢出事件。
5. **中断标志**：比较相等置 EQUF（需 CMPE 为 1），溢出置 OVFF（需 OVFE 为 1）。任一标志由 0 变 1 时，向 INTC 发出一次中断。

各通道的寄存器基址与中断源如下：

| 定时器 | 寄存器基址 | INTC 中断源 | HOLD 寄存器 | 典型用途 |
|---|---|---|---|---|
| T0 | `0x10000000` | 位 9（TIM0） | 有 | 应用程序自由使用 |
| T1 | `0x10000800` | 位 10（TIM1） | 有 | 应用程序自由使用 |
| T2 | `0x10001000` | 位 11（TIM2） | 无 | ps2sdk 软件定时器库使用 |
| T3 | `0x10001800` | 位 12（TIM3） | 无 | EE 内核报警（Alarm）功能保留 |

### 5.1.2 计数时钟

BUSCLK 为 EE 总线时钟，频率为 R5900 核心时钟 294.912 MHz 的一半，即 147.456 MHz。

| CLKS | 时钟源 | 频率 | 一个计数周期 | 16 位满量程 |
|---|---|---|---|---|
| `0b00` | BUSCLK | 147.456 MHz | 约 6.78 ns | 约 0.444 ms |
| `0b01` | BUSCLK / 16 | 9.216 MHz | 约 108.5 ns | 约 7.11 ms |
| `0b10` | BUSCLK / 256 | 576 kHz | 约 1.736 μs | 约 113.8 ms |
| `0b11` | HBLNK | NTSC 约 15.73 kHz，PAL 约 15.63 kHz | 一行扫描线 | NTSC 约 4.17 s |

HBLNK 的频率取决于视频模式。按 ps2tek §EE Timers 给出的行周期，NTSC 每行 9370 个 BUSCLK（约 15.737 kHz），PAL 每行 9436 个 BUSCLK（约 15.627 kHz）<Status s="reference" />。QEMU 中 HBLNK 固定为 15734 Hz（NTSC 标称行频），不随 SMODE1 切换到 PAL。

### 5.1.3 计数、比较与溢出

CUE 置 1 后计数器开始递增。每次加 1 后：

- **比较相等**：计数值达到 Tn_COMP 时发生。若 ZRET 为 1，计数器随即回到 0，计数值在 0 到 COMP−1 之间循环，周期为 COMP 个计数时钟；若 ZRET 为 0，计数器继续向上计数。
- **溢出**：计数值由 `0xFFFF` 加 1 回到 `0x0000` 时发生。ZRET 为 1 且 COMP 不为 0 时，计数器到不了 `0xFFFF`，正常情况下不会溢出；只有 COUNT 先被写成大于 COMP 的值，才会先溢出一次再进入比较循环。

比较相等时若 CMPE 为 1，则 EQUF 置 1；溢出时若 OVFE 为 1，则 OVFF 置 1。CMPE、OVFE 为 0 时对应事件不置标志，也不产生中断。

写入的 COMP 不大于当前计数值时，不会立即产生比较相等，须等计数器回绕后再次达到 COMP。

### 5.1.4 中断流程

定时器中断为**边沿方式**：只有 EQUF 或 OVFF 由 0 变为 1 时，定时器才向 INTC 发出一次脉冲，INTC 将 I_STAT 的位 9+n 置 1（第 4 章）。I_MASK 中对应位为 1 时，中断经 INT0 送至 R5900（Cause.IP2）。

由此可得两点：

- 中断处理程序必须对 Tn_MODE 的 EQUF/OVFF 写 1 清零，下一次比较相等或溢出才会再产生中断；同时还要对 I_STAT 的位 9+n 写 1 清零。
- 标志未清除期间发生的事件不会再次发出中断。据 ps2tek §EE Timers，有游戏不在定时器中断处理程序中清除标志，而是在别处清除，依赖的正是这一行为。

### 5.1.5 门控 <Status s="unimplemented" />

GATE 为 1 时，计数受门控信号控制。GATS 选择门控信号为 HBLNK（行消隐）或 VBLNK（场消隐），GATM 选择门控方式：

| GATM | 行为 |
|---|---|
| `0b00` | 门控信号无效（非消隐期）时计数，消隐期间暂停 |
| `0b01` | 门控信号上升沿（消隐开始）时计数器清零 |
| `0b10` | 门控信号下降沿（消隐结束）时计数器清零 |
| `0b11` | 上升沿与下降沿都使计数器清零 |

以 HBLNK 作计数时钟（CLKS = `0b11`）时，HBLNK 门控不起作用（PCSX2 pcsx2/Counters.cpp:743）。以 VBLNK 门控、GATM = `0b01` 时，计数器在每场消隐开始时清零，读 COUNT 即可得到本场已经过的时间，常用于在一帧内定位当前扫描位置。

QEMU 只保存 GATE、GATS、GATM 三个位域的写入值，不实现门控。

### 5.1.6 HOLD 寄存器 <Status s="unimplemented" />

T0、T1 各有一个 HOLD 寄存器。INTC 的 SBUS 中断（I_STAT 位 1，IOP 向 EE 发出的中断）发生时，硬件把 T0_COUNT、T1_COUNT 的当前值分别锁存到 T0_HOLD、T1_HOLD，程序可据此得到中断发生的时刻（PCSX2 pcsx2/Hw.cpp:70）。T2、T3 没有 HOLD 寄存器。

### 5.1.7 系统软件中的使用

- **EE 内核**：T3 由 BIOS 中的 EE 内核保留，用于 SetAlarm 等报警功能，报警时间以行同步（HBLNK）为单位（ps2sdk ee/kernel/include/kernel.h:97、:370）。应用程序不应改动 T3。
- **ps2sdk 软件定时器**：ps2sdk 的定时器库使用 T2 与 TIM2 中断（ps2sdk ee/kernel/src/timer.c:153），以 COMP 设定下一个到期时刻，并在 OVFF 置 1 时累加高位，把 16 位计数器扩展为 64 位时间基准（同文件 :402）。
- T0、T1 一般留给应用程序，用于性能测量或周期中断。

## 5.2 寄存器汇总

T1–T3 的寄存器与 T0 同名寄存器的位定义完全相同，下文只给出 T0 的详细说明。T2、T3 没有 HOLD 寄存器。

<RegSummary block="ee-timer" />

## 5.3 寄存器说明

### T0_COUNT
<Reg block="ee-timer" name="T0_COUNT" />

### T0_MODE
<Reg block="ee-timer" name="T0_MODE" />

### T0_COMP
<Reg block="ee-timer" name="T0_COMP" />

### T0_HOLD
<Reg block="ee-timer" name="T0_HOLD" />

## 5.4 编程要点

以下示例中寄存器一律按 32 位访问，程序中使用 KSEG1 地址（例如 T1_MODE 为 `0xB0000810`）。

### 5.4.1 周期中断

以 T1 产生 1 kHz 周期中断为例，选用 BUSCLK/256（576 kHz），COMP = 576：

1. 写 T1_MODE = `0x00000C00`：停止计数（CUE = 0），同时清除旧的 EQUF、OVFF。
2. 写 T1_COUNT = 0。
3. 写 T1_COMP = 576（`0x240`）。
4. 挂接 TIM1（I_STAT 位 10）的中断处理程序；向 I_STAT 写 `0x00000400` 清除残留请求，再在 I_MASK 中允许位 10（I_MASK 为写 1 翻转，先确认该位为 0）。
5. 写 T1_MODE = `0x000001C2`：CLKS = `0b10`、ZRET = 1、CUE = 1、CMPE = 1。

中断处理程序：

1. 读 T1_MODE，确认 EQUF（位 10）为 1。
2. 向 T1_MODE 写 `(读出值 & 0x3FF) | 0x400`，只清除 EQUF，其余控制位保持不变。
3. 向 I_STAT 写 `0x00000400`，清除 INTC 中的 TIM1 请求。

### 5.4.2 时间测量

1. 写 T0_MODE = `0x00000C80`：CLKS = `0b00`（BUSCLK），CUE = 1，不允许中断，同时清除旧标志。
2. 在被测代码前后各读一次 T0_COUNT，两次读数相减后取低 16 位，即为经过的 BUSCLK 周期数（不超过 `0xFFFF`，约 0.444 ms）。
3. 测量更长的时间时，改用 BUSCLK/16 或 BUSCLK/256，或置 OVFE 为 1，在溢出中断中累加高位。

### 5.4.3 单次定时

1. 保持 ZRET = 0、CUE = 1、CMPE = 1。
2. 读当前 COUNT，写 COMP = (COUNT + N) & `0xFFFF`。
3. 清除 EQUF 后等待中断。N 个计数时钟后产生一次比较中断；若期间计数器回绕，OVFF 也会置 1（OVFE 为 1 时）。

::: warning 修改模式时保护中断标志
EQUF、OVFF 为写 1 清零。对 Tn_MODE 执行“读—改—写”时，应先将读出值的位 11:10 清零再写回，否则会把尚未处理的标志一并清除，丢失中断。
:::

## 5.5 QEMU 模型说明

QEMU 的 EE 定时器由 `hw/timer/ps2_timer.c` 实现（类型 `ps2-timer`），由 `hw/mips/ps2_ee.c` 映射到 `0x10000000`，窗口大小 `0x2000`，4 个通道间隔 `0x800`。定时器 n 的中断输出接到 EE INTC 的输入 9+n。

| 功能 | 状态 | 说明 |
|---|---|---|
| MODE、COMP 写入 | <Status s="verified" /> | 32 位实现，也接受 64 位访问；8/16 位访问无效 |
| COUNT 读写 | <Status s="reference" /> | QEMU 已实现，但没有测试覆盖 |
| 时钟源 BUSCLK | <Status s="verified" /> | BUSCLK 固定为 147.456 MHz，不由时钟对象推导 |
| 时钟源 /16、/256 | <Status s="reference" /> | QEMU 已实现，但没有测试覆盖 |
| 时钟源 HBLNK | <Status s="reference" /> | 固定为 NTSC 标称行频 15734 Hz，PAL 模式下不改变；QEMU 已实现，但没有测试覆盖 |
| CUE、CMPE，比较相等产生中断 | <Status s="verified" /> | 比较相等时向 INTC 发出一次脉冲 |
| ZRET、OVFE，溢出中断 | <Status s="reference" /> | ZRET = 1 且 COMP = 0 时按周期 `0x10000` 处理；QEMU 已实现，但没有测试覆盖 |
| EQUF、OVFF 的读出与写 1 清零 | <Status s="reference" /> | 标志由 0 变 1 时向 INTC 发出一次脉冲；QEMU 已实现，但没有测试覆盖 |
| 门控 GATE、GATS、GATM | <Status s="unimplemented" /> | 只保存写入值，不影响计数 |
| HOLD 锁存 | <Status s="unimplemented" /> | 作为普通 16 位存储单元；T2、T3 的 `+0x30` 偏移同样可读写，与硬件不同 |

实现方式：计数器不逐拍运行，而是在读 COUNT、写任一寄存器或内部定时器到期时，按 `QEMU_CLOCK_VIRTUAL` 经过的时间折算出新增的计数值。只有 CUE 为 1 且 CMPE 或 OVFE 为 1 时，才设置 QEMU 定时器在下一次比较相等或溢出时刻唤醒。写 COUNT 或 MODE 时以当前时刻为新的计数起点。复位时 4 个通道的 COUNT、MODE、COMP、HOLD 全部清零。

测试：qtest `ps2/irq` 依次对 4 个通道设置 COMP 与 MODE（CLKS = `0b00`、CUE、CMPE），检查 INTC 的 I_STAT 位 9–12 分别置 1。该测试不读写 COUNT，不读出 MODE 中的标志，也不覆盖其他时钟源、ZRET 与溢出，上表中这些项目因此列为参考级。
