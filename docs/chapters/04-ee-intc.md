# 第 4 章 EE 中断控制器

EE 中断控制器（INTC）把 EE 一侧 16 个中断源汇集为一根中断信号 INT0，送往 R5900 核心。INTC 只有两个寄存器：中断状态寄存器 I_STAT 与中断屏蔽寄存器 I_MASK，位于物理地址 `0x1000F000` 起的 32 字节窗口中。DMA 控制器（DMAC）不经过 INTC，而是用另一根信号 INT1 直接向 R5900 申请中断（第 6 章）。

## 4.1 概述

### 4.1.1 中断结构

R5900 的 COP0 Cause 寄存器中与中断有关的请求位有三个：IP2、IP3 来自 PS2 的片上外设，IP7 来自 COP0 内部定时器：

| Cause 位 | 名称 | 信号 | 来源 | Status 中的允许位 |
|---|---|---|---|---|
| 10 | IP2 | INT0 | INTC：`(I_STAT & I_MASK) ≠ 0` | IM2（位 10） |
| 11 | IP3 | INT1 | DMAC：D_STAT 中有未屏蔽的通道中断，或总线错误 | IM3（位 11） |
| 15 | IP7 | — | COP0 定时器：Count 等于 Compare | IM7（位 15） |

![图 4-1 EE 中断路由](/img/fig4-1-ee-irq.svg)

INTC 内部的数据流如下：

1. 各中断源向 INTC 送出信号。INTC 检测到某一信号的上升沿时，将 I_STAT 中对应位置 1。置位与 I_MASK 无关。
2. I_STAT 与 I_MASK 逐位相与，16 个结果相或，得到 INT0。只要还有一个已允许的位为 1，INT0 就保持有效。
3. INT0 反映在 Cause.IP2。R5900 在满足 4.2 节所述的允许条件时进入中断异常。
4. 中断处理程序读 I_STAT 判断中断源，处理后向 I_STAT 对应位写 1 清零。所有已允许的位清零后，INT0 撤销。

I_STAT 是一个“锁存”寄存器：中断源产生一次事件只置一次位，程序不清零则一直保持。因此，即使中断源被屏蔽，事件也会留在 I_STAT 中；之后打开 I_MASK 中对应位，INT0 立即有效。允许某一中断源之前，通常应先向 I_STAT 对应位写 1，清除过去遗留的记录。

### 4.1.2 中断源

| 位 | 名称 | 来源模块 | 触发条件 | QEMU |
|---|---|---|---|---|
| 0 | GS | GS | GS CSR 中出现未被 GS IMR 屏蔽的事件（SIGNAL、FINISH、HSINT、VSINT、EDWINT） | <Status s="reference" />（QEMU 已实现，但没有测试覆盖） |
| 1 | SBUS | IOP（SSBUS 接口） | IOP 向 ICFG（IOP 地址 `0x1F801450`）以 16 位或 32 位宽度写入，且第 1 位为 1 | <Status s="verified" /> |
| 2 | VBON | GS 视频时序 | 场消隐开始，每场一次 | <Status s="verified" /> |
| 3 | VBOF | GS 视频时序 | 场消隐结束 | <Status s="verified" /> |
| 4 | VIF0 | VIF0 | 处理到 i 位为 1 的 VIFcode，VIF0 停顿 | <Status s="unimplemented" /> |
| 5 | VIF1 | VIF1 | 处理到 i 位为 1 的 VIFcode，VIF1 停顿 | <Status s="unimplemented" /> |
| 6 | VU0 | VU0 | 微程序执行到 D 位或 T 位，且 FBRST 中对应允许位为 1 | <Status s="unimplemented" /> |
| 7 | VU1 | VU1 | 同上，针对 VU1 | <Status s="unimplemented" /> |
| 8 | IPU | IPU | IPU 命令执行结束等 | <Status s="unimplemented" /> |
| 9–12 | TIM0–TIM3 | EE 定时器 0–3（第 5 章） | T*n*_MODE 中的 EQUF（比较匹配）或 OVFF（溢出）标志由 0 变为 1 | <Status s="verified" /> |
| 13 | SFIFO | SIO 调试串口 | SIO FIFO 中断 | <Status s="unimplemented" /> |
| 14 | VU0WD | VU0 | VU0 看门狗，微程序长时间不结束 | <Status s="unimplemented" /> |
| 15 | PGPU | PGPU | PS1 兼容模式下的图形接口中断 | <Status s="unimplemented" /> |

位 0～14 的名称与顺序在 QEMU（`include/hw/intc/ps2_intc.h`）、PCSX2（`pcsx2/Dmac.h:204` 的 `INTCIrqs`）与 ps2tek §EE Interrupt Controller (INTC) 中一致。PCSX2 的枚举与 ps2tek 的位表都只到位 14；位 15 PGPU 仅见于 QEMU 的定义，来源未经其他资料证实（<Status s="reference" />）。

VBON 与 VBOF 同时送往 IOP 中断控制器（第 12 章），两个处理器各自响应场消隐。

## 4.2 R5900 对中断的响应

