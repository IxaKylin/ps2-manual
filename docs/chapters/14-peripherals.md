# 第 14 章 外设

本章说明 CDVD（第 13 章）以外的各个外设接口。

- IOP 一侧有手柄与存储卡使用的串行接口 SIO2、声音处理器 SPU2、扩展接口 DEV9（及其后的 SPEED 芯片与 ATA 硬盘接口）、USB 主控制器和 i.LINK 接口。
- EE 一侧有调试串口 SIO、存储器控制器 MCH 的 RDRAM 初始化接口和视频编码器 DVE 的串行端口。

表 14-1 列出各接口的地址、中断与 DMA 通道，以及 QEMU 的实现情况。

**表 14-1 外设一览**

| 外设 | 总线 | 地址 | 中断 | DMA | QEMU |
|---|---|---|---|---|---|
| SIO2（手柄、存储卡） | IOP | `0x1F808200`–`0x1F8082FF` | IOP INTC 17 | IOP 通道 11（SIO2in）、12（SIO2out） | <Status s="verified" />，无外设 |
| SPU2 | IOP | `0x1F900000`–`0x1F9007FF` | IOP INTC 9 | IOP 通道 4（核心 0）、7（核心 1） | <Status s="verified" />，不发声 |
| DEV9 桥接 | IOP | `0x1F801460`–`0x1F80147F` | — | — | <Status s="reference" /> |
| SPEED / ATA | IOP | `0x10000000`–`0x1000FFFF`（EE 经 `0x14000000`） | IOP INTC 13 | IOP 通道 8（未实现） | <Status s="verified" /> |
| USB OHCI | IOP | `0x1F801600`–`0x1F8016FF` | IOP INTC 22 | 总线主控 | <Status s="verified" /> |
| i.LINK | IOP | `0x1F808400`–`0x1F8085FF` | — | — | <Status s="unimplemented" /> |
| EE SIO 调试串口 | EE | `0x1000F100`–`0x1000F1FF` | — | — | <Status s="reference" />，发送已验证 |
| MCH | EE | `0x1000F430`、`0x1000F440` | — | — | <Status s="verified" /> |
| DVE | EE | `0x1A000000`–`0x1A00001F` | — | — | <Status s="verified" /> |

EE 也可以经 SBUS 窗口按原地址访问 IOP 一侧的 SIO2 与 SPU2 寄存器（`0x1F808200`、`0x1F900000`），本项目的 qtest 就是这样访问的。SPEED 在 EE 一侧位于 `0x14000000`，即 EE 地址 = IOP 地址 + `0x04000000`。

## 14.1 SIO2 串行接口（手柄、存储卡）

SIO2 是 IOP 的同步串行接口，前面板的两个手柄插口与两个存储卡插口都接在它上面。它以“命令队列”方式工作（图 14-1）：

- 软件一次写入最多 16 条命令，每条命令给出端口号与收发字节数。
- 命令数据经 SIO2_DATAIN 或 SIO2in DMA 送入；外设的应答经 SIO2_DATAOUT 或 SIO2out DMA 取出。
- 全部命令完成后，SIO2 把 SIO2_ISTAT.TR_COMP 置 1，并发出 IOP 第 17 号中断。

![图 14-1 SIO2 数据通路](/img/fig14-1-sio2.svg)

每条命令的第一个字节是外设选择字节，决定由哪类外设应答（表 14-2）。

**表 14-2 SIO2 外设选择字节**

| 选择字节 | 外设 | QEMU |
|---|---|---|
| `0x01` | 手柄 | 按“无设备”合成 SIO2_RECV1 |
| `0x21` | 多分插适配器（multitap） | 按“无设备”合成 SIO2_RECV1 |
| `0x61` | 红外接口 | 按其他字节处理：SIO2_RECV1 = `0x1D100` |
| `0x81` | 存储卡 | 按其他字节处理：SIO2_RECV1 = `0x1D100` |

选择字节的取值以及如何用 SIO2_RECV1 判断外设是否应答，依据 ps2tek §SIO2 Registers <Status s="reference" />。

### 14.1.1 编程要点

