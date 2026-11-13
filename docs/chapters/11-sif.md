# 第 11 章 子系统接口 SIF

子系统接口（Subsystem Interface，SIF）连接 EE 与 IOP 两个处理器。两侧各有独立的物理地址空间，IOP 不能直接访问 EE 的主存，EE 经 SBUS 窗口访问 IOP 内存的速度又很低，因此两者之间的通信都经 SIF 完成：少量控制信息经一组两侧共用的寄存器传递，成块的数据经两个方向的 FIFO 由两侧的 DMA 控制器搬运。在此之上，系统软件定义了 SIF 命令与 RPC（远程过程调用）两层协议，游戏访问光驱、存储卡、手柄、声音等 IOP 外设都要经过这两层。

## 11.1 概述

SIF 由以下几部分组成（图 11-1）：

- **共用寄存器**：MAINADDR（MSCOM）、SUBADDR（SMCOM）、MSFLAG、SMFLAG、CTRL、BD6 共 6 个 32 位寄存器。EE 从 `0x1000F200` 起访问，IOP 从 `0x1D000000` 起访问，偏移相同，读出的是同一组值，但两侧的写入规则不同（11.2 节）。
- **SIF0 通道**（IOP → EE）：IOP DMA 通道 9 把 IOP 内存中的数据送入 SIF0 FIFO，EE DMAC 通道 5 从 FIFO 取出写入主存。
- **SIF1 通道**（EE → IOP）：EE DMAC 通道 6 把主存中的数据送入 SIF1 FIFO，IOP DMA 通道 10 从 FIFO 取出写入 IOP 内存。
- **SIF2 通道**（双向）：EE DMAC 通道 7 与 IOP DMA 通道 2 之间的通道，用于 PS1 兼容模式（IOP 一侧作 GPU 通道）与调试 <Status s="unimplemented" />。
- **SBUS 中断**：IOP 以 16 位或 32 位宽度向 ICFG（IOP 地址 `0x1F801450`）写入第 1 位为 1 的值时，EE INTC 的 1 号中断源 SBUS 置位（第 4 章）<Status s="verified" />。反方向上，PCSX2 在 EE 写 CTRL 第 18 位时向 IOP INTC 的 1 号中断源发中断，只用于 PS1 兼容模式 <Status s="unimplemented" />。

![图 11-1 SIF 数据通路](/img/fig11-1-sif.svg)

主要特性：

- SIF0、SIF1 各有一个 128 字（32 位字，即 32 个四字）的 FIFO；
- 两侧 DMA 都在链模式下工作，DMA 标签随数据经 FIFO 传给对方，一次启动即可完成多个数据块的分散 / 聚集传输；
- FIFO 满时发送方暂停，接收方取走数据后继续；FIFO 空时接收方等待，不会结束传输；
- 两个标志寄存器一侧只能置位、另一侧只能清零，可用作简单的信号量，引导时的握手就靠它们完成。

## 11.2 共用寄存器

表 11-1 列出两侧的地址与访问规则。“置位”指写入值中为 1 的位置 1，其余位不变；“清零”指写入值中为 1 的位清零，其余位不变。

**表 11-1 SIF 寄存器的两侧视图**

