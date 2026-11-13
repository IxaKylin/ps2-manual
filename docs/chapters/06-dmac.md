# 第 6 章 DMA 控制器

EE 的 DMA 控制器（DMAC）负责在主存（或暂存存储器 SPR）与 EE 各外设的 FIFO 之间搬运数据，以四字（QW，128 位）为单位传输。图形数据送往 VIF/GIF、MPEG 数据送往 IPU、与 IOP 之间的 SIF 通信都经 DMAC 完成，R5900 只需在存储器中准备好数据和 DMAtag 链表，再启动通道即可。

## 6.1 概述

DMAC 有 10 个通道，每个通道固定连接一个外设端口（图 6-1）。DMAC 一侧接 EE 主总线（128 位），可访问主存；存储器地址第 31 位为 1 时改为访问 SPR。各通道互相独立，各有一组通道寄存器；另有一组全局寄存器用于总控制、中断状态与屏蔽、优先级控制、停顿控制和 MFIFO。

![图 6-1 DMAC 与 10 个通道](/img/fig6-1-dmac.svg)

主要特性：

- 10 个通道，传输单位为四字，每个数据块最多 65535 个四字；
- 三种逻辑传输模式：普通模式、链模式（源链 / 目的链）、交错模式（仅 SPR 通道）；
- 源链模式支持 8 种 DMAtag 和两级 call/ret 地址栈；
- 每个通道一个中断状态位，经 D_STAT 汇总后送往 R5900 的 INT1；
- 通道结束状态还送到 COP0 条件信号 CPCOND0，R5900 可用 BC0F/BC0T 指令查询；
- 停顿控制（stall control）与 MFIFO 环形缓冲区，用于在两个通道之间经主存流水传递数据。

### 6.1.1 通道一览

表 6-1 列出 10 个通道的外设、方向、基地址、支持的模式以及实际存在的通道寄存器。

**表 6-1 DMAC 通道**

| 通道 | 名称 | 方向 | 基地址 | 普通 | 链 | 交错 | 通道寄存器 | 数据通路 |
|---|---|---|---|---|---|---|---|---|
| 0 | VIF0 | 存储器 → VIF0 | `0x10008000` | √ | 源链 | — | CHCR、MADR、QWC、TADR、ASR0、ASR1 | <Status s="verified" /> |
| 1 | VIF1 | 双向，由 CHCR.DIR 选择 | `0x10009000` | √ | 源链 | — | CHCR、MADR、QWC、TADR、ASR0、ASR1 | <Status s="verified" />（VIF1 → 存储器方向只用于读出 GS 本地→主机传输的数据，普通模式） |
| 2 | GIF | 存储器 → GIF（PATH3） | `0x1000A000` | √ | 源链 | — | CHCR、MADR、QWC、TADR、ASR0、ASR1 | <Status s="reference" />（QEMU 已实现，但没有测试覆盖） |
| 3 | fromIPU | IPU → 存储器 | `0x1000B000` | √ | — | — | CHCR、MADR、QWC | <Status s="unimplemented" /> |
| 4 | toIPU | 存储器 → IPU | `0x1000B400` | √ | 源链 | — | CHCR、MADR、QWC、TADR | <Status s="unimplemented" /> |
| 5 | SIF0 | IOP → 存储器 | `0x1000C000` | √ | 目的链 | — | CHCR、MADR、QWC | <Status s="verified" /> |
| 6 | SIF1 | 存储器 → IOP | `0x1000C400` | √ | 源链 | — | CHCR、MADR、QWC、TADR | <Status s="verified" /> |
| 7 | SIF2 | 双向，由 CHCR.DIR 选择 | `0x1000C800` | √ | — | — | CHCR、MADR、QWC | <Status s="unimplemented" /> |
| 8 | fromSPR | SPR → 存储器 | `0x1000D000` | √ | 目的链 | √ | CHCR、MADR、QWC、SADR | <Status s="unimplemented" /> |
| 9 | toSPR | 存储器 → SPR | `0x1000D400` | √ | 源链 | √ | CHCR、MADR、QWC、TADR、SADR | <Status s="unimplemented" /> |