1. 写 SIO2_CTRL，使第 3:2 位为 1，复位 SIO2 的内部状态和 FIFO。
2. 写入命令：
   - 按使用的端口写 SIO2_SEND1、SIO2_SEND2（时序与波特率）。
   - 先写 SIO2_SEND3[1]–[15]，最后写 SIO2_SEND3[0]。
   - 在最后一条命令后放一个全 0 项作为结束标志。
3. 送入命令数据，有两种方式：
   - 逐字节写 SIO2_DATAIN；
   - 或启动 IOP DMA 通道 11（SIO2in，存储器 → SIO2）。需要取回应答时，同时启动通道 12（SIO2out，SIO2 → 存储器）。

   两个通道都使用切片（分块）模式（CHCR 同步模式 1，`0x200`）。BCR 低 16 位为块大小（字），高 16 位为块数。
4. 写 SIO2_CTRL，使 START = 1，启动传输。
5. 在第 17 号中断的中断处理程序中：
   - 读 SIO2_ISTAT，并把读出值写回，以清除状态位；
   - 读 SIO2_RECV1，判断外设是否应答；
   - 读 SIO2_DATAOUT，或检查 SIO2out DMA 写入的数据，取得应答。

### 14.1.2 QEMU 模型说明

QEMU 的 SIO2（`hw/misc/ps2_sio2.c`）按 PCSX2 的做法，只模拟插口上没有任何外设时的结果。这足以让 BIOS 中的 SIO2MAN、PADMAN 等模块完成初始化。

| 功能 | 说明 |
|---|---|
| 命令队列 | 按 SIO2_SEND3 第 17:8 位的长度把 DATAIN 字节分配给各条命令；写 SEND3[0] 软复位 |
| 应答数据 | 没有外设；SIO2_DATAOUT 读出恒为 `0xFF`，SIO2out DMA 向 IOP 内存写 `0xFF` |
| 状态 | SIO2_RECV1 只生成“无设备”的几种组合值，见 SIO2_RECV1 |
| 传输时间 | 写 START 立即完成并发出中断；只有 SIO2_ISTAT 为 0 时才发出 |
| SIO2in DMA | 每块按 BCR 块大小 × 4 字节送入，一块对应一条命令 |
| 端口设定 | SIO2_SEND1、SIO2_SEND2、SIO2_RECV2、SIO2_RECV3 与两个 FIFO 指针只保存 |
| 暂停与错误 | 不模拟 SEND3.PAUSE、CTRL.RESUME、超时与各种错误；SIO2_ISTAT.TR_ERR 从不置位 |

qtest `ps2/sio2` 验证寄存器访问、命令队列与中断；`ps2/sio2/dma` 验证两个 DMA 通道。

### 14.1.3 寄存器汇总

<RegSummary block="sio2" />

### 14.1.4 寄存器说明

#### SIO2_SEND3
<Reg block="sio2" name="SIO2_SEND3" />

#### SIO2_SEND1
<Reg block="sio2" name="SIO2_SEND1" />

#### SIO2_SEND2
<Reg block="sio2" name="SIO2_SEND2" />

#### SIO2_DATAIN
<Reg block="sio2" name="SIO2_DATAIN" />

#### SIO2_DATAOUT
<Reg block="sio2" name="SIO2_DATAOUT" />

#### SIO2_CTRL
<Reg block="sio2" name="SIO2_CTRL" />

#### SIO2_RECV1
<Reg block="sio2" name="SIO2_RECV1" />

#### SIO2_RECV2
<Reg block="sio2" name="SIO2_RECV2" />

#### SIO2_RECV3
<Reg block="sio2" name="SIO2_RECV3" />

#### SIO2_ISTAT
<Reg block="sio2" name="SIO2_ISTAT" />

## 14.2 SPU2 声音处理器

SPU2 由两个基本相同的核心组成，每个核心有 24 个声部（voice），两个核心共用 2 MB 的声音存储器。

- 声音存储器以 16 位半字为单位编址（`0x00000`–`0xFFFFF`），存放 ADPCM 波形数据、效果（混响）工作区以及 ADMA 的输入缓冲区。
- IOP 经数据端口 SPU2_DATA 或 DMA 写入波形，再经声部寄存器设定音高、音量与包络，最后写 KON 开始发声。

寄存器的地址分布如下，所有寄存器均为 16 位，只接受 16 位访问：

