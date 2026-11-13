---
outline: false
---

# 附录 A 寄存器地址速查

<!-- 本页由 scripts/gen-index.mjs 根据 docs/data/registers/*.yaml 自动生成，请勿手工修改。 -->

本页汇总全书所有寄存器，共 340 个。地址列为物理地址：EE 侧为 EE 物理地址，IOP 侧为 IOP 物理地址（见第 2 章）。点击寄存器名可跳转到详细说明。

## 按地址排序

| 地址 | 寄存器 | 模块 | 位宽 | 属性 | 状态 | 功能 |
|---|---|---|---|---|---|---|
| `0x10000000` | SPD_REV | DEV9 扩展接口与 SPEED | 16 | RO | 未实现 | SPEED 版本（QEMU 中只保存写入值，复位后读出 0） |
| `0x10000000` | [T0_COUNT](/chapters/05-ee-timer#t0-count) | EE 定时器 | 32 | R/W | 参考 | 定时器 0 计数值 |
| `0x10000002` | [SPD_REV_1](/chapters/14-peripherals#spd-rev-1) | DEV9 扩展接口与 SPEED | 16 | RO | 已验证 | SPEED 芯片版本号（QEMU 读出 0x11） |
| `0x10000004` | [SPD_REV_3](/chapters/14-peripherals#spd-rev-3) | DEV9 扩展接口与 SPEED | 16 | RO | 参考 | SPEED 功能（capabilities）：ATA、SMAP（网络）、UART 等 |
| `0x1000000E` | SPD_REV_8 | DEV9 扩展接口与 SPEED | 16 | RO | 参考 | 版本寄存器 8；QEMU 读出 0，PCSX2 读出 0x0002（表示插有硬盘模块）。QEMU 已实现，但没有测试覆盖 |
| `0x10000010` | [T0_MODE](/chapters/05-ee-timer#t0-mode) | EE 定时器 | 32 | R/W | 已验证 | 定时器 0 模式与状态 |
| `0x10000020` | [T0_COMP](/chapters/05-ee-timer#t0-comp) | EE 定时器 | 32 | R/W | 已验证 | 定时器 0 比较值 |
| `0x10000024` | SPD_DMA_CTRL | DEV9 扩展接口与 SPEED | 16 | R/W | 未实现 | SPEED DMA 控制（QEMU 只保存；不模拟 DEV9 DMA） |
| `0x10000028` | [SPD_INTR_STAT](/chapters/14-peripherals#spd-intr-stat) | DEV9 扩展接口与 SPEED | 16 | RO | 已验证 | SPEED 中断状态（各中断源的当前电平） |
| `0x1000002A` | [SPD_INTR_MASK](/chapters/14-peripherals#spd-intr-mask) | DEV9 扩展接口与 SPEED | 16 | R/W | 已验证 | SPEED 中断屏蔽（1 = 允许） |
| `0x1000002C` | SPD_PIO_DIR | DEV9 扩展接口与 SPEED | 16 | R/W | 未实现 | 通用 I/O 方向，用于访问网络适配器上的串行 EEPROM（QEMU 只保存） |
| `0x1000002E` | [SPD_PIO_DATA](/chapters/14-peripherals#spd-pio-data) | DEV9 扩展接口与 SPEED | 16 | R/W | 未实现 | 通用 I/O 数据：串行 EEPROM 的时钟、片选与数据线 |
| `0x10000030` | [T0_HOLD](/chapters/05-ee-timer#t0-hold) | EE 定时器 | 32 | R/W | 未实现 | 定时器 0 保持值（SBUS 中断时锁存） |
| `0x10000032` | SPD_XFR_CTRL | DEV9 扩展接口与 SPEED | 16 | R/W | 未实现 | 传输控制（QEMU 只保存） |
| `0x10000040` | ATA_DATA | DEV9 扩展接口与 SPEED | 16 | R/W | 参考 | ATA 数据寄存器（16 位 PIO 数据）。QEMU 已实现，但没有测试覆盖 |
| `0x10000042` | ATA_ERROR | DEV9 扩展接口与 SPEED | 16 | R/W | 参考 | 读为错误寄存器，写为特征（feature）寄存器。QEMU 已实现，但没有测试覆盖 |
| `0x10000044` | ATA_NSECTOR | DEV9 扩展接口与 SPEED | 16 | R/W | 参考 | 扇区数。QEMU 已实现，但没有测试覆盖 |
| `0x10000046` | ATA_SECTOR | DEV9 扩展接口与 SPEED | 16 | R/W | 参考 | 扇区号（LBA 第 7:0 位）。QEMU 已实现，但没有测试覆盖 |
| `0x10000048` | ATA_LCYL | DEV9 扩展接口与 SPEED | 16 | R/W | 参考 | 柱面号低字节（LBA 第 15:8 位）。QEMU 已实现，但没有测试覆盖 |
| `0x1000004A` | ATA_HCYL | DEV9 扩展接口与 SPEED | 16 | R/W | 参考 | 柱面号高字节（LBA 第 23:16 位）。QEMU 已实现，但没有测试覆盖 |
| `0x1000004C` | ATA_SELECT | DEV9 扩展接口与 SPEED | 16 | R/W | 已验证 | 设备 / 磁头选择寄存器 |
| `0x1000004E` | ATA_STATUS | DEV9 扩展接口与 SPEED | 16 | R/W | 已验证 | 读为状态寄存器（读出时清除 ATA 中断），写为命令寄存器 |
| `0x1000005C` | ATA_CONTROL | DEV9 扩展接口与 SPEED | 16 | R/W | 参考 | 读为备用状态寄存器，写为设备控制寄存器。QEMU 已实现，但没有测试覆盖 |
| `0x10000064` | SPD_IF_CTRL | DEV9 扩展接口与 SPEED | 16 | R/W | 未实现 | 接口控制：第 7 位 ATA 复位，第 2 位 DMA 允许（QEMU 只保存） |
| `0x10000070` | SPD_PIO_MODE | DEV9 扩展接口与 SPEED | 16 | R/W | 未实现 | ATA PIO 时序模式（QEMU 只保存）；0x72 为 MWDMA 模式，0x74 为 UDMA 模式 |
| `0x10000800` | T1_COUNT | EE 定时器 | 32 | R/W | 参考 | 定时器 1 计数值，同 T0_COUNT |
| `0x10000810` | T1_MODE | EE 定时器 | 32 | R/W | 已验证 | 定时器 1 模式与状态，同 T0_MODE |
| `0x10000820` | T1_COMP | EE 定时器 | 32 | R/W | 已验证 | 定时器 1 比较值，同 T0_COMP |
| `0x10000830` | T1_HOLD | EE 定时器 | 32 | R/W | 未实现 | 定时器 1 保持值，同 T0_HOLD |
| `0x10001000` | T2_COUNT | EE 定时器 | 32 | R/W | 参考 | 定时器 2 计数值，同 T0_COUNT |
| `0x10001010` | T2_MODE | EE 定时器 | 32 | R/W | 已验证 | 定时器 2 模式与状态，同 T0_MODE |
| `0x10001020` | T2_COMP | EE 定时器 | 32 | R/W | 已验证 | 定时器 2 比较值，同 T0_COMP |
| `0x10001800` | T3_COUNT | EE 定时器 | 32 | R/W | 参考 | 定时器 3 计数值，同 T0_COUNT |
| `0x10001810` | T3_MODE | EE 定时器 | 32 | R/W | 已验证 | 定时器 3 模式与状态，同 T0_MODE（EE 内核报警功能占用） |
| `0x10001820` | T3_COMP | EE 定时器 | 32 | R/W | 已验证 | 定时器 3 比较值，同 T0_COMP |
| `0x10002000` | [IPU_CMD](/chapters/10-ipu#ipu-cmd) | 图像处理单元 IPU | 64 | R/W | 未实现 | 写入为 IPU 命令；读出为命令结果与 BUSY 标志 |
| `0x10002010` | [IPU_CTRL](/chapters/10-ipu#ipu-ctrl) | 图像处理单元 IPU | 32 | R/W | 未实现 | IPU 控制与状态：FIFO 计数、解码参数、复位与忙标志 |
| `0x10002020` | [IPU_BP](/chapters/10-ipu#ipu-bp) | 图像处理单元 IPU | 32 | RO | 未实现 | 码流读取位置与 FIFO 填充状态 |
| `0x10002030` | [IPU_TOP](/chapters/10-ipu#ipu-top) | 图像处理单元 IPU | 64 | RO | 未实现 | 码流当前位置之后的 32 位（预读，不消耗） |
| `0x10003000` | [GIF_CTRL](/chapters/08-gif#gif-ctrl) | 图形接口 GIF | 32 | WO | 参考 | GIF 控制：复位、暂停传输 |
| `0x10003010` | [GIF_MODE](/chapters/08-gif#gif-mode) | 图形接口 GIF | 32 | WO | 未实现 | GIF 工作模式：PATH3 屏蔽、间歇传输 |
| `0x10003020` | [GIF_STAT](/chapters/08-gif#gif-stat) | 图形接口 GIF | 32 | RO | 未实现 | GIF 状态：屏蔽、排队、当前 PATH、FIFO 计数 |
| `0x10003040` | [GIF_TAG0](/chapters/08-gif#gif-tag0) | 图形接口 GIF | 32 | RO | 未实现 | 最近读入的 GIFtag 第 31:0 位 |
| `0x10003050` | [GIF_TAG1](/chapters/08-gif#gif-tag1) | 图形接口 GIF | 32 | RO | 未实现 | 最近读入的 GIFtag 第 63:32 位 |
| `0x10003060` | [GIF_TAG2](/chapters/08-gif#gif-tag2) | 图形接口 GIF | 32 | RO | 未实现 | 最近读入的 GIFtag 第 95:64 位 |
| `0x10003070` | [GIF_TAG3](/chapters/08-gif#gif-tag3) | 图形接口 GIF | 32 | RO | 未实现 | 最近读入的 GIFtag 第 127:96 位 |
| `0x10003080` | [GIF_CNT](/chapters/08-gif#gif-cnt) | 图形接口 GIF | 32 | RO | 未实现 | 当前数据包的循环与寄存器计数 |
| `0x10003090` | [GIF_P3CNT](/chapters/08-gif#gif-p3cnt) | 图形接口 GIF | 32 | RO | 未实现 | PATH3 被中断时的循环计数 |
| `0x100030A0` | [GIF_P3TAG](/chapters/08-gif#gif-p3tag) | 图形接口 GIF | 32 | RO | 未实现 | PATH3 被中断时的 GIFtag 第 31:0 位 |
| `0x10004000` | [VIF0_FIFO](/chapters/07-vpu#vif0-fifo) | VIF0 / VIF1 寄存器 | 128 | WO | 已验证 | VIF0 FIFO 写入口 |
| `0x10005000` | [VIF1_FIFO](/chapters/07-vpu#vif1-fifo) | VIF0 / VIF1 寄存器 | 128 | WO | 已验证 | VIF1 FIFO 写入口 |
| `0x10006000` | [GIF_FIFO](/chapters/08-gif#gif-fifo) | 图形接口 GIF | 128 | WO | 已验证 | PATH3 数据入口（GIF FIFO 窗口） |
| `0x10007000` | [IPU_out_FIFO](/chapters/10-ipu#ipu-out-fifo) | 图像处理单元 IPU | 128 | RO | 未实现 | 输出 FIFO 读端口（8 个四字深），通常由 fromIPU DMA（通道 3）读取 |
| `0x10007010` | [IPU_in_FIFO](/chapters/10-ipu#ipu-in-fifo) | 图像处理单元 IPU | 128 | WO | 未实现 | 输入 FIFO 写端口（8 个四字深），通常由 toIPU DMA（通道 4）写入 |
| `0x1000E000` | [D_CTRL](/chapters/06-dmac#d-ctrl) | EE DMA 控制器 | 32 | R/W | 参考 | DMAC 总控制 |
| `0x1000E010` | [D_STAT](/chapters/06-dmac#d-stat) | EE DMA 控制器 | 32 | R/W1C, R/W1T | 已验证 | 中断状态（低半部写 1 清零）与中断屏蔽（高半部写 1 翻转） |
| `0x1000E020` | [D_PCR](/chapters/06-dmac#d-pcr) | EE DMA 控制器 | 32 | R/W | 已验证 | 优先级控制与 COP0 条件 |
| `0x1000E030` | [D_SQWC](/chapters/06-dmac#d-sqwc) | EE DMA 控制器 | 32 | R/W | 未实现 | 交错模式的跳过 / 传输四字数 |
| `0x1000E040` | [D_RBSR](/chapters/06-dmac#d-rbsr) | EE DMA 控制器 | 32 | R/W | 未实现 | MFIFO 环形缓冲区大小（掩码） |
| `0x1000E050` | [D_RBOR](/chapters/06-dmac#d-rbor) | EE DMA 控制器 | 32 | R/W | 未实现 | MFIFO 环形缓冲区起始地址 |
| `0x1000E060` | [D_STADR](/chapters/06-dmac#d-stadr) | EE DMA 控制器 | 32 | R/W | 参考 | 停顿地址 |
| `0x1000F000` | [I_STAT](/chapters/04-ee-intc#i-stat) | EE 中断控制器 | 32 | R/W1C | 已验证 | 中断状态，每个中断源一位，写 1 清零 |
| `0x1000F010` | [I_MASK](/chapters/04-ee-intc#i-mask) | EE 中断控制器 | 32 | R/W1T | 已验证 | 中断屏蔽，为 1 的位允许对应中断源，写 1 翻转 |
| `0x1000F100` | [SIO_LCR](/chapters/14-peripherals#sio-lcr) | EE 调试串口 SIO | 32 | R/W | 未实现 | 线路控制：数据位、停止位、校验、波特率时钟选择 |
| `0x1000F110` | [SIO_LSR](/chapters/14-peripherals#sio-lsr) | EE 调试串口 SIO | 32 | RO | 未实现 | 线路状态：接收数据就绪与各种错误 |
| `0x1000F120` | [SIO_IER](/chapters/14-peripherals#sio-ier) | EE 调试串口 SIO | 32 | R/W | 未实现 | 中断允许 |
| `0x1000F130` | [SIO_ISR](/chapters/14-peripherals#sio-isr) | EE 调试串口 SIO | 32 | R/W | 参考 | 中断状态与 FIFO 计数（接收字节数、发送 FIFO 占用） |
| `0x1000F140` | [SIO_FCR](/chapters/14-peripherals#sio-fcr) | EE 调试串口 SIO | 32 | R/W | 参考 | FIFO 控制：FIFO 复位 |
| `0x1000F150` | [SIO_BGR](/chapters/14-peripherals#sio-bgr) | EE 调试串口 SIO | 32 | R/W | 未实现 | 波特率发生器：分频值与预分频选择 |
| `0x1000F180` | [SIO_TXFIFO](/chapters/14-peripherals#sio-txfifo) | EE 调试串口 SIO | 8 | WO | 已验证 | 发送 FIFO：写入一个字节即送出 |
| `0x1000F1C0` | [SIO_RXFIFO](/chapters/14-peripherals#sio-rxfifo) | EE 调试串口 SIO | 8 | RO | 参考 | 接收 FIFO：读出一个字节 |
| `0x1000F200` | [MAINADDR](/chapters/11-sif#mainaddr) | 子系统接口 SIF | 32 | R/W | 已验证 | EE → IOP 邮箱（MSCOM），只有 EE 可写；IOP 地址 0x1D000000 |
| `0x1000F210` | [SUBADDR](/chapters/11-sif#subaddr) | 子系统接口 SIF | 32 | RO | 已验证 | IOP → EE 邮箱（SMCOM），只有 IOP 可写；IOP 地址 0x1D000010 |
| `0x1000F220` | [MSFLAG](/chapters/11-sif#msflag) | 子系统接口 SIF | 32 | R/W | 已验证 | EE → IOP 标志（MSFLG），EE 写 1 置位，IOP 写 1 清零；IOP 地址 0x1D000020 |
| `0x1000F230` | [SMFLAG](/chapters/11-sif#smflag) | 子系统接口 SIF | 32 | R/W1C | 已验证 | IOP → EE 标志（SMFLG），IOP 写 1 置位，EE 写 1 清零；IOP 地址 0x1D000030 |
| `0x1000F240` | [CTRL](/chapters/11-sif#ctrl) | 子系统接口 SIF | 32 | R/W | 已验证 | SIF 控制，两侧写入规则不同；IOP 地址 0x1D000040 |
| `0x1000F260` | [BD6](/chapters/11-sif#bd6) | 子系统接口 SIF | 32 | R/W | 已验证 | 用途不明的寄存器，IOP 写入即清零；IOP 地址 0x1D000060 |
| `0x1000F430` | [MCH_RICM](/chapters/14-peripherals#mch-ricm) | MCH RDRAM 初始化接口 | 32 | R/W | 已验证 | RDRAM 串行控制命令：操作码、寄存器地址、器件号 |
| `0x1000F440` | [MCH_DRD](/chapters/14-peripherals#mch-drd) | MCH RDRAM 初始化接口 | 32 | R/W | 已验证 | RDRAM 串行读数据；写入时第 7 位为 SRP（SIO 中继） |
| `0x1000F520` | [D_ENABLER](/chapters/06-dmac#d-enabler) | EE DMA 控制器 | 32 | RO | 未实现 | DMA 挂起状态（读） |
| `0x1000F590` | [D_ENABLEW](/chapters/06-dmac#d-enablew) | EE DMA 控制器 | 32 | R/W | 未实现 | DMA 挂起控制（写） |
| `0x12000000` | [PMODE](/chapters/09-gs#pmode) | GS 特权寄存器 | 64 | R/W | 已验证 | PCRTC 模式：读出电路允许、两电路合成方式 |
| `0x12000010` | [SMODE1](/chapters/09-gs#smode1) | GS 特权寄存器 | 64 | R/W | 已验证 | 视频同步模式 1（时钟、制式） |
| `0x12000020` | [SMODE2](/chapters/09-gs#smode2) | GS 特权寄存器 | 64 | R/W | 已验证 | 视频同步模式 2（隔行、场 / 帧模式） |
| `0x12000030` | SRFSH | GS 特权寄存器 | 64 | R/W | 未实现 | DRAM 刷新设置，QEMU 只保存 |
| `0x12000040` | SYNCH1 | GS 特权寄存器 | 64 | R/W | 未实现 | 水平同步时序 1，QEMU 只保存 |
| `0x12000050` | SYNCH2 | GS 特权寄存器 | 64 | R/W | 未实现 | 水平同步时序 2，QEMU 只保存 |
| `0x12000060` | SYNCV | GS 特权寄存器 | 64 | R/W | 未实现 | 垂直同步时序（前后肩、同步宽度），QEMU 只保存 |
| `0x12000070` | [DISPFB1](/chapters/09-gs#dispfb1) | GS 特权寄存器 | 64 | R/W | 已验证 | 读出电路 1 的帧缓冲设置 |
| `0x12000080` | [DISPLAY1](/chapters/09-gs#display1) | GS 特权寄存器 | 64 | R/W | 已验证 | 读出电路 1 的显示位置与大小 |
| `0x12000090` | DISPFB2 | GS 特权寄存器 | 64 | R/W | 已验证 | 读出电路 2 的帧缓冲设置，格式同 DISPFB1 |
| `0x120000A0` | DISPLAY2 | GS 特权寄存器 | 64 | R/W | 已验证 | 读出电路 2 的显示位置与大小，格式同 DISPLAY1 |
| `0x120000B0` | EXTBUF | GS 特权寄存器 | 64 | R/W | 未实现 | 回写（feedback write）目标缓冲设置，QEMU 只保存 |
| `0x120000C0` | EXTDATA | GS 特权寄存器 | 64 | R/W | 未实现 | 回写源区域设置，QEMU 只保存 |
| `0x120000D0` | EXTWRITE | GS 特权寄存器 | 64 | R/W | 未实现 | 回写启动 / 停止，QEMU 只保存 |
| `0x120000E0` | [BGCOLOR](/chapters/09-gs#bgcolor) | GS 特权寄存器 | 64 | R/W | 未实现 | PCRTC 背景色 |
| `0x12001000` | [CSR](/chapters/09-gs#csr) | GS 特权寄存器 | 64 | R/W | 已验证 | GS 控制 / 状态：事件标志、复位、场、FIFO 状态、版本 |
| `0x12001010` | [IMR](/chapters/09-gs#imr) | GS 特权寄存器 | 64 | R/W | 参考 | GS 中断屏蔽，每个 CSR 事件一位 |
| `0x12001040` | [BUSDIR](/chapters/09-gs#busdir) | GS 特权寄存器 | 64 | R/W | 未实现 | 主机接口方向（本地 → 主机传输前置 1） |
| `0x12001080` | [SIGLBLID](/chapters/09-gs#siglblid) | GS 特权寄存器 | 64 | R/W | 参考 | SIGNAL / LABEL 写入的标识 |
| `0x1A000000` | [DVE_CMD](/chapters/14-peripherals#dve-cmd) | DVE 视频编码器串行端口 | 16 | R/W | 已验证 | 命令：传输字节数与启动位 |
| `0x1A000002` | [DVE_ADDR](/chapters/14-peripherals#dve-addr) | DVE 视频编码器串行端口 | 16 | R/W | 已验证 | 串行总线地址字节：0x42 写、0x43 读 |
| `0x1A000004` | DVE_UNK04 | DVE 视频编码器串行端口 | 16 | R/W | 未实现 | 含义不明；QEMU 只保存并记录 LOG_UNIMP |
| `0x1A000006` | [DVE_STAT](/chapters/14-peripherals#dve-stat) | DVE 视频编码器串行端口 | 16 | R/W | 已验证 | 传输状态：完成、无应答；任何写入清除这两位 |
| `0x1A000008` | DVE_UNK08 | DVE 视频编码器串行端口 | 16 | R/W | 未实现 | 含义不明；QEMU 只保存并记录 LOG_UNIMP |
| `0x1A00000A` | [DVE_POWER](/chapters/14-peripherals#dve-power) | DVE 视频编码器串行端口 | 16 | R/W | 已验证 | 视频编码器电源（第 0 位为 1 表示上电） |
| `0x1A000010` | [DVE_DATA0](/chapters/14-peripherals#dve-data0) | DVE 视频编码器串行端口 | 16 | R/W | 已验证 | 数据 0：写传输时为寄存器号，读传输后为读出的值 |
| `0x1A000012` | [DVE_DATA1](/chapters/14-peripherals#dve-data1) | DVE 视频编码器串行端口 | 16 | R/W | 已验证 | 数据 1：写 2 字节时写入当前寄存器的值（低 8 位） |
| `0x1A000014` | DVE_DATA2_7 | DVE 视频编码器串行端口 | 16 | R/W | 未实现 | 数据 2–7（0x1A000014–0x1A00001E）；QEMU 只保存，不参与传输 |
| `0x1F402004` | [N_COMMAND](/chapters/13-cdvd#n-command) | CDVD 控制器 | 8 | R/W | 已验证 | N 命令寄存器：写入启动 N 命令，读出当前 N 命令 |
| `0x1F402005` | [N_PARAM](/chapters/13-cdvd#n-param) | CDVD 控制器 | 8 | WO | 已验证 | N 命令参数 FIFO |
| `0x1F402005` | [N_READY](/chapters/13-cdvd#n-ready) | CDVD 控制器 | 8 | RO | 已验证 | N 命令状态（就绪、忙、出错） |
| `0x1F402006` | [ERROR](/chapters/13-cdvd#error) | CDVD 控制器 | 8 | R/C | 已验证 | N 命令错误码，读出后清零 |
| `0x1F402006` | [HOWTO](/chapters/13-cdvd#howto) | CDVD 控制器 | 8 | WO | 未实现 | 读取方式设置（配合 DMA 通道 3） |
| `0x1F402007` | [BREAK](/chapters/13-cdvd#break) | CDVD 控制器 | 8 | R/W | 未实现 | 中止当前 N 命令 |
| `0x1F402008` | [CDVD_I_STAT](/chapters/13-cdvd#cdvd-i-stat) | CDVD 控制器 | 8 | R/W1C | 已验证 | CDVD 中断原因，写 1 清零 |
| `0x1F402009` | [WHERE_SEL](/chapters/13-cdvd#where-sel) | CDVD 控制器 | 8 | WO | 未实现 | 当前位置寄存器的模式选择 |
| `0x1F40200A` | [STATUS](/chapters/13-cdvd#status) | CDVD 控制器 | 8 | RO | 已验证 | 驱动器状态（托盘、主轴、读、暂停、寻道） |
| `0x1F40200B` | [STICKY](/chapters/13-cdvd#sticky) | CDVD 控制器 | 8 | RO | 已验证 | 累积驱动器状态 |
| `0x1F40200C` | CRT_MINUTE | CDVD 控制器 | 8 | RO | 未实现 | 当前位置：分（BCD），QEMU 读 0 |
| `0x1F40200D` | CRT_SECOND | CDVD 控制器 | 8 | RO | 未实现 | 当前位置：秒（BCD，含 2 秒引导区），QEMU 恒读 0x02 |
| `0x1F40200E` | CRT_FRAME | CDVD 控制器 | 8 | RO | 未实现 | 当前位置：帧（BCD），QEMU 读 0 |
| `0x1F40200F` | [TYPE](/chapters/13-cdvd#type) | CDVD 控制器 | 8 | RO | 未实现 | 光盘类型，QEMU 恒为 0（无光盘） |
| `0x1F402013` | SPEED | CDVD 控制器 | 8 | RO | 未实现 | 当前主轴速度，QEMU 读 0 |
| `0x1F402014` | PS1_SPEED | CDVD 控制器 | 8 | WO | 未实现 | PS1 模式光驱速度（标准 / 快速），QEMU 忽略写入 |
| `0x1F402015` | RSV | CDVD 控制器 | 8 | RO | 未实现 | 保留（与 PSX DESR 有关），普通 PS2 读 0 |
| `0x1F402016` | [S_COMMAND](/chapters/13-cdvd#s-command) | CDVD 控制器 | 8 | R/W | 已验证 | S 命令寄存器：写入执行 S 命令，读出当前 S 命令 |
| `0x1F402017` | [S_PARAM](/chapters/13-cdvd#s-param) | CDVD 控制器 | 8 | WO | 已验证 | S 命令参数 FIFO |
| `0x1F402017` | [S_STATUS](/chapters/13-cdvd#s-status) | CDVD 控制器 | 8 | RO | 已验证 | S 命令状态（结果是否可读、忙） |
| `0x1F402018` | [S_RESULT](/chapters/13-cdvd#s-result) | CDVD 控制器 | 8 | RO | 已验证 | S 命令结果，逐字节读出 |
| `0x1F402020` | KEY_A | CDVD 控制器 | 8 | RO | 未实现 | 光盘密钥字节 0–4（0x1F402020–0x1F402024），QEMU 读 0 |
| `0x1F402028` | KEY_B | CDVD 控制器 | 8 | RO | 未实现 | 光盘密钥字节 5–9（0x1F402028–0x1F40202C），QEMU 读 0 |
| `0x1F402030` | KEY_C | CDVD 控制器 | 8 | RO | 未实现 | 光盘密钥字节 10–14（0x1F402030–0x1F402034），QEMU 读 0 |
| `0x1F402038` | KEY_VALID | CDVD 控制器 | 8 | RO | 未实现 | 密钥有效标志（密钥字节 15），QEMU 读 0 |
| `0x1F402039` | KEY_XOR | CDVD 控制器 | 8 | RO | 未实现 | 密钥异或值，QEMU 读 0 |
| `0x1F40203A` | [DEC_SET](/chapters/13-cdvd#dec-set) | CDVD 控制器 | 8 | R/W | 未实现 | 扇区数据解密设置（异或、循环移位） |
| `0x1F801000` | SPD_ADDR | IOP SSBUS 总线配置 | 32 | R/W | 未实现 | SPEED（DEV9）窗口基地址 |
| `0x1F801004` | PIO_ADDR | IOP SSBUS 总线配置 | 32 | R/W | 未实现 | PIO 窗口基地址 |
| `0x1F801008` | SPD_DELAY | IOP SSBUS 总线配置 | 32 | R/W | 未实现 | SPEED 窗口访问时序 |
| `0x1F80100C` | DEV1_DELAY | IOP SSBUS 总线配置 | 32 | R/W | 未实现 | DEV1 窗口访问时序 |
| `0x1F801010` | ROM_DELAY | IOP SSBUS 总线配置 | 32 | R/W | 未实现 | Boot ROM 访问时序（BIOS 写 0x0016244F） |
| `0x1F801014` | SPU_DELAY | IOP SSBUS 总线配置 | 32 | R/W | 未实现 | SPU2 访问时序 |
| `0x1F801018` | DEV5_DELAY | IOP SSBUS 总线配置 | 32 | R/W | 未实现 | DEV5 窗口访问时序 |
| `0x1F80101C` | PIO_DELAY | IOP SSBUS 总线配置 | 32 | R/W | 未实现 | PIO 访问时序 |
| `0x1F801020` | COM_DELAY | IOP SSBUS 总线配置 | 32 | R/W | 未实现 | 公共访问时序 |
| `0x1F801070` | [I_STAT](/chapters/12-iop#i-stat) | IOP 中断控制器 | 32 | R/W | 已验证 | 中断状态，每个中断源一位，写 0 清零 |
| `0x1F801074` | [I_MASK](/chapters/12-iop#i-mask) | IOP 中断控制器 | 32 | R/W | 已验证 | 中断屏蔽，为 1 的位允许对应中断源 |
| `0x1F801078` | [I_CTRL](/chapters/12-iop#i-ctrl) | IOP 中断控制器 | 32 | R/W | 已验证 | 中断总允许；读出时自动清零 |
| `0x1F8010F0` | [DPCR](/chapters/12-iop#dpcr) | IOP DMA 控制器 | 32 | R/W | 已验证 | 通道 0–6 的优先级与允许位 |
| `0x1F8010F4` | [DICR](/chapters/12-iop#dicr) | IOP DMA 控制器 | 32 | R/W | 已验证 | 通道 0–6 的中断屏蔽与结束标志；DMA 中断总开关 |
| `0x1F801400` | DEV1_ADDR | IOP SSBUS 总线配置 | 32 | R/W | 未实现 | DEV1 窗口基地址 |
| `0x1F801404` | SPU_ADDR | IOP SSBUS 总线配置 | 32 | R/W | 未实现 | SPU2 窗口基地址 |
| `0x1F801408` | DEV5_ADDR | IOP SSBUS 总线配置 | 32 | R/W | 未实现 | DEV5 窗口基地址 |
| `0x1F80140C` | SPU1_ADDR | IOP SSBUS 总线配置 | 32 | R/W | 未实现 | 第二个 SPU 窗口基地址 |
| `0x1F801410` | DEV9_ADDR3 | IOP SSBUS 总线配置 | 32 | R/W | 未实现 | DEV9 第 3 窗口基地址 |
| `0x1F801414` | SPU1_DELAY | IOP SSBUS 总线配置 | 32 | R/W | 未实现 | 第二个 SPU 窗口访问时序 |
| `0x1F801418` | DEV9_DELAY2 | IOP SSBUS 总线配置 | 32 | R/W | 未实现 | DEV9 第 2 窗口访问时序 |
| `0x1F80141C` | DEV9_DELAY3 | IOP SSBUS 总线配置 | 32 | R/W | 未实现 | DEV9 第 3 窗口访问时序 |
| `0x1F801420` | DEV9_DELAY1 | IOP SSBUS 总线配置 | 32 | R/W | 未实现 | DEV9 第 1 窗口访问时序 |
| `0x1F801450` | [ICFG](/chapters/12-iop#icfg) | IOP SSBUS 总线配置 | 32 | R/W | 已验证 | IOP 配置；第 1 位向 EE 发出 SBUS 中断 |
| `0x1F801462` | [DEV9_1462](/chapters/14-peripherals#dev9-1462) | DEV9 扩展接口与 SPEED | 16 | RO | 参考 | 扩展槽设备检测（第 0 位为 0 表示有设备） |
| `0x1F80146C` | [DEV9_POWER](/chapters/14-peripherals#dev9-power) | DEV9 扩展接口与 SPEED | 16 | R/W | 未实现 | 扩展设备电源与复位控制（QEMU 只保存） |
| `0x1F80146E` | [DEV9_REV](/chapters/14-peripherals#dev9-rev) | DEV9 扩展接口与 SPEED | 16 | RO | 参考 | DEV9 控制器类型：0x20 为 PC 卡型，0x30 为扩展槽型 |
| `0x1F801570` | [DPCR2](/chapters/12-iop#dpcr2) | IOP DMA 控制器 | 32 | R/W | 已验证 | 通道 7–12 的优先级与允许位 |
| `0x1F801574` | [DICR2](/chapters/12-iop#dicr2) | IOP DMA 控制器 | 32 | R/W | 已验证 | 通道 7–12 的中断屏蔽与结束标志 |
| `0x1F801578` | [DMACEN](/chapters/12-iop#dmacen) | IOP DMA 控制器 | 32 | R/W | 未实现 | DMA 全局允许（仅第二组） |
| `0x1F80157C` | [DMACINTEN](/chapters/12-iop#dmacinten) | IOP DMA 控制器 | 32 | R/W | 未实现 | DMA 全局中断控制（仅第二组） |
| `0x1F808200` | [SIO2_SEND3](/chapters/14-peripherals#sio2-send3) | SIO2 串行接口 | 32 | R/W | 已验证 | 命令队列，16 项（SEND3[0]–SEND3[15]，地址 0x1F808200 + 4n） |
| `0x1F808240` | [SIO2_SEND1](/chapters/14-peripherals#sio2-send1) | SIO2 串行接口 | 32 | R/W | 未实现 | 端口 n 控制 1：ATT 时序与波特率分频（n = 0–3，地址 0x1F808240 + 8n） |
| `0x1F808244` | [SIO2_SEND2](/chapters/14-peripherals#sio2-send2) | SIO2 串行接口 | 32 | R/W | 未实现 | 端口 n 控制 2：应答超时与字节间隔（n = 0–3，地址 0x1F808244 + 8n） |
| `0x1F808260` | [SIO2_DATAIN](/chapters/14-peripherals#sio2-datain) | SIO2 串行接口 | 8 | WO | 已验证 | 命令数据写入（8 位），SIO2in DMA 也写此处 |
| `0x1F808264` | [SIO2_DATAOUT](/chapters/14-peripherals#sio2-dataout) | SIO2 串行接口 | 8 | RO | 未实现 | 应答数据读出（8 位），SIO2out DMA 也读此处 |
| `0x1F808268` | [SIO2_CTRL](/chapters/14-peripherals#sio2-ctrl) | SIO2 串行接口 | 32 | R/W | 已验证 | 控制：启动传输、复位、中断允许 |
| `0x1F80826C` | [SIO2_RECV1](/chapters/14-peripherals#sio2-recv1) | SIO2 串行接口 | 32 | RO | 已验证 | 传输状态：队列位置、空闲、应答缺失与各项错误 |
| `0x1F808270` | [SIO2_RECV2](/chapters/14-peripherals#sio2-recv2) | SIO2 串行接口 | 32 | RO | 未实现 | 设备连接检测状态 |
| `0x1F808274` | [SIO2_RECV3](/chapters/14-peripherals#sio2-recv3) | SIO2 串行接口 | 32 | RO | 未实现 | FIFO 状态：发送 / 接收字节数与溢出标志 |
| `0x1F808278` | SIO2_FIFO_TX | SIO2 串行接口 | 32 | R/W | 未实现 | 发送 FIFO 指针（QEMU 只保存） |
| `0x1F80827C` | SIO2_FIFO_RX | SIO2 串行接口 | 32 | R/W | 未实现 | 接收 FIFO 指针（QEMU 只保存） |
| `0x1F808280` | [SIO2_ISTAT](/chapters/14-peripherals#sio2-istat) | SIO2 串行接口 | 32 | R/W1C | 已验证 | 中断状态（写 1 清零） |
| `0x1F900198` | SPU2_MMIX | SPU2 声音处理器 | 16 | R/W | 未实现 | 声部混合后的输出选择；复位值核心 0 为 0x0FF0、核心 1 为 0x0FFC，QEMU 只保存 |
| `0x1F90019A` | [SPU2_ATTR](/chapters/14-peripherals#spu2-attr) | SPU2 声音处理器 | 16 | R/W | 已验证 | 核心属性：DMA 模式、中断允许、效果允许等（核心 1：0x1F90059A） |
| `0x1F90019C` | [SPU2_IRQAH](/chapters/14-peripherals#spu2-irqah) | SPU2 声音处理器 | 16 | R/W | 已验证 | 中断地址高半字（地址第 19:16 位） |
| `0x1F90019E` | [SPU2_IRQAL](/chapters/14-peripherals#spu2-irqal) | SPU2 声音处理器 | 16 | R/W | 已验证 | 中断地址低半字（地址第 15:0 位） |
| `0x1F9001A0` | SPU2_KON0 | SPU2 声音处理器 | 16 | WO | 已验证 | 键按下（key on），声部 0–15；QEMU 只清除 ENDX 对应位，读出为 0 |
| `0x1F9001A2` | SPU2_KON1 | SPU2 声音处理器 | 16 | WO | 已验证 | 键按下，声部 16–23（第 7:0 位）；QEMU 只清除 ENDX 对应位 |
| `0x1F9001A4` | SPU2_KOFF0 | SPU2 声音处理器 | 16 | WO | 未实现 | 键释放（key off），声部 0–15；QEMU 忽略写入，读出为 0 |
| `0x1F9001A6` | SPU2_KOFF1 | SPU2 声音处理器 | 16 | WO | 未实现 | 键释放，声部 16–23；QEMU 忽略写入，读出为 0 |
| `0x1F9001A8` | [SPU2_TSAH](/chapters/14-peripherals#spu2-tsah) | SPU2 声音处理器 | 16 | R/W | 已验证 | 传输起始地址高半字（地址第 19:16 位） |
| `0x1F9001AA` | [SPU2_TSAL](/chapters/14-peripherals#spu2-tsal) | SPU2 声音处理器 | 16 | R/W | 已验证 | 传输起始地址低半字（地址第 15:0 位） |
| `0x1F9001AC` | [SPU2_DATA](/chapters/14-peripherals#spu2-data) | SPU2 声音处理器 | 16 | R/W | 已验证 | 数据端口：在 TSA 处读写声音存储器一个半字，TSA 加 1 |
| `0x1F9001B0` | [SPU2_ADMAS](/chapters/14-peripherals#spu2-admas) | SPU2 声音处理器 | 16 | R/W | 未实现 | 自动 DMA（AutoDMA）控制与状态 |
| `0x1F900340` | SPU2_ENDX0 | SPU2 声音处理器 | 16 | R/W | 已验证 | 声部结束标志，声部 0–15；QEMU 中任何写入清零，KON 清除对应位 |
| `0x1F900342` | SPU2_ENDX1 | SPU2 声音处理器 | 16 | R/W | 已验证 | 声部结束标志，声部 16–23（第 7:0 位） |
| `0x1F900344` | [SPU2_STATX](/chapters/14-peripherals#spu2-statx) | SPU2 声音处理器 | 16 | R/W | 已验证 | 核心状态：DMA 就绪、忙（核心 1：0x1F900744） |
| `0x1F9007C2` | [SPU2_IRQINFO](/chapters/14-peripherals#spu2-irqinfo) | SPU2 声音处理器 | 16 | R/W | 已验证 | 中断来源：哪个核心的 IRQA 被访问（两核心共用） |

## 无总线地址的寄存器

此类寄存器经协处理器指令、GIF 数据包或命令访问，“编号”列为寄存器编号或偏移。

| 模块 | 寄存器 | 编号 | 位宽 | 属性 | 状态 | 功能 |
|---|---|---|---|---|---|---|
| EE 核心 COP0 寄存器 | [Index](/chapters/03-ee-core#index) | `0x0` | 32 | R/W | 已验证 | TLBR、TLBWI 访问的 TLB 项号；TLBP 结果 |
| EE 核心 COP0 寄存器 | [Random](/chapters/03-ee-core#random) | `0x1` | 32 | RO | 已验证 | TLBWR 使用的随机项号 |
| EE 核心 COP0 寄存器 | [EntryLo0](/chapters/03-ee-core#entrylo0) | `0x2` | 32 | R/W | 已验证 | TLB 项偶数页的低半部分，含 S 位 |
| EE 核心 COP0 寄存器 | [EntryLo1](/chapters/03-ee-core#entrylo1) | `0x3` | 32 | R/W | 已验证 | TLB 项奇数页的低半部分 |
| EE 核心 COP0 寄存器 | [Context](/chapters/03-ee-core#context) | `0x4` | 32 | R/W | 参考 | 页表项指针，供 TLB 重填处理程序使用 |
| EE 核心 COP0 寄存器 | [PageMask](/chapters/03-ee-core#pagemask) | `0x5` | 32 | R/W | 已验证 | TLB 项的页大小 |
| EE 核心 COP0 寄存器 | [Wired](/chapters/03-ee-core#wired) | `0x6` | 32 | R/W | 已验证 | 固定 TLB 项数，Random 的下界 |
| EE 核心 COP0 寄存器 | [BadVAddr](/chapters/03-ee-core#badvaddr) | `0x8` | 32 | RO | 参考 | 出错的虚拟地址 |
| EE 核心 COP0 寄存器 | [Count](/chapters/03-ee-core#count) | `0x9` | 32 | R/W | 参考 | 时钟计数器 |
| EE 核心 COP0 寄存器 | [EntryHi](/chapters/03-ee-core#entryhi) | `0xA` | 32 | R/W | 已验证 | TLB 项的高半部分：VPN2 与 ASID |
| EE 核心 COP0 寄存器 | [Compare](/chapters/03-ee-core#compare) | `0xB` | 32 | R/W | 参考 | 定时器比较值 |
| EE 核心 COP0 寄存器 | [Status](/chapters/03-ee-core#status) | `0xC` | 32 | R/W | 已验证 | 处理器状态：中断允许、运行模式、协处理器可用 |
| EE 核心 COP0 寄存器 | [Cause](/chapters/03-ee-core#cause) | `0xD` | 32 | R/W | 已验证 | 最近一次异常的原因与中断请求 |
| EE 核心 COP0 寄存器 | [EPC](/chapters/03-ee-core#epc) | `0xE` | 32 | R/W | 已验证 | 第 1 级异常返回地址 |
| EE 核心 COP0 寄存器 | [PRId](/chapters/03-ee-core#prid) | `0xF` | 32 | RO | 已验证 | 处理器标识 |
| EE 核心 COP0 寄存器 | [Config](/chapters/03-ee-core#config) | `0x10` | 32 | R/W | 参考 | 缓存大小、KSEG0 缓存方式与流水线功能开关 |
| EE 核心 COP0 寄存器 | [BadPAddr](/chapters/03-ee-core#badpaddr) | `0x17` | 32 | RO | 未实现 | 总线错误的物理地址 |
| EE 核心 COP0 寄存器 | [Debug](/chapters/03-ee-core#debug) | `0x18` | 32 | R/W | 未实现 | 硬件断点寄存器组（按 sel 选择） |
| EE 核心 COP0 寄存器 | [Perf](/chapters/03-ee-core#perf) | `0x19` | 32 | R/W | 未实现 | 性能计数器控制与两个计数器（按 sel 选择） |
| EE 核心 COP0 寄存器 | [TagLo](/chapters/03-ee-core#taglo) | `0x1C` | 32 | R/W | 未实现 | 缓存标记低位，供 CACHE 指令读写 |
| EE 核心 COP0 寄存器 | [TagHi](/chapters/03-ee-core#taghi) | `0x1D` | 32 | R/W | 未实现 | 缓存标记高位 |
| EE 核心 COP0 寄存器 | [ErrorEPC](/chapters/03-ee-core#errorepc) | `0x1E` | 32 | R/W | 参考 | 第 2 级异常返回地址 |
| EE 核心 COP1（FPU）控制寄存器 | [FCR0](/chapters/03-ee-core#fcr0) | `0x0` | 32 | RO | 已验证 | FPU 实现号与修订号 |
| EE 核心 COP1（FPU）控制寄存器 | [FCR31](/chapters/03-ee-core#fcr31) | `0x1F` | 32 | R/W | 已验证 | FPU 条件位与运算标志 |
| EE DMA 控制器 | [Dn_CHCR](/chapters/06-dmac#dn-chcr) | `0x0` | 32 | R/W | 已验证 | 通道控制（方向、模式、启动），n = 0–9 |
| EE DMA 控制器 | [Dn_MADR](/chapters/06-dmac#dn-madr) | `0x10` | 32 | R/W | 已验证 | 传输存储器地址 |
| EE DMA 控制器 | [Dn_QWC](/chapters/06-dmac#dn-qwc) | `0x20` | 32 | R/W | 已验证 | 剩余传输四字数 |
| EE DMA 控制器 | [Dn_TADR](/chapters/06-dmac#dn-tadr) | `0x30` | 32 | R/W | 已验证 | 下一个 DMAtag 的地址（源链） |
| EE DMA 控制器 | [Dn_ASR0](/chapters/06-dmac#dn-asr0) | `0x40` | 32 | R/W | 参考 | 地址栈 0（call/ret 返回地址） |
| EE DMA 控制器 | [Dn_ASR1](/chapters/06-dmac#dn-asr1) | `0x50` | 32 | R/W | 参考 | 地址栈 1（第二级返回地址） |
| EE DMA 控制器 | [Dn_SADR](/chapters/06-dmac#dn-sadr) | `0x80` | 32 | R/W | 未实现 | SPR 一侧地址（仅通道 8/9） |
| EE DMAC DMAtag | [DMAtag](/chapters/06-dmac#dmatag) | — | 128 | — | 已验证 | 源链 DMAtag（存储器 → 外设） |
| EE DMAC DMAtag | [DMAtag_DST](/chapters/06-dmac#dmatag-dst) | — | 128 | — | 已验证 | 目的链 DMAtag（外设 → 存储器） |
| GIF 数据包标签 GIFtag | [GIFtag](/chapters/08-gif#giftag) | — | 128 | — | 已验证 | GIF 数据包标签（每个图元一个） |
| GS 一般寄存器 | [PRIM](/chapters/09-gs#prim) | `0x0` | 64 | WO | 已验证 | 图元类型与属性；写入时清空顶点队列 |
| GS 一般寄存器 | [RGBAQ](/chapters/09-gs#rgbaq) | `0x1` | 64 | WO | 已验证 | 顶点颜色与纹理坐标 Q |
| GS 一般寄存器 | [ST](/chapters/09-gs#st) | `0x2` | 64 | WO | 已验证 | 纹理坐标 S、T（单精度浮点） |
| GS 一般寄存器 | [UV](/chapters/09-gs#uv) | `0x3` | 64 | WO | 已验证 | 纹素坐标 U、V（定点，4 位小数） |
| GS 一般寄存器 | [XYZF2](/chapters/09-gs#xyzf2) | `0x4` | 64 | WO | 已验证 | 顶点坐标（24 位 Z）与雾化系数，踢出顶点并可触发绘制 |
| GS 一般寄存器 | [XYZ2](/chapters/09-gs#xyz2) | `0x5` | 64 | WO | 已验证 | 顶点坐标（32 位 Z），踢出顶点并可触发绘制 |
| GS 一般寄存器 | [TEX0_1](/chapters/09-gs#tex0-1) | `0x6` | 64 | WO | 已验证 | 上下文 1 纹理设置：纹理缓冲、格式、大小、纹理函数、CLUT |
| GS 一般寄存器 | TEX0_2 | `0x7` | 64 | WO | 已验证 | 上下文 2 纹理设置，格式同 TEX0_1 |
| GS 一般寄存器 | [CLAMP_1](/chapters/09-gs#clamp-1) | `0x8` | 64 | WO | 已验证 | 上下文 1 纹理坐标回绕方式 |
| GS 一般寄存器 | CLAMP_2 | `0x9` | 64 | WO | 已验证 | 上下文 2 纹理坐标回绕方式，格式同 CLAMP_1 |
| GS 一般寄存器 | [FOG](/chapters/09-gs#fog) | `0xA` | 64 | WO | 参考 | 顶点雾化系数 F（第 63:56 位） |
| GS 一般寄存器 | [XYZF3](/chapters/09-gs#xyzf3) | `0xC` | 64 | WO | 已验证 | 同 XYZF2，只踢出顶点，不触发绘制 |
| GS 一般寄存器 | [XYZ3](/chapters/09-gs#xyz3) | `0xD` | 64 | WO | 已验证 | 同 XYZ2，只踢出顶点，不触发绘制 |
| GS 一般寄存器 | [TEX1_1](/chapters/09-gs#tex1-1) | `0x14` | 64 | WO | 未实现 | 上下文 1 纹理过滤与 LOD（mipmap）设置 |
| GS 一般寄存器 | TEX1_2 | `0x15` | 64 | WO | 未实现 | 上下文 2 纹理过滤与 LOD 设置，格式同 TEX1_1 |
| GS 一般寄存器 | [TEX2_1](/chapters/09-gs#tex2-1) | `0x16` | 64 | WO | 已验证 | 只改写 TEX0_1 的 PSM 与 CLUT 位域 |
| GS 一般寄存器 | TEX2_2 | `0x17` | 64 | WO | 已验证 | 只改写 TEX0_2 的 PSM 与 CLUT 位域，格式同 TEX2_1 |
| GS 一般寄存器 | [XYOFFSET_1](/chapters/09-gs#xyoffset-1) | `0x18` | 64 | WO | 已验证 | 上下文 1 原始坐标到窗口坐标的偏移 |
| GS 一般寄存器 | XYOFFSET_2 | `0x19` | 64 | WO | 已验证 | 上下文 2 坐标偏移，格式同 XYOFFSET_1 |
| GS 一般寄存器 | [PRMODECONT](/chapters/09-gs#prmodecont) | `0x1A` | 64 | WO | 参考 | 图元属性来源选择（PRIM 或 PRMODE） |
| GS 一般寄存器 | [PRMODE](/chapters/09-gs#prmode) | `0x1B` | 64 | WO | 已验证 | 图元属性（PRMODECONT.AC = 0 时使用） |
| GS 一般寄存器 | [TEXCLUT](/chapters/09-gs#texclut) | `0x1C` | 64 | WO | 未实现 | CSM2 方式下 CLUT 在缓冲中的位置 |
| GS 一般寄存器 | [SCANMSK](/chapters/09-gs#scanmsk) | `0x22` | 64 | WO | 未实现 | 按奇偶行屏蔽绘制 |
| GS 一般寄存器 | [MIPTBP1_1](/chapters/09-gs#miptbp1-1) | `0x34` | 64 | WO | 未实现 | 上下文 1 mipmap 第 1–3 级纹理地址与宽度 |
| GS 一般寄存器 | MIPTBP1_2 | `0x35` | 64 | WO | 未实现 | 上下文 2 mipmap 第 1–3 级，格式同 MIPTBP1_1 |
| GS 一般寄存器 | [MIPTBP2_1](/chapters/09-gs#miptbp2-1) | `0x36` | 64 | WO | 未实现 | 上下文 1 mipmap 第 4–6 级纹理地址与宽度 |
| GS 一般寄存器 | MIPTBP2_2 | `0x37` | 64 | WO | 未实现 | 上下文 2 mipmap 第 4–6 级，格式同 MIPTBP2_1 |
| GS 一般寄存器 | [TEXA](/chapters/09-gs#texa) | `0x3B` | 64 | WO | 参考 | 16 / 24 位纹理展开为 RGBA32 时的 α 值 |
| GS 一般寄存器 | [FOGCOL](/chapters/09-gs#fogcol) | `0x3D` | 64 | WO | 参考 | 雾颜色 |
| GS 一般寄存器 | [TEXFLUSH](/chapters/09-gs#texflush) | `0x3F` | 64 | WO | 未实现 | 使纹理缓存失效 |
| GS 一般寄存器 | [SCISSOR_1](/chapters/09-gs#scissor-1) | `0x40` | 64 | WO | 已验证 | 上下文 1 裁剪矩形（窗口坐标） |
| GS 一般寄存器 | SCISSOR_2 | `0x41` | 64 | WO | 已验证 | 上下文 2 裁剪矩形，格式同 SCISSOR_1 |
| GS 一般寄存器 | [ALPHA_1](/chapters/09-gs#alpha-1) | `0x42` | 64 | WO | 已验证 | 上下文 1 α 混合公式选择 |
| GS 一般寄存器 | ALPHA_2 | `0x43` | 64 | WO | 已验证 | 上下文 2 α 混合公式选择，格式同 ALPHA_1 |
| GS 一般寄存器 | [DIMX](/chapters/09-gs#dimx) | `0x44` | 64 | WO | 未实现 | 4 × 4 抖动矩阵 |
| GS 一般寄存器 | [DTHE](/chapters/09-gs#dthe) | `0x45` | 64 | WO | 未实现 | 抖动允许 |
| GS 一般寄存器 | [COLCLAMP](/chapters/09-gs#colclamp) | `0x46` | 64 | WO | 参考 | α 混合结果的钳位方式 |
| GS 一般寄存器 | [TEST_1](/chapters/09-gs#test-1) | `0x47` | 64 | WO | 已验证 | 上下文 1 像素测试：α 测试、目的 α 测试、深度测试 |
| GS 一般寄存器 | TEST_2 | `0x48` | 64 | WO | 已验证 | 上下文 2 像素测试，格式同 TEST_1 |
| GS 一般寄存器 | [PABE](/chapters/09-gs#pabe) | `0x49` | 64 | WO | 未实现 | 按像素 α 控制 α 混合 |
| GS 一般寄存器 | [FBA_1](/chapters/09-gs#fba-1) | `0x4A` | 64 | WO | 未实现 | 上下文 1 写入帧缓冲时 α 最高位强制置 1 |
| GS 一般寄存器 | FBA_2 | `0x4B` | 64 | WO | 未实现 | 上下文 2 α 最高位强制置 1，格式同 FBA_1 |
| GS 一般寄存器 | [FRAME_1](/chapters/09-gs#frame-1) | `0x4C` | 64 | WO | 已验证 | 上下文 1 帧缓冲设置 |
| GS 一般寄存器 | FRAME_2 | `0x4D` | 64 | WO | 已验证 | 上下文 2 帧缓冲设置，格式同 FRAME_1 |
| GS 一般寄存器 | [ZBUF_1](/chapters/09-gs#zbuf-1) | `0x4E` | 64 | WO | 已验证 | 上下文 1 Z 缓冲设置 |
| GS 一般寄存器 | ZBUF_2 | `0x4F` | 64 | WO | 已验证 | 上下文 2 Z 缓冲设置，格式同 ZBUF_1 |
| GS 一般寄存器 | [BITBLTBUF](/chapters/09-gs#bitbltbuf) | `0x50` | 64 | WO | 已验证 | 传输的源 / 目的缓冲设置 |
| GS 一般寄存器 | [TRXPOS](/chapters/09-gs#trxpos) | `0x51` | 64 | WO | 已验证 | 传输矩形左上角与本地 → 本地的传输顺序 |
| GS 一般寄存器 | [TRXREG](/chapters/09-gs#trxreg) | `0x52` | 64 | WO | 已验证 | 传输矩形的宽与高 |
| GS 一般寄存器 | [TRXDIR](/chapters/09-gs#trxdir) | `0x53` | 64 | WO | 已验证 | 传输方向；写入即启动传输 |
| GS 一般寄存器 | [HWREG](/chapters/09-gs#hwreg) | `0x54` | 64 | WO | 参考 | 主机 → 本地传输的数据端口 |
| GS 一般寄存器 | [SIGNAL](/chapters/09-gs#signal) | `0x60` | 64 | WO | 已验证 | 更新 SIGLBLID.SIGID 并产生 SIGNAL 事件 |
| GS 一般寄存器 | [FINISH](/chapters/09-gs#finish) | `0x61` | 64 | WO | 已验证 | 之前的绘图全部完成后产生 FINISH 事件 |
| GS 一般寄存器 | [LABEL](/chapters/09-gs#label) | `0x62` | 64 | WO | 参考 | 更新 SIGLBLID.LBLID，不产生事件 |
| IOP 核心 COP0 寄存器 | [BPC](/chapters/12-iop#bpc) | `0x3` | 32 | R/W | 未实现 | 指令断点地址 |
| IOP 核心 COP0 寄存器 | [BDA](/chapters/12-iop#bda) | `0x5` | 32 | R/W | 未实现 | 数据断点地址 |
| IOP 核心 COP0 寄存器 | [JUMPDEST](/chapters/12-iop#jumpdest) | `0x6` | 32 | RO | 未实现 | 最近一次跳转的目标地址（来源不确定） |
| IOP 核心 COP0 寄存器 | [DCIC](/chapters/12-iop#dcic) | `0x7` | 32 | R/W | 未实现 | 断点控制与调试状态 |
| IOP 核心 COP0 寄存器 | [BadVaddr](/chapters/12-iop#badvaddr) | `0x8` | 32 | RO | 已验证 | 出错的虚拟地址 |
| IOP 核心 COP0 寄存器 | [BDAM](/chapters/12-iop#bdam) | `0x9` | 32 | R/W | 未实现 | 数据断点地址掩码 |
| IOP 核心 COP0 寄存器 | [BPCM](/chapters/12-iop#bpcm) | `0xB` | 32 | R/W | 未实现 | 指令断点地址掩码 |
| IOP 核心 COP0 寄存器 | [SR](/chapters/12-iop#sr) | `0xC` | 32 | R/W | 已验证 | 状态寄存器：KU/IE 三级栈、中断屏蔽、缓存隔离、BEV、CU0 |
| IOP 核心 COP0 寄存器 | [CAUSE](/chapters/12-iop#cause) | `0xD` | 32 | R/W | 已验证 | 异常原因、待处理中断、分支延迟槽标志 |
| IOP 核心 COP0 寄存器 | [EPC](/chapters/12-iop#epc) | `0xE` | 32 | RO | 已验证 | 异常返回地址 |
| IOP 核心 COP0 寄存器 | [PRID](/chapters/12-iop#prid) | `0xF` | 32 | RO | 已验证 | 处理器标识，IOP 为 0x1F |
| IOP DMA 控制器 | [Dn_MADR](/chapters/12-iop#dn-madr) | `0x0` | 32 | R/W | 已验证 | 传输的 IOP 内存地址，n = 0–12 |
| IOP DMA 控制器 | [Dn_BCR](/chapters/12-iop#dn-bcr) | `0x4` | 32 | R/W | 已验证 | 块大小（字）与块数 |
| IOP DMA 控制器 | [Dn_CHCR](/chapters/12-iop#dn-chcr) | `0x8` | 32 | R/W | 已验证 | 通道控制（方向、同步模式、启动） |
| IOP DMA 控制器 | [Dn_TADR](/chapters/12-iop#dn-tadr) | `0xC` | 32 | R/W | 已验证 | 标签链地址（链模式） |
| IOP 根计数器 | [Tn_COUNT](/chapters/12-iop#tn-count) | `0x0` | 32 | R/W | 已验证 | 计数值，n = 0–5（T0–T2 为 16 位，T3–T5 为 32 位） |
| IOP 根计数器 | [Tn_MODE](/chapters/12-iop#tn-mode) | `0x4` | 32 | R/W | 已验证 | 计数器模式：门控、清零方式、中断方式、时钟源、标志 |
| IOP 根计数器 | [Tn_TARGET](/chapters/12-iop#tn-target) | `0x8` | 32 | R/W | 已验证 | 目标值 |
| VIF0 / VIF1 寄存器 | [VIFn_STAT](/chapters/07-vpu#vifn-stat) | `0x0` | 32 | RO（VIF1 的 FDR 位可写） | 已验证 | VIF 状态（命令状态、停顿原因、双缓冲、FIFO 计数） |
| VIF0 / VIF1 寄存器 | [VIFn_FBRST](/chapters/07-vpu#vifn-fbrst) | `0x10` | 32 | WO | 已验证 | VIF 复位、强制中止、停止与停顿解除 |
| VIF0 / VIF1 寄存器 | [VIFn_ERR](/chapters/07-vpu#vifn-err) | `0x20` | 32 | R/W | 已验证 | 中断与错误屏蔽 |
| VIF0 / VIF1 寄存器 | [VIFn_MARK](/chapters/07-vpu#vifn-mark) | `0x30` | 32 | R/W | 已验证 | MARK 值 |
| VIF0 / VIF1 寄存器 | [VIFn_CYCLE](/chapters/07-vpu#vifn-cycle) | `0x40` | 32 | RO | 已验证 | UNPACK 写入周期（CL / WL） |
| VIF0 / VIF1 寄存器 | [VIFn_MODE](/chapters/07-vpu#vifn-mode) | `0x50` | 32 | RO | 参考 | UNPACK 加法模式 |
| VIF0 / VIF1 寄存器 | [VIFn_NUM](/chapters/07-vpu#vifn-num) | `0x60` | 32 | RO | 参考 | MPG / UNPACK 尚未传送的数据量 |
| VIF0 / VIF1 寄存器 | [VIFn_MASK](/chapters/07-vpu#vifn-mask) | `0x70` | 32 | RO | 参考 | UNPACK 写入屏蔽矩阵 |
| VIF0 / VIF1 寄存器 | [VIFn_CODE](/chapters/07-vpu#vifn-code) | `0x80` | 32 | RO | 参考 | 最近处理的 VIFcode |
| VIF0 / VIF1 寄存器 | [VIFn_ITOPS](/chapters/07-vpu#vifn-itops) | `0x90` | 32 | RO | 已验证 | 下一个 ITOP 值（ITOP VIFcode 写入） |
| VIF0 / VIF1 寄存器 | [VIFn_BASE](/chapters/07-vpu#vifn-base) | `0xA0` | 32 | RO | 已验证 | 双缓冲基地址（仅 VIF1） |
| VIF0 / VIF1 寄存器 | [VIFn_OFST](/chapters/07-vpu#vifn-ofst) | `0xB0` | 32 | RO | 已验证 | 双缓冲偏移（仅 VIF1） |
| VIF0 / VIF1 寄存器 | [VIFn_TOPS](/chapters/07-vpu#vifn-tops) | `0xC0` | 32 | RO | 参考 | 当前写入缓冲区地址（仅 VIF1） |
| VIF0 / VIF1 寄存器 | [VIFn_ITOP](/chapters/07-vpu#vifn-itop) | `0xD0` | 32 | RO | 已验证 | 微程序可读的 ITOP 值 |
| VIF0 / VIF1 寄存器 | [VIFn_TOP](/chapters/07-vpu#vifn-top) | `0xE0` | 32 | RO | 参考 | 微程序可读的 TOP 值（仅 VIF1） |
| VIF0 / VIF1 寄存器 | [VIFn_R0](/chapters/07-vpu#vifn-r0) | `0x100` | 32 | RO | 参考 | ROW 填充寄存器 R0（x 字段） |
| VIF0 / VIF1 寄存器 | VIFn_R1 | `0x110` | 32 | RO | 参考 | ROW 填充寄存器 R1（y 字段），格式同 VIFn_R0 |
| VIF0 / VIF1 寄存器 | VIFn_R2 | `0x120` | 32 | RO | 参考 | ROW 填充寄存器 R2（z 字段），格式同 VIFn_R0 |
| VIF0 / VIF1 寄存器 | VIFn_R3 | `0x130` | 32 | RO | 参考 | ROW 填充寄存器 R3（w 字段），格式同 VIFn_R0 |
| VIF0 / VIF1 寄存器 | [VIFn_C0](/chapters/07-vpu#vifn-c0) | `0x140` | 32 | RO | 参考 | COL 填充寄存器 C0（第 0 行） |
| VIF0 / VIF1 寄存器 | VIFn_C1 | `0x150` | 32 | RO | 参考 | COL 填充寄存器 C1，格式同 VIFn_C0 |
| VIF0 / VIF1 寄存器 | VIFn_C2 | `0x160` | 32 | RO | 参考 | COL 填充寄存器 C2，格式同 VIFn_C0 |
| VIF0 / VIF1 寄存器 | VIFn_C3 | `0x170` | 32 | RO | 参考 | COL 填充寄存器 C3，格式同 VIFn_C0 |
| VIFcode | [VIFcode](/chapters/07-vpu#vifcode) | — | 32 | — | 已验证 | VIF 命令字的通用格式 |
| VIFcode | [VIFcode_UNPACK](/chapters/07-vpu#vifcode-unpack) | `0x60` | 32 | — | 已验证 | UNPACK 命令（CMD = 0x60–0x7F）的位域 |
| VU 整数寄存器与控制寄存器 | [VI00](/chapters/07-vpu#vi00) | `0x0` | 16 | RO | 已验证 | 整数寄存器 0，恒为 0 |
| VU 整数寄存器与控制寄存器 | [VI01-VI15](/chapters/07-vpu#vi01-vi15) | `0x1` | 16 | R/W | 已验证 | 整数寄存器 1–15 |
| VU 整数寄存器与控制寄存器 | [STATUS](/chapters/07-vpu#status) | `0x10` | 32 | R/W | 已验证 | 状态标志（当前标志与累积标志） |
| VU 整数寄存器与控制寄存器 | [MAC](/chapters/07-vpu#mac) | `0x11` | 32 | RO | 已验证 | MAC 标志（每个字段的零、符号、下溢、上溢） |
| VU 整数寄存器与控制寄存器 | [CLIP](/chapters/07-vpu#clip) | `0x12` | 32 | R/W | 已验证 | 裁剪标志（最近 4 次 CLIP 的判定结果） |
| VU 整数寄存器与控制寄存器 | [R](/chapters/07-vpu#r) | `0x14` | 32 | R/W | 已验证 | 随机数寄存器 |
| VU 整数寄存器与控制寄存器 | [I](/chapters/07-vpu#i) | `0x15` | 32 | R/W | 已验证 | 立即数寄存器（单精度浮点） |
| VU 整数寄存器与控制寄存器 | [Q](/chapters/07-vpu#q) | `0x16` | 32 | R/W | 已验证 | FDIV 结果寄存器（单精度浮点） |
| VU 整数寄存器与控制寄存器 | [P](/chapters/07-vpu#p) | `0x17` | 32 | R/W | 参考 | EFU 结果寄存器（仅 VU1） |
| VU 整数寄存器与控制寄存器 | [TPC](/chapters/07-vpu#tpc) | `0x1A` | 32 | RO | 已验证 | 微程序停止时的程序计数器 |
| VU 整数寄存器与控制寄存器 | [CMSAR0](/chapters/07-vpu#cmsar0) | `0x1B` | 32 | R/W | 已验证 | VCALLMSR 的微程序起始地址 |
| VU 整数寄存器与控制寄存器 | [FBRST](/chapters/07-vpu#fbrst) | `0x1C` | 32 | R/W | 已验证 | VU0/VU1 强制中止、复位与调试允许 |
| VU 整数寄存器与控制寄存器 | [VPU_STAT](/chapters/07-vpu#vpu-stat) | `0x1D` | 32 | RO | 未实现 | VU0/VU1 运行状态 |
| VU 整数寄存器与控制寄存器 | [CMSAR1](/chapters/07-vpu#cmsar1) | `0x1F` | 32 | WO | 已验证 | 启动 VU1 微程序 |