“数据通路”一列指 QEMU 是否为该通道接上了外设：0、1、2、5、6 号通道已接外设，其中 0、1、5、6 号通道有 qtest，2 号通道（GIF）没有 qtest 经 DMA 送数据（`ps2/gif` 直接写 GIF FIFO）；3、4、7、8、9 号通道的寄存器可以读写，但没有外设（见 6.9 节）。

### 6.1.2 寄存器的写法

10 个通道的通道寄存器格式完全相同，只是地址不同。本章不逐通道重复，而是用 `Dn_CHCR`、`Dn_MADR` 等名称描述一次，偏移相对于该通道的基地址：

| 寄存器 | 偏移 | 存在于通道 |
|---|---|---|
| Dn_CHCR | `+0x00` | 0–9 |
| Dn_MADR | `+0x10` | 0–9 |
| Dn_QWC | `+0x20` | 0–9 |
| Dn_TADR | `+0x30` | 0、1、2、4、6、9 |
| Dn_ASR0 | `+0x40` | 0、1、2 |
| Dn_ASR1 | `+0x50` | 0、1、2 |
| Dn_SADR | `+0x80` | 8、9 |

例如通道 2（GIF）的 CHCR 地址为 `0x1000A000 + 0x00 = 0x1000A000`，TADR 为 `0x1000A030`；通道 9 的 SADR 为 `0x1000D480`。习惯上也用外设名称称呼，如 `GIF_CHCR`、`SIF0_MADR`。

::: tip
QEMU 对每个通道都解码全部 7 个偏移，在不存在的寄存器（例如 D5_TADR）上读写不会报错。这些寄存器在真实硬件上不存在，程序不应依赖。
:::

全局寄存器使用绝对地址，位于 `0x1000E000`–`0x1000E060`；D_ENABLER、D_ENABLEW 位于 `0x1000F520`、`0x1000F590`，与 INTC、SIF 等共用 `0x1000F000` 页。

## 6.2 传输模式

传输模式由 Dn_CHCR.MOD 选择。

### 6.2.1 普通模式

普通模式（MOD = 0）传输一个连续的数据块：从 Dn_MADR 开始，共 Dn_QWC 个四字。传输过程中 MADR 递增、QWC 递减，QWC 减到 0 时通道结束：CHCR.STR 清零，D_STAT.CISn 置 1。

### 6.2.2 链模式

链模式（MOD = 1）由存储器中的 DMAtag 描述一串数据块。DMAtag 占一个四字，低 64 位为标签，高 64 位可以携带给外设的附加数据（6.3 节）。链模式分为两种：

- **源链（source chain）**：用于存储器 → 外设的通道（0、1、2、4、6、9）。DMAC 从 Dn_TADR 读入 DMAtag，按其 ID 确定数据块的位置并把数据送往外设，再计算下一个 DMAtag 的地址写回 TADR，如此循环，直到遇到结束条件。
- **目的链（destination chain）**：用于外设 → 存储器的通道（5 SIF0、8 fromSPR）。DMAtag 由外设随数据流送来：Dn_QWC 为 0 时，DMAC 把收到的下一个四字当作 DMAtag，取出目的地址装入 MADR、长度装入 QWC，然后把随后的数据写入该地址。SIF0 的 DMAtag 由 IOP 一侧在每个数据块前插入（第 11 章）。

源链的处理流程如下：

1. 从 TADR 读入一个四字，取低 64 位为 DMAtag，把其第 31:16 位复制到 CHCR.TAG；
2. 若 CHCR.TTE = 1，先把 DMAtag 的高 64 位送往外设；
3. 按 ID 确定数据块地址（MADR）和下一个 DMAtag 地址（TADR），call/ret 时更新 ASR0/ASR1 与 CHCR.ASP；
4. 传送 QWC 个四字（QWC 可为 0）；
5. 若 ID 为 refe 或 end，或 ret 时地址栈为空，或 DMAtag 的 IRQ 位为 1 且 CHCR.TIE = 1，则通道结束；否则回到第 1 步。