- 核心 0 的寄存器位于 `0x1F900000`–`0x1F9003FF`，核心 1 位于 `0x1F900400`–`0x1F9007FF`，同名寄存器的地址相差 `0x400`。
- `0x1F900760` 起是两个核心的主音量等寄存器，每核心 `0x28` 字节。
- `0x1F9007C0` 起是 SPDIF 输出寄存器与 SPU2_IRQINFO。

### 14.2.1 寄存器布局

表 14-3 列出每个核心内的寄存器布局，偏移相对于核心基地址。表中的寄存器在 QEMU 中只保存写入值；有单独说明的，表中注明“见 SPU2_xxx”。

**表 14-3 SPU2 核心寄存器布局**

| 偏移 | 名称 | 说明 | QEMU 复位值 |
|---|---|---|---|
| `0x000 + 0x10·v` | 声部 v 的 VOLL、VOLR、PITCH、ADSR1、ADSR2、ENVX、VOLXL、VOLXR | v = 0–23，各 16 位，依次位于偏移 0x0–0xE | PITCH = `0x3FFF`，其余 0 |
| `0x180`–`0x186` | PMON、NON | 音高调制、噪声选择（每项两个半字） | 0 |
| `0x188`–`0x196` | VMIXL、VMIXEL、VMIXR、VMIXER | 声部输出混合（干声 / 湿声，左 / 右，每项两个半字） | 每项第一个半字 `0xFFFF`、第二个半字 `0x00FF` |
| `0x198` | MMIX | 混合输出选择 | 核心 0 `0x0FF0`，核心 1 `0x0FFC` |
| `0x19A` | ATTR | 核心属性，见 SPU2_ATTR | 0 |
| `0x19C`、`0x19E` | IRQA | 中断地址，见 SPU2_IRQAH | `0x00800` |
| `0x1A0`–`0x1A6` | KON、KOFF | 键按下、键释放 | 读出 0 |
| `0x1A8`、`0x1AA` | TSA | 传输地址，见 SPU2_TSAH | 0 |
| `0x1AC` | DATA | 数据端口，见 SPU2_DATA | — |
| `0x1B0` | ADMAS | 自动 DMA 控制，见 SPU2_ADMAS | 0 |
| `0x1C0 + 0xC·v` | 声部 v 的 SSA、LSAX、NAX | 波形起始地址、循环地址、下一地址（各两个半字） | SSA = LSAX = `0x02800`，NAX = `0x02801` |
| `0x2E0` | ESA | 效果工作区起始地址 | 核心 0 `0xEFFF8`，核心 1 `0xFFFF8` |
| `0x2E4`–`0x33A` | 效果参数地址 | 混响各级的地址 | 0 |
| `0x33C` | EEA | 效果工作区结束地址（只给出高位） | 核心 0 `0xEFFFF`，核心 1 `0xFFFFF` |
| `0x340`、`0x342` | ENDX | 声部结束标志 | `0xFFFF`、`0x00FF` |
| `0x344` | STATX | 核心状态，见 SPU2_STATX | `0x0080` |

主音量区位于 `0x760 + 0x28·core`：

- MVOLL、MVOLR、EVOLL、EVOLR 只保存。
- AVOLL、AVOLR、BVOLL、BVOLR 复位为 `0x7FFF`。
- MVOLXL、MVOLXR（`+0x10`、`+0x12`）为当前主音量，只读，QEMU 读出 0。

寄存器名称与偏移依据 PCSX2 pcsx2/SPU2/regs.h:6-118 <Status s="reference" />。

### 14.2.2 编程要点

1. **写声音存储器（PIO）**：写 SPU2_TSAH、SPU2_TSAL 设定起始地址，然后逐个半字写 SPU2_DATA，每写一次 TSA 加 1。
2. **写声音存储器（DMA）**：
   - 设定 TSA，并写 SPU2_ATTR，使 DMA_MODE 不为 0。
   - 启动 IOP DMA 通道 4（核心 0）或 7（核心 1）。CHCR 使用切片模式（`0x200`），并把 FROM_RAM（第 0 位）与 START（第 24 位）置 1。
   - 传输结束后 SPU2_STATX.READY 置 1，IOP DMA 发出通道结束中断。
   - CHCR.FROM_RAM 为 0 时方向相反，从声音存储器读入 IOP 内存。