R5900 只有在以下条件全部满足时才响应外部中断：

```
Status.IE = 1  且  Status.EIE = 1  且  Status.EXL = 0  且  Status.ERL = 0
并且  (Cause.IP & Status.IM) ≠ 0
```

| Status 位 | 名称 | 说明 |
|---|---|---|
| 0 | IE | 中断允许 |
| 1 | EXL | 异常级。进入异常时由硬件置 1，此时不响应中断 |
| 2 | ERL | 错误级。复位、NMI 等进入时置 1 |
| 10 | IM2 | 允许 INT0（INTC） |
| 11 | IM3 | 允许 INT1（DMAC） |
| 15 | IM7 | 允许 COP0 定时器中断 |
| 16 | EIE | R5900 特有的总中断允许位，由 EI / DI 指令置 1 / 清零 |
| 17 | EDI | 为 0 时 EI / DI 只在内核模式下有效；为 1 时用户模式和管理模式下也有效 |

EIE 是 R5900 在标准 MIPS 之外增加的一级总开关。程序通常保持 Status.IE = 1，而用 EI / DI 指令开关中断，这样无需对 Status 做“读—改—写”。

R5900 没有向量中断：无论是 INT0、INT1 还是定时器中断，Cause.ExcCode 均为 0（Int），都转到同一个中断向量。Status.BEV = 0 时向量为 `0x80000200`，BEV = 1 时为 `0xBFC00400`。中断处理程序须读 Cause.IP 判断是哪一路中断。ps2tek 指出，INT0 与 INT1 同时有效时先处理 INT0（<Status s="reference" />）。

## 4.3 寄存器汇总

<RegSummary block="ee-intc" />

寄存器窗口为 `0x1000F000`–`0x1000F01F`，偏移 `0x00` 为 I_STAT，偏移 `0x10` 为 I_MASK，窗口内其余偏移不对应寄存器。两个寄存器支持 32 位与 64 位访问；64 位访问只有低 32 位有效。

## 4.4 寄存器说明

### I_STAT
<Reg block="ee-intc" name="I_STAT" />

### I_MASK
<Reg block="ee-intc" name="I_MASK" />

## 4.5 与 GS、DMAC 的关系

### 4.5.1 GS 中断（I_STAT 位 0）

GS 中断是一个二级中断：GS 内部有自己的事件寄存器 CSR（`0x12001000`）与屏蔽寄存器 IMR（`0x12001010`），详见第 9 章。

| CSR 位 | 事件 | IMR 屏蔽位 |
|---|---|---|
| 0 | SIGNAL：GIF 写入 SIGNAL 寄存器 | 8（SIGMSK） |
| 1 | FINISH：GIF 写入 FINISH 寄存器，此前绘图全部完成 | 9（FINISHMSK） |
| 2 | HSINT：行同步 | 10（HSMSK） |
| 3 | VSINT：场同步 | 11（VSMSK） |
| 4 | EDWINT：矩形区域写终止 | 12（EDWMSK） |

GS 的输出信号为 `CSR[4:0] & ~IMR[12:8]` 的“或”，这是一个**电平**信号，送到 INTC 位 0。IMR 的复位值为 `0x7F00`，即 GS 事件默认全部屏蔽，程序需先清 IMR 中对应屏蔽位。

由于 INTC 按上升沿锁存，处理 GS 中断时顺序很重要：

1. 读 GS CSR，确认是哪一个事件；
2. 向 CSR 中对应事件位写 1 清除，GS 输出信号随之变低；
3. 向 I_STAT 写 `0x00000001` 清除位 0。

如果只清 I_STAT 而不清 CSR，GS 输出一直为高，以后不再有上升沿，GS 中断便不再出现。

### 4.5.2 DMAC 中断（INT1）

DMAC 的通道结束中断不经过 INTC。D_STAT（`0x1000E010`）低 16 位为状态位（CIS0～CIS9、SIS、MEIS、BEIS），高 16 位为对应的屏蔽位（CIM、SIM、MEIM）；状态位与屏蔽位逐位相与后相或即为 INT1，总线错误 BEIS 不受屏蔽，见第 6 章。INT1 进入 Cause.IP3，由 Status.IM3 允许。D_STAT 的屏蔽位与 I_MASK 一样采用“写 1 翻转”。

另外，D_PCR 的 CPC 位与 D_STAT 的 CIS 位共同产生 CPCOND0 信号，供 BC0T / BC0F 指令测试。它不是中断，程序可以用它轮询一组通道是否全部结束。

## 4.6 编程要点

### 4.6.1 初始化

1. 执行 DI，关闭总中断。
2. 向 I_STAT 写 `0x0000FFFF`，清除全部遗留状态。
3. 读 I_MASK，对需要允许而当前为 0 的位写 1（参见 4.6.3）。
4. 设置各中断源本身：例如 GS IMR 清屏蔽位、定时器 MODE 置 CMPE / OVFE。
5. 在 Status 中置 IM2（使用 DMAC 时同时置 IM3），确认 IE = 1、EXL = 0、ERL = 0。
6. 执行 EI。