图 6-2 是一个源链的例子：cnt 标签带着紧随其后的两个四字，next 标签带一个四字并跳到 B 处；B 处的 ref 标签引用 C 处的三个四字，然后读入紧随其后的 end 标签，传输结束。

![图 6-2 源链模式示例](/img/fig6-2-dmatag.svg)

### 6.2.3 交错模式

交错模式（MOD = 2）只用于 SPR 通道 8/9，用来在 SPR 与主存中的矩形区域之间传输：每传输 D_SQWC.TQWC 个四字，主存一侧地址跳过 D_SQWC.SQWC 个四字，SPR 一侧地址连续。典型用途是从按行存放的图像中截取一块。<Status s="unimplemented" /> QEMU 不实现交错模式。

## 6.3 DMAtag

DMAtag 的位域见 6.7 节的 [DMAtag](#dmatag) 与 [DMAtag_DST](#dmatag-dst)。源链 DMAtag 的 ID 含义如表 6-2。表中“紧跟标签”指数据块从 DMAtag 之后的下一个四字（TADR + 16）开始。

**表 6-2 源链 DMAtag ID**

| ID | 名称 | 数据块地址（MADR） | 下一个 DMAtag 地址（TADR） | 结束 |
|---|---|---|---|---|
| 0 | refe | ADDR | TADR + 16 | 是 |
| 1 | cnt | 紧跟标签 | 数据块之后 | 否 |
| 2 | next | 紧跟标签 | ADDR | 否 |
| 3 | ref | ADDR | TADR + 16 | 否 |
| 4 | refs | ADDR，受停顿控制 | TADR + 16 | 否 |
| 5 | call | 紧跟标签 | ADDR；数据块之后的地址压入 ASR0/ASR1 | 否 |
| 6 | ret | 紧跟标签 | 从 ASR1/ASR0 弹出 | 栈空时是 |
| 7 | end | 紧跟标签 | 不变 | 是 |

目的链 DMAtag 只使用以下三种 ID：

**表 6-3 目的链 DMAtag ID**

| ID | 名称 | 含义 |
|---|---|---|
| 0 | cnts | 把随后 QWC 个四字写入 ADDR；若本通道是 D_CTRL.STS 选中的停顿源通道，同时更新 D_STADR |
| 1 | cnt | 把随后 QWC 个四字写入 ADDR，然后等待下一个 DMAtag |
| 7 | end | 把随后 QWC 个四字写入 ADDR，然后结束 |

地址栈最多两级：call 时把返回地址存入 ASR0（ASP = 0 时）或 ASR1（ASP = 1 时），ASP 加 1；ret 时 ASP 减 1 并取回地址。ASP 已为 2 时再执行 call 属于程序错误，QEMU 此时置 D_STAT.BEIS 并停止通道。

## 6.4 中断与 CPCOND0

### 6.4.1 中断

通道结束时 DMAC 将 D_STAT 中对应的 CISn 置 1。D_STAT 高 16 位是屏蔽位，当任一状态位与其屏蔽位同为 1，或总线错误状态 BEIS 为 1 时，DMAC 向 R5900 发出中断请求。DMAC 中断直接接到 R5900 的 **INT1**（Cause.IP3），不经过 INTC；INTC 的输出接 INT0（Cause.IP2，第 4 章）。因此使用 DMAC 中断时需要在 Status 中允许 IM3。

D_STAT 两个半部的写入规则不同（表 6-4）：

**表 6-4 D_STAT 写入规则**

| 位 | 内容 | 写 1 | 写 0 |
|---|---|---|---|
| 15:0 | 状态位 CIS、SIS、MEIS、BEIS | 清零 | 不变 |
| 31:16 | 屏蔽位 CIM、SIM、MEIM | 翻转 | 不变 |

屏蔽位是“写 1 翻转”而不是“写 1 置位”：对已经为 1 的屏蔽位再写 1 会把它关闭。允许中断前应先读 D_STAT 检查当前值；只想清除状态位时，写入值的高 16 位必须为 0。

### 6.4.2 CPCOND0 与 BC0F

R5900 的 COP0 条件信号 CPCOND0 由 DMAC 给出：

```
CPCOND0 = ((D_STAT.CIS | ~D_PCR.CPC) & 0x3FF) == 0x3FF
```

即 D_PCR.CPC 选中的所有通道的 CIS 都为 1 时 CPCOND0 为 1。程序可以用 `BC0F`（CPCOND0 为 0 时转移）循环等待一组通道全部结束，而不必反复读 D_STAT。复位后 CPC = 0，CPCOND0 恒为 1。

### 6.4.3 优先级与周期挪用 <Status s="reference" />

D_PCR.PCE = 1 时只有 D_PCR.CDE 中对应位为 1 的通道可以工作，DMAtag 的 PCE 位域可在链传输中将 D_PCR.PCE 清零或置 1。D_CTRL.RELE = 1 时启用周期挪用：DMAC 每占用总线 RCYC 指定的周期数（8–256）后把总线释放给 CPU，以免长时间传输使 CPU 停顿。D_ENABLEW.CPND 置 1 时所有通道暂停。这些机制 QEMU 均未模拟（见 6.9 节）。

## 6.5 停顿控制与 MFIFO <Status s="unimplemented" />

**停顿控制**用于两个通道之间经主存流水传递数据，例如 SIF0 从 IOP 收数据写入主存，同时 GIF 通道从同一区域读出送往 GS。D_CTRL.STS 选源通道，D_CTRL.STD 选排出通道。源通道写入主存时，DMAC 把写入地址记入 D_STADR；排出通道处理 refs 标签时，若要读的地址超过 D_STADR，就暂停等待，并置 D_STAT.SIS。

**MFIFO**（存储器 FIFO）用主存中的环形缓冲区连接 fromSPR 通道与 VIF1 或 GIF 通道：D_RBOR 为缓冲区起始地址，D_RBSR 为大小掩码，D_CTRL.MFD 选择排出通道。fromSPR 写入缓冲区，排出通道在缓冲区中循环读取；排出通道追上写入位置（缓冲区空）时置 D_STAT.MEIS。

QEMU 保存上述寄存器的值，并在 STS 源通道的目的链传输中更新 D_STADR，但排出通道不会暂停，MFIFO 不起作用。

## 6.6 寄存器汇总

通道寄存器（名称以 `Dn_` 开头）的“地址”列为相对于通道基地址的偏移（表 6-1）；全局寄存器为绝对地址。

<RegSummary block="ee-dmac" />

DMAtag 不是寄存器，没有总线地址，这里按寄存器的格式列出，便于查阅位域：

<RegSummary block="ee-dmatag" />

## 6.7 寄存器说明

### Dn_CHCR
<Reg block="ee-dmac" name="Dn_CHCR" />

### Dn_MADR
<Reg block="ee-dmac" name="Dn_MADR" />

### Dn_QWC
<Reg block="ee-dmac" name="Dn_QWC" />

### Dn_TADR
<Reg block="ee-dmac" name="Dn_TADR" />

### Dn_ASR0
<Reg block="ee-dmac" name="Dn_ASR0" />

### Dn_ASR1
<Reg block="ee-dmac" name="Dn_ASR1" />

### Dn_SADR
<Reg block="ee-dmac" name="Dn_SADR" />

### D_CTRL
<Reg block="ee-dmac" name="D_CTRL" />

### D_STAT
<Reg block="ee-dmac" name="D_STAT" />

### D_PCR
<Reg block="ee-dmac" name="D_PCR" />

### D_SQWC
<Reg block="ee-dmac" name="D_SQWC" />

### D_RBSR
<Reg block="ee-dmac" name="D_RBSR" />

### D_RBOR
<Reg block="ee-dmac" name="D_RBOR" />

### D_STADR
<Reg block="ee-dmac" name="D_STADR" />

### D_ENABLER
<Reg block="ee-dmac" name="D_ENABLER" />

### D_ENABLEW
<Reg block="ee-dmac" name="D_ENABLEW" />

### DMAtag
<Reg block="ee-dmatag" name="DMAtag" />

### DMAtag_DST
<Reg block="ee-dmatag" name="DMAtag_DST" />

## 6.8 编程要点

### 6.8.1 初始化

1. 写 D_CTRL = `0x00000001`（DMAE = 1，不使用周期挪用、MFIFO 和停顿控制）。
2. 写 D_PCR = `0x00000000`（不使用优先级控制，CPCOND0 不依赖任何通道）。
3. 写 D_STAT = `0x0000E3FF`，清除全部状态位（高 16 位为 0，屏蔽位不变）。
4. 读 D_STAT，对需要中断的通道 n，若 CIMn 为 0，写 `1 << (16 + n)` 将其打开。
5. 在 R5900 的 Status 中允许 IM3 与 IE、EIE，安装 INT1 处理程序。

### 6.8.2 源链传输到 GIF

以图 6-2 的链表为例，向 GIF（PATH3）发送一串 GIF 数据包：

1. 在主存中构造 DMAtag 链表与数据，每个 DMAtag 和数据块按 16 字节对齐；最后一个标签用 end（或 refe）。
2. 确保链表已写入主存：若经缓存写入，须先回写数据缓存，或者经不缓存段写入。
3. 等待通道 2 空闲：读 D2_CHCR（`0x1000A000`），确认 STR = 0。
4. 写 D_STAT = `0x00000004`，清除 CIS2。
5. 写 D2_TADR（`0x1000A030`）= 链表首地址，D2_QWC（`0x1000A020`）= 0。
6. 写 D2_CHCR = `0x00000104`：MOD = 1（链模式），ASP = 0，TTE = 0，TIE = 0，STR = 1。需要在某个标签处提前结束时，置 TIE（写 `0x00000184`）并在该标签中置 IRQ 位。
7. 等待结束，以下方式任选其一：
   - 循环读 D2_CHCR，直到 STR = 0；
   - 写 D_PCR = `0x00000004`，然后执行 `1: bc0f 1b; nop`，CIS2 置 1 后 CPCOND0 变为 1，退出循环；
   - 打开 CIM2，在 INT1 处理程序中检查 CIS2，处理完后写 `0x00000004` 清除。

::: warning
VIF 通道常用 TTE = 1 让 DMAtag 的高 64 位携带 VIFcode；GIF 通道一般应使 TTE = 0，否则 DMAtag 的高 64 位会被当作 GIF 数据。
:::

### 6.8.3 普通模式传输

1. 写 Dn_MADR = 数据地址，Dn_QWC = 四字数；
2. 写 Dn_CHCR = `0x00000100`（VIF1/SIF2 存储器 → 外设时为 `0x00000101`）；
3. 按 6.8.2 节第 7 步的方式等待结束。

### 6.8.4 修改正在运行的通道 <Status s="reference" />

修改正在运行通道的寄存器前，常见做法是先读 D_ENABLER，将读出值或上 `0x00010000` 写入 D_ENABLEW，挂起全部 DMA；修改完成后再写回清除第 16 位的值。QEMU 不模拟挂起：通道启动后连续传输，只在外设 FIFO 满时暂停（见 6.9 节），因此在 QEMU 中修改运行中通道的寄存器结果不可预期。

## 6.9 QEMU 模型说明

QEMU 中 DMAC 由 `hw/dma/ps2_dmac.c` 实现（设备类型 `ps2-dmac`），挂在 `ps2-ee` 片上系统中：通道与全局寄存器映射在 `0x10008000`（窗口 `0x6100`），D_ENABLER/D_ENABLEW 映射在 `0x1000F500`（窗口 `0x100`）。寄存器按 32 位实现，64 位访问按低 32 位处理。中断输出接 R5900 的 IP3，`cpcond0` GPIO 接 CPU。DMAC 使用自己的地址空间：低 2 GB 为 EE 总线，`0x80000000` 起为 SPR。相关 qtest：`ps2/dmac/spr`（SIF0/SIF1 经 SPR 的链传输、VIF1 读出到 SPR）、`ps2/sif-dma`（SIF0 目的链、SIF1 源链与反压、ASP = 0 的 ret 标签）、`ps2/lite-bios/sif`（TIE 与目的链 DMAtag 的 IRQ 位）、`ps2/cop0`（CPCOND0、CIS0 中断）、`ps2/vif0`（通道 0 普通模式与 TTE 源链）。

已模拟：

| 功能 | 说明 |
|---|---|
| 启动 | CHCR.STR 由 0 变为 1 时启动通道 |
| 普通模式与源链 | 存储器 → 外设通道支持普通模式与全部 8 种源链 DMAtag，ASR0/ASR1 两级栈；TTE 送出 DMAtag 高 64 位；TIE 与 IRQ 位结束传输；每次传输最多处理 65536 个 DMAtag |
| 反压 | 外设 FIFO 满时通道暂停，外设有空间后继续 |
| 外设 → 存储器 | fromIPU、SIF0、fromSPR 以及 DIR = 0 的 VIF1、SIF2 等待外设送数据（VIF1 一次读出 QWC 个四字的 GS 本地→主机传输数据，见第 9 章）；支持目的链 DMAtag（cnts 更新 D_STADR） |
| SPR 地址 | MADR/TADR/DMAtag 地址第 31 位选择 SPR，SPR 内偏移按 `0x3FF0` 掩码并回绕 |
| D_STAT | CIS 写 1 清零、CIM 写 1 翻转；BEIS 不受屏蔽 |
| CPCOND0 | 写 D_STAT、D_PCR 以及复位时重新计算 |
| 总线错误 | 访问失败、call 超过两级、DMAtag 数超限时置 BEIS |

未模拟或与硬件不同：

| 功能 | 说明 |
|---|---|
| 传输时间 | 传输立即完成，没有周期挪用；D_CTRL.RELE、RCYC 无效 |
| DMA 总允许 | 不检查 D_CTRL.DMAE |
| 优先级控制 | D_PCR.CDE、PCE 与 DMAtag 的 PCE 位域无效 |
| MFIFO | D_CTRL.MFD、D_RBSR、D_RBOR 只保存，D_STAT.MEIS 不会置位 |
| 停顿控制 | D_CTRL.STD 只保存，refs 按 ref 处理，D_STAT.SIS 不会置位 |
| D_ENABLEW | 只保存（复位值 `0x1201`），CPND 不挂起传输；读 D_ENABLER 返回同一值，写 D_ENABLER 被忽略 |
| D_SQWC 与交错模式 | 只保存，MOD = 2 按普通模式处理 |
| SPR 通道 8/9 | 没有外设：toSPR 读主存后丢弃数据，fromSPR 永不完成；SADR 按 `0x3FF0` 掩码保存 |
| IPU 通道 3/4 | IPU 未实现：toIPU 读主存后丢弃数据，fromIPU 永不完成 |
| SIF2 通道 7 | 没有外设 |
| 地址别名 | 不模拟 `0x7xxxxxxx` 形式的 SPR 别名，也不模拟主存地址镜像 |
| 不存在的寄存器 | 每个通道都解码 7 个偏移，不存在的寄存器也可读写 |

“已模拟”表中的下列功能 QEMU 已实现，但没有测试覆盖，寄存器说明中按参考级（<Status s="reference" />）标注：GIF 通道 2 的数据通路；call 标签与 ASR0/ASR1、CHCR.ASP 的压栈与出栈；next、ref、refs 标签；源链 DMAtag 的 IRQ 位；目的链 cnts 标签与 D_CTRL.STS、D_STADR；D_STAT.BEIS 与总线错误；65536 个 DMAtag 的上限。D_STAT.SIM、MEIM 与 D_ENABLER/D_ENABLEW 只保存写入值，按未实现（<Status s="unimplemented" />）标注。

## 6.10 参考资料

- QEMU `include/hw/dma/ps2_dmac.h`、`hw/dma/ps2_dmac.c`、`hw/mips/ps2_ee.c`
- PCSX2 pcsx2/Dmac.h:19（DMAtag ID）、pcsx2/Dmac.h:110（CHCR）、pcsx2/Dmac.h:317–424（全局寄存器）、pcsx2/Hw.h:178–330（寄存器地址）、pcsx2/COP0.cpp:593（CPCOND0）
- ps2tek §EE DMAC