3. **IRQA 中断**：
   - 写 SPU2_IRQAH、SPU2_IRQAL 设定地址，写 SPU2_ATTR.IRQ_EN = 1。
   - 访问到该地址后，SPU2 发出 IOP 第 9 号中断。
   - 中断处理程序读 SPU2_IRQINFO 判断是哪个核心，然后把 IRQ_EN 写为 0 再写回 1，清除标志并重新允许中断。
4. **ADMA**：向本核心的 SPU2_ADMAS 位写 1 后，DMA 数据流送入 MEMIN 区。QEMU 不支持 ADMA，见 14.2.3 节。

### 14.2.3 QEMU 模型说明

QEMU 的 SPU2（`hw/audio/ps2_spu2.c`）是不发声的模型。它保存全部寄存器，并实现声音存储器、数据端口、DMA 与 IRQA 中断，让软件能够上传波形并照常运行。

| 功能 | 说明 |
|---|---|
| 声音输出 | 不合成、不输出声音；声部、混合、效果寄存器只保存 |
| 声音存储器 | 2 MB，地址在 1 Mi 个半字处回绕；复位时在半字地址 `0x2800` 与 `0xE870` 处各写入 8 个 `0x0707` |
| KON / KOFF | KON 只清除 ENDX 对应位；KOFF 被忽略；两者读出 0；对 ENDX 的任何写入使其清零 |
| DMA | IOP 通道 4、7，切片模式，传输立即完成；其他同步模式记录 LOG_UNIMP |
| IRQA | 数据端口的每次访问、DMA 每次传输的地址范围，都与两个核心的 IRQA 比较；DMA 传送的第一个半字不触发 |
| ADMA | SPU2_ADMAS 中本核心的位为 1 时，写声音存储器方向的 DMA 不传输数据就结束 |
| 扩展窗口 | `0x1F900800`–`0x1F900FFF` 为未实现区域（`spu2-ext`），读出 0，写入被忽略 |

qtest `ps2/spu2` 验证寄存器、数据端口与 IRQA；`ps2/spu2/dma` 验证两个 DMA 通道。

### 14.2.4 寄存器汇总

<RegSummary block="spu2" />

### 14.2.5 寄存器说明

#### SPU2_ATTR
<Reg block="spu2" name="SPU2_ATTR" />

#### SPU2_IRQAH
<Reg block="spu2" name="SPU2_IRQAH" />

#### SPU2_IRQAL
<Reg block="spu2" name="SPU2_IRQAL" />

#### SPU2_TSAH
<Reg block="spu2" name="SPU2_TSAH" />

#### SPU2_TSAL
<Reg block="spu2" name="SPU2_TSAL" />

#### SPU2_DATA
<Reg block="spu2" name="SPU2_DATA" />

#### SPU2_ADMAS
<Reg block="spu2" name="SPU2_ADMAS" />

#### SPU2_STATX
<Reg block="spu2" name="SPU2_STATX" />

#### SPU2_IRQINFO
<Reg block="spu2" name="SPU2_IRQINFO" />

## 14.3 DEV9 扩展接口、SPEED 与 ATA

DEV9 是 IOP 的扩展设备接口。早期机型经 PC 卡（PCMCIA）插槽连接扩展设备，后期机型改为扩展槽，可插入网络适配器或硬盘。扩展设备上的 SPEED 芯片向 IOP 提供一组寄存器，包括：

- 芯片版本与功能；
- 中断状态与屏蔽；
- 通用 I/O；
- ATA 硬盘接口与 SMAP 以太网接口的寄存器窗口。

这些寄存器分布在两个地址窗口中：

- **DEV9 桥接寄存器**，`0x1F801460`–`0x1F80147F`：DEV9 驱动据此判断控制器类型，并为扩展设备上电。
- **SPEED 寄存器**，`0x10000000` 起。EE 经 SBUS 窗口 `0x14000000` 访问同一组寄存器。其中：
  - `0x10000040`–`0x1000004F` 为 ATA 任务文件寄存器，各寄存器 16 位，间隔 2 字节；
  - `0x1000005C` 为 ATA 设备控制 / 备用状态寄存器。