在 PS2 内核环境下，程序一般不直接操作上述寄存器，而是调用 AddIntcHandler 注册中断处理程序、调用 _EnableIntc 允许中断源；内核的中断分发程序负责读写 I_STAT（ps2tek §BIOS EE Syscalls，<Status s="reference" />）。

### 4.6.2 中断处理程序

1. 进入中断向量后，读 Cause，检查 IP2 / IP3 / IP7 判断中断类型。
2. 若为 IP2：读 I_STAT 与 I_MASK，相与得到待处理的中断源，按位处理。
3. 对每个中断源，先清除中断源本身的标志（GS CSR 事件位、定时器 MODE 的 EQUF / OVFF 等），再向 I_STAT 对应位写 1。
4. 只清除已处理的位。不要把整个读出值写回 I_STAT，以免把处理期间新到达的中断一起清掉。
5. 执行 ERET 返回。若此时 I_STAT 中仍有已允许的位（处理期间新到达的中断），返回后会立即再次进入中断。

### 4.6.3 I_MASK 的翻转语义

I_MASK 写 1 翻转、写 0 无影响。这一点与多数 MCU 的屏蔽寄存器不同，容易出错：

| 当前 I_MASK | 写入值 | 结果 | 说明 |
|---|---|---|---|
| `0x0000` | `0x0004` | `0x0004` | 允许 VBON |
| `0x0004` | `0x0004` | `0x0000` | 再写一次，VBON 被**关闭** |
| `0x0004` | `0x0204`（“读—或—写”） | `0x0200` | 想加上 TIM0，结果关闭了 VBON |
| `0x0004` | `0x0200` | `0x0204` | 正确：只写需要翻转的位 |

::: warning
设置 I_MASK 时只写“当前值与目标值不同”的位，即写入 `I_MASK ^ 目标值`。不要使用“读—或—写”。
:::

### 4.6.4 示例：等待场消隐开始（轮询）

不使用中断时，可轮询 I_STAT：

```c
#define I_STAT  (*(volatile u32 *)0xB000F000)

I_STAT = 1 << 2;                 /* 清除 VBON */
while (!(I_STAT & (1 << 2)))     /* 等待下一次场消隐开始 */
    ;
```

轮询不需要允许 I_MASK 中的位，因为 I_STAT 的置位与 I_MASK 无关。

## 4.7 QEMU 模型说明

QEMU 中 INTC 由 `hw/intc/ps2_intc.c` 实现（设备类型 `ps2-intc`），属于 `ps2-ee` 片上系统，映射在 `0x1000F000`，大小 `0x20`。

已模拟并经测试或启动验证（<Status s="verified" />）：

- I_STAT 上升沿锁存、写 1 清零（qtest `ps2/irq`、`ps2/iop-ssbus`）。
- I_MASK 写 1 翻转，输出 `(I_STAT & I_MASK) ≠ 0` 接到 R5900 的 IP2。没有 qtest 检查 I_MASK 本身；真实 BIOS 启动到 OSDSYS 依赖经 INTC 送达的中断，以此作为依据。
- DMAC 输出接 IP3（qtest `ps2/cop0` 中 DMAC 中断在 EI 之后立即进入）。
- R5900 的 Status.EIE 与 EI / DI 指令（EDI 为 0 时仅内核模式有效）；中断向量偏移固定为 `0x200`（qtest `ps2/cop0`）。
- 中断源：位 1 SBUS（IOP 写 ICFG 第 1 位，qtest `ps2/iop-ssbus`）、位 2 / 3 场消隐开始 / 结束（NTSC 59.94 Hz，PAL 50 Hz，结束在开始后 1.4 ms，qtest `ps2/irq`）、位 9～12 定时器 0～3 的比较相等（qtest `ps2/irq`）。

已实现但没有测试覆盖（<Status s="reference" />）：

- 位 0 GS 中断源（GS CSR 与 IMR）；COP0 定时器接 IP7。
- I_STAT、I_MASK 只保留低 16 位，高位读出为 0；复位时两者清零。

未模拟或有差异：

- 位 4～8（VIF0、VIF1、VU0、VU1、IPU）与位 13～15（SFIFO、VU0WD、PGPU）的中断源未接入，这些位不会被硬件置 1（<Status s="unimplemented" />）。QEMU 的 VIF、VU 模型（`hw/display/ps2_vif.c`、`ps2_vu*.c`）不产生中断；SIO 没有中断，Linux 以轮询方式使用。
- GS 的 HSINT 与 EDWINT 事件从不产生；GS 中断实际只来自 SIGNAL、FINISH 与 VSINT。
- INTC 按上升沿锁存；PCSX2 在中断源每次触发时直接置位，不判断边沿。在 QEMU 中，中断源信号保持为高时不会重复置位（见 4.5.1 节）。
- 写 I_STAT 或 I_MASK 后，INT0 立即按新值更新，不模拟总线写入延迟。
- `0x1000F000`–`0x1000FFFF` 中未被 INTC、SIO、SIF、MCH、D_ENABLER/W 占用的地址由未实现设备 `ps2.ee-sysregs` 占位，访问时记录 LOG_UNIMP。