| 寄存器 | 偏移 | EE 地址 | IOP 地址 | EE 读 | EE 写 | IOP 读 | IOP 写 |
|---|---|---|---|---|---|---|---|
| MAINADDR（MSCOM） | `0x00` | `0x1000F200` | `0x1D000000` | 存储值 | 保存 | 存储值 | 忽略 |
| SUBADDR（SMCOM） | `0x10` | `0x1000F210` | `0x1D000010` | 存储值 | 忽略 | 存储值 | 保存 |
| MSFLAG（MSFLG） | `0x20` | `0x1000F220` | `0x1D000020` | 存储值 | 置位 | 存储值 | 清零 |
| SMFLAG（SMFLG） | `0x30` | `0x1000F230` | `0x1D000030` | 存储值 | 清零 | 存储值 | 置位 |
| CTRL | `0x40` | `0x1000F240` | `0x1D000040` | 存储值或上 `0xF0000102` | 只保存第 8 位 | 存储值或上 `0xF0000002` | 写 1 的第 7:4 位：其中任一位原为 1 则这些位全清，否则全置；写第 5/7 位时第 15:12 位置为 2，见 [CTRL](#ctrl) |
| BD6 | `0x60` | `0x1000F260` | `0x1D000060` | 存储值 | 保存 | 恒为 0 | 清零整个寄存器 |

名称中的 M（main）指 EE，S（sub）指 IOP：MS 是 EE → IOP 方向，SM 是 IOP → EE 方向。每个方向有一个通信字（COM）和一个标志字（FLG）：通信字只能由发送方写；标志字由发送方置位、接收方清零。

通信字在硬件上只是 32 位数据，系统软件用它们交换缓冲区地址：IOP 把自己的命令接收缓冲区地址写入 SMCOM，EE 读出后把命令包经 SIF1 发往该地址；Sony BIOS 中 EE 把一个主存地址写入 MSCOM。标志字的 32 位同样没有固定含义，引导时使用第 16～18 位（表 11-2）。

**表 11-2 引导标志**

| 值 | 名称 | 在 SMFLAG 中（IOP 置位） | 在 MSFLAG 中（EE 置位） |
|---|---|---|---|
| `0x00010000` | SIFINIT | IOP 的 SIF 与 DMA 已初始化 | EE 一侧 SIF 已初始化；IOP 等到此位为 1 后才开始 SIF 初始化 |
| `0x00020000` | CMDINIT | IOP 的命令层已就绪，SMCOM 中已是命令缓冲区地址 | ps2sdk 的 IOP sifcmd 收到 opt = 0 的 INIT_CMD 后向 MSFLAG 写此位，按硬件规则效果是清除该位 <Status s="reference" /> |
| `0x00040000` | BOOTEND | IOP 引导结束（模块加载完成） | — |

## 11.3 SIF DMA

### 11.3.1 FIFO

每个方向一个 FIFO，容量 128 个 32 位字。EE 一侧以四字为单位读写 FIFO，IOP 一侧以 32 位字为单位读写。发送方在 FIFO 没有足够空间时暂停，接收方取走数据后发送方继续；接收方在 FIFO 中没有数据时等待。因此两侧的通道可以按任意顺序启动，只要两侧都已启动，传输就会完成。

### 11.3.2 SIF0：IOP → EE

IOP DMA 通道 9 必须以链模式（CHCR 第 8 位为 1）启动。通道的 TADR 指向 IOP 内存中的标签表，每个标签占 4 个字（16 字节），依次排列：

**表 11-3 SIF0 的 IOP 标签**

| 字 | 位 | 内容 |
|---|---|---|
| 0 | 23:0 | 本块数据在 IOP 内存中的地址 |
| 0 | 30 | INT：本块传完后结束通道（ps2sdk 中对应传输属性 SIF_DMA_INT_I） |
| 0 | 31 | ERT：本块传完后结束通道，标签表的最后一个标签置此位 |
| 1 | 19:0 | 本块数据的字数（32 位字） |
| 2、3 | 63:0 | EE 一侧的目的链 DMAtag（第 6 章 [DMAtag_DST](/chapters/06-dmac#dmatag-dst)）：QWC、ID、IRQ 与 EE 目的地址 |

对每个标签，IOP DMA 先把字 2、3（EE DMAtag）连同其后的 64 位作为一个四字送入 FIFO，再从字 0 给出的地址读取字 1 给出的字数送入 FIFO，然后 TADR 加 16，处理下一个标签。EE DMAC 通道 5 以目的链模式工作：把收到的第一个四字当作 DMAtag，取出 ADDR 与 QWC，把随后的 QWC 个四字写到 ADDR，再等待下一个 DMAtag。DMAtag 的 IRQ 位为 1 且 D5_CHCR.TIE 为 1，或 ID 为 end 时，EE 一侧结束。

数据字数不是 4 的倍数时，最后一个四字不完整，SIF 用前一个完整四字中相应位置的字补齐。补齐的内容没有意义，接收缓冲区应按四字分配，程序不应依赖补齐部分。

ps2sdk 的 IOP sifman 按如下方式构造 SIF0 标签 <Status s="reference" />：字 0 = 源地址 & `0xFFFFFF`，最后一个标签再或上 `0x80000000`；字 1 = 字节数向上取整得到的字数；字 2 = 四字数或上 `0x10000000`（ID = cnt），需要在 EE 一侧结束并产生中断时再或上 `0x80000000`（IRQ）；字 3 = 目的地址 & `0x1FFFFFFF`。

### 11.3.3 SIF1：EE → IOP

EE DMAC 通道 6 以源链模式工作，DMAtag 链表的格式与其他通道相同（第 6 章）。IOP 一侧所需的标签由数据本身携带：EE 一侧每个数据块的第一个四字就是 IOP 标签，格式如表 11-4。

**表 11-4 SIF1 的 IOP 标签（数据块的第一个四字）**

| 字 | 位 | 内容 |
|---|---|---|
| 0 | 23:0 | 本块数据在 IOP 内存中的目的地址 |
| 0 | 30 | INT：本块收完后结束通道 |
| 0 | 31 | ERT：本块收完后结束通道 |
| 1 | 19:2 | 本块数据的字数，按 4 的倍数计（低 2 位忽略） |
| 2、3 | — | 不使用 |

IOP DMA 通道 10 以链模式启动后，从 FIFO 取出一个四字作为 IOP 标签，再把随后的数据写到目的地址，如此循环，直到某个标签的 ERT 或 INT 位为 1。IOP 一侧的 SIF0、SIF1 通道结束时，DICR2 中对应的标志总会置 1，与屏蔽位无关；中断经 IOP INTC 的 3 号中断源（DMA）送往 R3000A。

ps2sdk 的 IOP sifman 与 ps2-lite-bios 都把通道 10 设为 BCR 低 16 位 = `0x20`、CHCR = `0x41000300`，预先启动（武装）通道 10 等待数据；两者启动 SIF0 通道时都先把通道 9 的 BCR 低 16 位设为 `0x20`，再写 CHCR = `0x01000701`。

## 11.4 SIF 命令协议 <Status s="reference" />

SIF 命令与 RPC 是系统软件之间的约定，不是硬件功能，这里只介绍与引导和 QEMU 测试有关的部分。

### 11.4.1 命令包

一个命令包由 16 字节的包头和可选的参数组成，总长不超过 112 字节（7 个四字）。包头格式如表 11-5。

**表 11-5 SIF 命令包头**

| 偏移 | 位 | 名称 | 含义 |
|---|---|---|---|
| `0x00` | 7:0 | psize | 命令包长度（字节，含包头） |
| `0x00` | 31:8 | dsize | 附带数据的长度；没有附带数据时为 0 |
| `0x04` | 31:0 | dest | 附带数据在对方存储器中的目的地址 |
| `0x08` | 31:0 | cid | 命令号；第 31 位为 1 表示系统命令 |
| `0x0C` | 31:0 | opt | 由各命令自行定义 |

发送方把附带数据和命令包作为一次 SIF DMA 中的两个数据块发出：附带数据直接送到 dest，命令包送到对方的命令接收缓冲区。EE 发给 IOP 的命令经 SIF1 送到 SMCOM 给出的地址；IOP 发给 EE 的命令经 SIF0 送到 EE 用 INIT_CMD 或 CHANGE_SADDR 告知的地址，并在 EE DMAtag 中置 IRQ 位，使 EE DMAC 通道 5 结束并产生中断。接收方的中断处理程序按 cid 查找命令处理程序并调用。

**表 11-6 系统命令**

| cid | 名称 | 方向 | 含义 |
|---|---|---|---|
| `0x80000000` | CHANGE_SADDR | EE → IOP | 通知 IOP 新的 EE 命令接收地址 |
| `0x80000001` | SET_SREG | 双向 | 设置对方的软件寄存器（共 32 个，0～7 由系统使用），参数为编号与值。ps2-lite-bios 中称 WRITE_SREG |
| `0x80000002` | INIT_CMD | EE → IOP | opt = 0：参数为 EE 命令接收地址；opt = 1：请求 IOP 在 RPC 层就绪后把 EE 的软件寄存器 0（RPCINIT）置 1 |
| `0x80000003` | RESET_CMD | EE → IOP | 重新引导 IOP，参数中带有引导参数字符串 |
| `0x80000008` | RPC_END | IOP → EE | RPC 应答 |
| `0x80000009` | RPC_BIND | EE → IOP | 按服务器号查找 RPC 服务器 |
| `0x8000000A` | RPC_CALL | EE → IOP | 调用 RPC 服务器的函数 |
| `0x8000000C` | RPC_RDATA | EE → IOP | 请求 IOP 把一块 IOP 内存送到 EE |

### 11.4.2 RPC

RPC 建立在命令层之上。IOP 模块创建一个线程，注册 RPC 队列与服务器（服务器号如 `0x80000001` 为 FILEIO），然后在循环中睡眠等待请求。EE 一侧的调用过程：

1. 发送 RPC_BIND，给出服务器号；IOP 查找服务器后以 RPC_END 应答，其中带有服务器结构在 IOP 内存中的地址。
2. 发送 RPC_CALL，给出函数号、参数缓冲区与接收缓冲区；参数作为附带数据直接送到服务器的缓冲区。
3. IOP 唤醒服务器线程执行函数，再以 RPC_END 应答，结果作为附带数据写入 EE 的接收缓冲区。

ps2-lite-bios 实现了上述 BIND / CALL / END 流程以及 CHANGE_SADDR、WRITE_SREG、INIT_CMD、RESET_CMD 系统命令，并提供 HEAP 与 LOADFILE 两个 RPC 服务器供 Linux 使用。qtest `ps2/lite-bios/sif` 覆盖 RESET_CMD、INIT_CMD、RPC_BIND / CALL / END 与 IOP → EE 的 WRITE_SREG <Status s="verified" />；CHANGE_SADDR 与 EE → IOP 的 WRITE_SREG 是 QEMU 已实现，但没有测试覆盖 <Status s="reference" />。RPC_RDATA 与其他服务器只依据 ps2sdk 与 ps2tek。

## 11.5 寄存器汇总

“地址”列为 EE 地址；IOP 地址为 `0x1D000000` 加相同偏移。

<RegSummary block="sif" />

## 11.6 寄存器说明

### MAINADDR
<Reg block="sif" name="MAINADDR" />

### SUBADDR
<Reg block="sif" name="SUBADDR" />

### MSFLAG
<Reg block="sif" name="MSFLAG" />

### SMFLAG
<Reg block="sif" name="SMFLAG" />

### CTRL
<Reg block="sif" name="CTRL" />

### BD6
<Reg block="sif" name="BD6" />

## 11.7 编程要点

### 11.7.1 引导握手

图 11-2 上半部分是 Sony BIOS 引导时对 SIF 寄存器与 SIF DMA 的访问顺序，取自 QEMU 运行真实 BIOS 时的跟踪记录；下半部分是 Linux 内核与 ps2-lite-bios 的握手，由 qtest 验证。

![图 11-2 引导时的 SIF 握手](/img/fig11-2-sif-boot.svg)

Sony BIOS 的握手过程如下 <Status s="verified" />：

1. EE 写 CTRL = `0x00000100`、BD6 = `0xFF`、MAINADDR = `0x80021080`、MSFLAG = `0x00010000`（SIFINIT），然后循环读 SMFLAG。
2. IOP 初始化 SSBUS、ICFG 与 DMA 后读 BD6，再循环读 MSFLAG，等到 SIFINIT 为 1。
3. IOP 写 CTRL = `0x40`、SUBADDR = 0，再写 SMFLAG = `0x00010000`（SIFINIT）；然后写 SUBADDR = `0x00019600`（命令缓冲区），再依次向 SMFLAG 写 `0x00040000`（BOOTEND）、`0x00020000`（CMDINIT）。
4. EE 读到 SMFLAG = `0x00070000`，写 SMFLAG = `0x00040000` 清除 BOOTEND，以便之后等待模块加载结束。
5. EE 经 SIF1 向 IOP `0x019600` 发送 8 个字；IOP 经 SIF0 向 EE `0x019870` 发送 6 个字。EE 的 EELOAD 开始运行。
6. IOP 按 IOPBTCONF 加载模块后再次置位 SMFLAG.BOOTEND（ps2sdk 中由 EESYNC 模块完成）；EE 继续引导，直到 OSDSYS 画出主菜单。

ps2-lite-bios 的 IOP 程序先等待 EE 清除上一次引导留下的 SIFINIT、CMDINIT，预先启动 SIF1 接收通道（通道 10）等待数据，写 SUBADDR = 命令缓冲区地址，写 SMFLAG = `0x00030000`，最后写 SMFLAG = `0x00040000`。EE 一侧的 ps2-lite-bios 代码等到 BOOTEND 后跳到 Linux 内核入口。Linux 的 `sif_init` 先发 RESET_CMD 使 IOP 重新引导并再次完成上述握手，然后发 INIT_CMD（opt = 0，给出 EE 命令接收地址）和 INIT_CMD（opt = 1），IOP 以 WRITE_SREG（0, 1）应答，EE 的软件寄存器 0 置 1 后 RPC 层就绪。

### 11.7.2 EE 向 IOP 发送数据

1. 确认 IOP 一侧的通道 10 已在链模式下启动（引导完成后 IOP 的 SIF 模块一直保持该通道处于启动状态）。
2. 在主存中构造源链：每个数据块的第一个四字为 IOP 标签（表 11-4），最后一个块的 IOP 标签置 ERT（第 31 位）；需要在 IOP 一侧结束并中断时置 INT（第 30 位）。
3. 若经缓存写入，先回写数据缓存。
4. 写 D6_TADR = 链表首地址、D6_QWC = 0，再写 D6_CHCR = `0x00000184`（链模式，TIE，STR）并用 DMAtag 的 IRQ 位结束；用 end 标签结束时写 `0x00000104`。
5. 等待 D6_CHCR.STR 为 0 或 D_STAT.CIS6 为 1。

### 11.7.3 IOP 向 EE 发送数据

1. EE 一侧预先启动通道 5：D5_QWC = 0，D5_CHCR = `0x00000184`（目的链，TIE，STR）。
2. IOP 在 IOP 内存中构造标签表（表 11-3），最后一个标签的字 0 置 ERT，字 2 中的 EE DMAtag 置 IRQ。
3. IOP 在 DPCR2 中允许通道 9（ps2sdk 与 ps2-lite-bios 写 DPCR2 或上 `0x8800`，同时允许通道 9、10），写通道 9 的 TADR = 标签表地址，再写 CHCR = `0x01000701`。
4. IOP 一侧等待 DICR2 中通道 9 的标志置 1 或通道 9 的 CHCR 第 24 位清零；EE 一侧等待 D5_CHCR.STR 为 0。

::: warning
EE 通道 5 结束后若不及时重新启动，IOP 之后送来的数据会留在 FIFO 中，FIFO 满后 IOP 通道 9 暂停。系统软件通常在 SIF0 中断处理程序中立即重新启动通道 5。
:::

## 11.8 QEMU 模型说明

QEMU 中 SIF 由 `hw/misc/ps2_sif.c` 实现（设备类型 `ps2-sif`），是板级设备 `/machine/sif`，不属于 EE 或 IOP 片上系统。它有两个 MMIO 区域：区域 0 映射在 EE `0x1000F200`，区域 1 映射在 IOP 总线 `0x1D000000`，各 `0x100` 字节，只实现 32 位访问。设备通过 `dmac`、`iop-dma`、`iop-memory` 三个链接接到 EE DMAC、IOP DMA 与 IOP 总线，并把 EE DMAC 通道 5、6 与 IOP DMA 通道 9、10 的数据通路接到两个 128 字的 FIFO 上。

当前版本中 SIF 不含高层模拟（HLE）：QEMU 只提供寄存器与 FIFO DMA，原先代替 IOP 应答命令、RPC、HEAP、LOADFILE 与转发中断的代码，以及 `iop-hle` 属性均已删除。两种引导方式都运行真实的 R3000A 代码：使用 Sony BIOS 时由 BIOS 的 IOP 程序完成握手；用 `-kernel` 启动 Linux 时，板子把 ps2-lite-bios 放在 ROM0 中，由它的 IOP 内核提供 SIF 命令与 RPC 服务。复位后 SMFLAG 为 0，QEMU 不会替 IOP 置位。

相关 qtest：`ps2/sif-ee`（EE 一侧读写规则与复位值）、`ps2/sif-iop`（IOP 程序访问 IOP 一侧，与 EE 一侧对照）、`ps2/sif-dma`（SIF0 与 SIF1 双向 DMA、FIFO 满时暂停与继续、不完整四字的补齐）、`ps2/dmac/spr`（经 SPR 的 SIF 传输）、`ps2/lite-bios/sif`（Linux 的 SIF 初始化与 RPC）。Sony BIOS 引导到 OSDSYS 的过程也经过了 SIF 握手与 SIF DMA。

已模拟：

| 功能 | 说明 |
|---|---|
| 寄存器 | 表 11-1 中两侧的全部读写规则；CTRL 的固定读出位与 IOP 一侧的全清或全置规则 |
| SIF0 | IOP 标签、EE DMAtag 入队、数据入队、不完整四字补齐、ERT/INT 结束；FIFO 满时 IOP 一侧暂停 |
| SIF1 | 每块首个四字作为 IOP 标签；FIFO 满时 EE 通道 6 暂停，IOP 通道 10 取走数据后继续 |
| 防失控 | SIF0 一次启动最多推进 2<sup>20</sup> 轮，超过时记录 guest error |
| 迁移 | 寄存器、FIFO 与两个方向的传输状态都保存在 vmstate 中 |

未模拟或与硬件不同：

| 功能 | 说明 |
|---|---|
| SIF2 | EE 通道 7 与 IOP 通道 2 都没有外设，PS1 兼容模式不可用 |
| CTRL 第 18、19 位 | EE 写 1 只记录 LOG_UNIMP，不向 IOP 发中断，也不复位 IOP |
| 非链模式 | IOP 通道 9、10 不带标签（CHCR 第 8 位为 0）启动时立即结束，并记录 LOG_UNIMP |
| 访问宽度 | 只实现 32 位访问；PCSX2 中的 16 位访问与 `mem & 0x8F0` 地址别名未模拟 |
| EE 写 SMCOM | 按 ps2tek 忽略；PCSX2 会保存写入值 |
| 传输时间 | 传输立即完成，没有 FIFO 的时序 |
| SIF0 启动时的内部状态 | 与 PCSX2 不完全一致，是已记录的差异 |

## 11.9 来源

- QEMU `include/hw/misc/ps2_sif.h`、`hw/misc/ps2_sif.c`、`hw/mips/ps2.c`、`tests/qtest/ps2-test.c`、`pc-bios/ps2-lite-bios/sif.c`
- PCSX2 pcsx2/Sif.h:6（FIFO 大小）、pcsx2/Sif.h:8–19（IOP 标签）、pcsx2/HwWrite.cpp:158–199、pcsx2/HwRead.cpp:149–158、pcsx2/IopMem.cpp:218–245、pcsx2/IopMem.cpp:408–447、pcsx2/Hw.cpp:35
- ps2sdk common/include/sifcmd-common.h:21–49（命令包头、系统命令号）、iop/system/sifman/include/sifman.h:59–65（引导标志）、iop/system/sifman/src/sifman.c:121–149（sceSifInit）、iop/system/sifman/src/sifman.c:170–178（SIF1 接收准备）、iop/system/sifman/src/sifman.c:245–257（SIF0 标签）、iop/system/sifcmd/src/sifcmd.c:89–101、ee/kernel/src/sifcmd.c:255–283、ee/kernel/src/sifrpc.c:440–458、iop/system/eesync/src/eesync.c:39
- ps2tek §Subsystem Interface (SIF)、§IOP DMA