SPEED 汇总各模块的中断：SPD_INTR_STAT 反映各中断源的状态，它与 SPD_INTR_MASK 相与后不为 0 时，SPEED 经 DEV9 向 IOP INTC 发出第 13 号中断。

### 14.3.1 编程要点

1. 读 DEV9_REV 判断控制器类型：`0x20` 为 PC 卡型，`0x30` 为扩展槽型。对扩展槽型，DEV9_1462 第 0 位为 0 表示插有设备。
2. 读 SPD_REV_1 得到 SPEED 版本，读 SPD_REV_3 判断有无 ATA、SMAP 等模块。
3. **ATA 访问**：
   - 按 ATA 标准，经 ATA_SELECT、ATA_STATUS（写入时为命令寄存器）等寄存器发出命令。任务文件寄存器只使用 16 位访问。
   - 设备产生中断后，SPD_INTR_STAT.ATA0 置 1；若 SPD_INTR_MASK.ATA0 为 1，IOP 收到第 13 号中断。
   - 读 ATA_STATUS 清除设备的中断请求，SPD_INTR_STAT.ATA0 随之清零。
4. SPD_INTR_STAT 不能由软件清除，只能在中断源一侧清除。

### 14.3.2 QEMU 模型说明

QEMU 的 DEV9（`hw/misc/ps2_dev9.c`）模拟一个只带 ATA 接口的扩展槽型 SPEED。ATA 接口使用 QEMU 的通用 MMIO IDE 模型（`TYPE_MMIO_IDE`，寄存器间隔 2 字节），硬盘由 `-drive if=ide,index=0` 指定。

| 功能 | 说明 |
|---|---|
| DEV9 桥接 | DEV9_1462 读出 0，DEV9_REV 读出 `0x30`；DEV9_POWER 及其余桥接寄存器只保存 |
| 版本 | SPD_REV_1 = `0x11`，SPD_REV_3 = `0x02`（只报告 ATA），SPD_REV_8 = 0 |
| 中断 | 只有 ATA0 一个中断源，跟随 IDE 的 INTRQ；当 (STAT & MASK) 不为 0 时中断信号有效 |
| 访问宽度 | 8 位访问读写 16 位寄存器的一半 |
| 其他 SPEED 寄存器 | 只保存 |
| DMA | 不模拟 DEV9 DMA（IOP 通道 8），SPD_DMA_CTRL、SPD_XFR_CTRL 只保存；ATA 只能用 PIO |
| SMAP、UART、闪存 | 未实现 |
| 扩展区 | EE 地址 `0x16000000`–`0x161FFFFF` 为未实现区域（`dev9-exp`） |

qtest `ps2/dev9/intr` 验证 SPEED 中断与 ATA 中断的配合；`ps2/sbus` 验证经 EE SBUS 窗口读 SPD_REV_1。DEV9 桥接寄存器没有测试覆盖。

### 14.3.3 寄存器汇总

<RegSummary block="dev9" />

### 14.3.4 寄存器说明

#### DEV9_1462
<Reg block="dev9" name="DEV9_1462" />

#### DEV9_POWER
<Reg block="dev9" name="DEV9_POWER" />

#### DEV9_REV
<Reg block="dev9" name="DEV9_REV" />

#### SPD_REV_1
<Reg block="dev9" name="SPD_REV_1" />

#### SPD_REV_3
<Reg block="dev9" name="SPD_REV_3" />

#### SPD_INTR_STAT
<Reg block="dev9" name="SPD_INTR_STAT" />

#### SPD_INTR_MASK
<Reg block="dev9" name="SPD_INTR_MASK" />

#### SPD_PIO_DATA
<Reg block="dev9" name="SPD_PIO_DATA" />

## 14.4 USB 主控制器

IOP 内含一个 USB 主控制器，符合 OHCI（Open Host Controller Interface）1.0a 规范。它的寄存器位于 `0x1F801600`–`0x1F8016FF`，中断接 IOP INTC 第 22 号，有两个下行端口。

寄存器布局、端点描述符与传输描述符的格式、帧列表等均按 OHCI 1.0a 规范，本书不再重复，请直接参阅该规范。主控制器以总线主控方式访问 IOP 内存中的描述符与数据缓冲区，描述符中的地址都是 IOP 物理地址。

### 14.4.1 QEMU 模型说明

- QEMU 直接使用通用的 OHCI 模型（`TYPE_SYSBUS_OHCI`），设为 2 个端口。
- OHCI 的总线主控访问在 EE 地址空间中进行：地址加上 `0x1C000000` 的偏移，落在 EE 一侧的 IOP 内存窗口中，从而访问到 IOP 内存。
- qtest `ps2/sbus` 验证读 HcRevision（`0x1F801600`）得到 `0x10`（OHCI 1.0）；`ps2/iop-intc` 验证帧起始（SOF）中断经 IOP INTC 第 22 号送出 <Status s="verified" />。

## 14.5 i.LINK 接口 <Status s="unimplemented" />

部分机型带有 i.LINK（IEEE 1394）接口，其寄存器区位于 IOP 地址 `0x1F808400`–`0x1F8085FF`。ps2tek §IOP Interrupts 把 IOP 中断第 24 号记为 FWRE、第 25 号记为 FDMA，二者与该接口有关 <Status s="reference" />。

### 14.5.1 QEMU 模型说明

- 该区域是未实现区域（`ps2.ilink`，`hw/mips/ps2_iop.c:41`）：读出 0，写入被忽略并记录 LOG_UNIMP。
- QEMU 不模拟 i.LINK 控制器及相关中断。
- 寄存器定义未见可靠的公开资料，本书不列出。

## 14.6 EE 调试串口 SIO

EE 内含一个简单的异步串口（SIO），寄存器位于 `0x1000F100`–`0x1000F1FF`。它主要用于开发与调试：Sony BIOS 经它输出启动信息，Linux 内核把它用作控制台（ttyS0）。

寄存器名称和位定义依据 ps2sdk ee/kernel/include/sio.h。该文件注明这些定义参考东芝 TX49/TX79 的配套芯片，并非全部经过确认 <Status s="reference" />。

### 14.6.1 编程要点

1. **初始化**（ps2sdk sio_init 的做法）：
   - 写 SIO_LCR = SCS | 帧格式；8N1 时为 `0x20`。
   - 写 SIO_IER = 0。
   - 写 SIO_FCR = `0x07` 复位 FIFO，再写 SIO_FCR = 0。
   - 按 SIO_BGR 说明中的公式写入波特率。
2. **发送**：查询 SIO_ISR 第 15:12 位，等于 `0x8` 表示发送 FIFO 已满，应等待；不满时把一个字节写入 SIO_TXFIFO。
3. **接收**：SIO_ISR 第 11:8 位不为 0 时，从 SIO_RXFIFO 读出一个字节，然后向 SIO_ISR 写 7 清除状态位。

### 14.6.2 QEMU 模型说明

QEMU 的 SIO（`hw/char/ps2_sio.c`）把串口接到第一个主机字符设备，即 `-serial` 选项指定的终端。

| 功能 | 说明 |
|---|---|
| 发送 | 写 SIO_TXFIFO 的字节立即送出；SIO_ISR 第 15:12 位总为 0 |
| 接收 | 16 字节接收 FIFO；SIO_ISR 第 11:8 位为 FIFO 中的字节数（最大读出 15）；写 SIO_FCR.RFRST = 1 清空 FIFO |
| 帧格式与波特率 | SIO_LCR、SIO_BGR 只保存 |
| 状态与中断 | SIO_LSR 读出 0；SIO_IER 只保存，不产生中断；SIO_ISR 第 2:0 位读出 0，写入被忽略 |

Sony BIOS 与 Linux 的启动输出验证了发送通路，但没有专门的 qtest；接收通路与 FIFO 复位没有测试覆盖。

### 14.6.3 寄存器汇总

<RegSummary block="ee-sio" />

### 14.6.4 寄存器说明

#### SIO_LCR
<Reg block="ee-sio" name="SIO_LCR" />

#### SIO_LSR
<Reg block="ee-sio" name="SIO_LSR" />

#### SIO_IER
<Reg block="ee-sio" name="SIO_IER" />

#### SIO_ISR
<Reg block="ee-sio" name="SIO_ISR" />

#### SIO_FCR
<Reg block="ee-sio" name="SIO_FCR" />

#### SIO_BGR
<Reg block="ee-sio" name="SIO_BGR" />

#### SIO_TXFIFO
<Reg block="ee-sio" name="SIO_TXFIFO" />

#### SIO_RXFIFO
<Reg block="ee-sio" name="SIO_RXFIFO" />

## 14.7 MCH：RDRAM 初始化接口

主存由 Rambus RDRAM 器件组成，存储器控制器 MCH 经 RAC 与 RDRAM 相连。BIOS 在启动最初阶段，即主存可用之前，经 MCH_RICM、MCH_DRD 两个寄存器向 RDRAM 发出串行控制命令，用于：

- 统计通道上的器件数；
- 读取各器件的配置寄存器；
- 为器件分配器件号。

公开资料对这两个寄存器所知甚少。下面的命令表依据 PCSX2 与 ps2tek 记载的模拟逻辑 <Status s="reference" />，QEMU 按同样的逻辑实现。

**表 14-4 RDRAM 串行读命令（MCH_RICM.SOP = 0）**

| SA | RDRAM 寄存器 | 读 MCH_DRD 的结果 |
|---|---|---|
| `0x21` | INIT | 前两次读出 `0x1F`（每个器件应答一次），以后读出 0 |
| `0x23` | CNFGA | `0x0D0D` |
| `0x24` | CNFGB | `0x0090` |
| `0x40` | DEVID | MCH_RICM.SDEV |
| 其他 | — | 0 |

INIT 命令是 MCH_RICM.SOP = 1 且 SA = `0x21`。MCH_DRD.SRP 为 0 时，INIT 命令使已应答的器件计数清零，随后的 INIT 读命令重新开始应答。SOP 为其他值时，MCH_DRD 读出 0。

### 14.7.1 编程要点

1. 写 MCH_DRD 使 SRP = 0，再写 MCH_RICM = `(0x21 << 16) | (1 << 6)`（INIT），器件计数清零。
2. 写 MCH_RICM = `0x21 << 16`（SOP = 0，读 INIT），然后反复读 MCH_DRD；读出 `0x1F` 的次数即为器件数。
3. 对每个器件，写 MCH_RICM = `(SA << 16) | SDEV` 后读 MCH_DRD，依次读出 CNFGA、CNFGB、DEVID。
4. 命令立即完成，不需要查询 BUSY。MCH_RICM 读出恒为 0。

### 14.7.2 QEMU 模型说明

QEMU 的 MCH（`hw/misc/ps2_mch.c`）位于 `0x1000F430`，窗口大小 `0x20`。

| 功能 | 说明 |
|---|---|
| 访问宽度 | 只响应 32 位访问；64 位访问拆成两次 32 位访问 |
| 无效访问 | 更窄的访问被拒绝：CPU 访问产生总线错误（DBE），qtest 读出 0；两个寄存器之间的空洞读出 0 |
| RDRAM 器件 | 模拟两个器件；CNFGA、CNFGB 为固定值，不随 `-m` 选项变化 |
| 主存大小 | 由 QEMU 机器决定，与这里的应答无关 |
| 复位 | 系统复位清除两个寄存器与器件计数 |

上述行为由 qtest `ps2/mch` 验证；64 位访问的拆分与 `-m` 无关性没有测试覆盖。

### 14.7.3 寄存器汇总

<RegSummary block="mch" />

### 14.7.4 寄存器说明

#### MCH_RICM
<Reg block="mch" name="MCH_RICM" />

#### MCH_DRD
<Reg block="mch" name="MCH_DRD" />

## 14.8 DVE 视频编码器

DVE 是视频输出通路上的视频编码器芯片。EE 经地址 `0x1A000000` 处的一个简单串行总线主控端口读写编码器的内部寄存器。一次传输的步骤是：

1. 把器件地址写入 DVE_ADDR，把数据写入 DVE_DATA0、DVE_DATA1；
2. 写 DVE_CMD 启动传输；
3. 查询 DVE_STAT，等待传输完成。

编码器内部有 256 个 8 位寄存器：

- 写传输的第一个字节选择寄存器号，第二个字节（如有）写入该寄存器；
- 读传输读出当前所选寄存器的值。

编码器内部各寄存器的含义没有可靠资料，本书不列出。

### 14.8.1 编程要点

1. 写 DVE_STAT（任意值），清除上次的结果。
2. **写寄存器**：写 DVE_ADDR = `0x42`、DVE_DATA0 = 寄存器号、DVE_DATA1 = 数据，然后写 DVE_CMD = `0x80 | 2`。
3. **读寄存器**：
   - 先以 1 字节写传输选择寄存器号：DVE_ADDR = `0x42`、DVE_DATA0 = 寄存器号，DVE_CMD = `0x80 | 1`。
   - 再写 DVE_ADDR = `0x43`、DVE_CMD = `0x80 | 1`，完成后从 DVE_DATA0 读出数据。
4. 每次传输后查询 DVE_STAT.DONE；DONE 为 1 后检查 NACK，NACK = 1 表示编码器没有应答或未上电。

### 14.8.2 QEMU 模型说明

QEMU 的 DVE（`hw/display/ps2_dve.c`）模拟串行端口与编码器的 256 字节寄存器文件。编码器寄存器的内容不影响 QEMU 的视频输出。

| 功能 | 说明 |
|---|---|
| 传输 | 写 DVE_CMD.START 时立即完成；START 位不自动清零 |
| 器件地址 | 只有 `0x42`（写）与 `0x43`（读）有应答；PCSX2 对这两个值的读写方向与 QEMU 相反，见 DVE_ADDR |
| 字节数 | 支持写 1 字节、写 2 字节与读 1 字节；其他组合只置 DONE 并记录 LOG_UNIMP |
| 电源 | DVE_POWER.ON 复位为 1；为 0 时所有传输以 NACK 结束 |
| 其他寄存器 | DVE_UNK04、DVE_UNK08 只保存并记录 LOG_UNIMP；DVE_DATA2–DATA7 只保存 |
| 访问宽度 | 只接受 16 位访问；其他宽度的访问被拒绝：CPU 访问产生总线错误（DBE），qtest 读出 0 |
| 窗口 | `0x1A000020`–`0x1A00FFFF` 为未实现区域 |

上述全部行为由 qtest `ps2/dve` 验证。

### 14.8.3 寄存器汇总

<RegSummary block="dve" />

### 14.8.4 寄存器说明

#### DVE_CMD
<Reg block="dve" name="DVE_CMD" />

#### DVE_ADDR
<Reg block="dve" name="DVE_ADDR" />

#### DVE_STAT
<Reg block="dve" name="DVE_STAT" />

#### DVE_POWER
<Reg block="dve" name="DVE_POWER" />

#### DVE_DATA0
<Reg block="dve" name="DVE_DATA0" />

#### DVE_DATA1
<Reg block="dve" name="DVE_DATA1" />

## 14.9 来源

- QEMU：
  - 设备：`hw/misc/ps2_sio2.c`、`hw/audio/ps2_spu2.c`、`hw/misc/ps2_dev9.c`、`hw/char/ps2_sio.c`、`hw/misc/ps2_mch.c`、`hw/display/ps2_dve.c`
  - 主板：`hw/mips/ps2.c`、`hw/mips/ps2_ee.c`、`hw/mips/ps2_iop.c`
  - qtest：`tests/qtest/ps2-test.c`
- PCSX2：
  - SIO2：pcsx2/SIO/SioTypes.h:106-157、pcsx2/SIO/Sio2.cpp:101-129、pcsx2/IopHw.h:67-75
  - SPU2：pcsx2/SPU2/regs.h:6-118、pcsx2/SPU2/spu2sys.cpp:1014-1069
  - DEV9：pcsx2/DEV9/DEV9.h:108-183、pcsx2/DEV9/DEV9.cpp:445-610
  - MCH：pcsx2/Hw.h:326-327、pcsx2/HwRead.cpp:145-185、pcsx2/HwWrite.cpp:233-241
  - DVE：pcsx2/Memory.cpp:260-341
- ps2sdk：iop/sio/mx4sio_bd/src/sio2regs.h、common/include/speedregs.h、common/include/dev9regs.h、ee/kernel/include/sio.h、ee/kernel/src/sio.c
- ps2tek：§SIO2 Registers、§Sound Processing Unit (SPU2)、§SPU2 AutoDMA、§EE RDRAM initialization、§IOP Interrupts、§IOP DMA
- OHCI（Open Host Controller Interface）规范 1.0a
