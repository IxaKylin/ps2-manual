# 附录 D 未验证项与已知差异

本附录汇总全书中可信度不是“已验证”的内容、各资料之间的差异，以及 QEMU 模型的已知问题，便于读者判断某项内容能否直接采用。每一项都给出所在章节的链接，详细说明以正文为准。可信度等级的定义见[关于本手册](/guide/about#可信度等级)。

本附录的依据是第 1～15 章正文、`docs/data/registers/` 中的寄存器数据，以及 QEMU 建模记录 `ps2-model.md` 中的“Known gaps”与“Open bug”两节。

## D.1 QEMU 未实现的部件

下表列出 QEMU `-M ps2` 机型完全没有模拟、或只保存寄存器值而没有功能的部件。这些部件在本手册中标为 <Status s="unimplemented" />，内容来自公开资料。

| 部件或功能 | QEMU 现状 | 章节 |
|---|---|---|
| ROM1、ROM2 | 窗口存在但内容恒为 0，DVD 播放器与中文字库不可用 | [15.1.1](/chapters/15-boot#_15-1-1-rom-窗口) |
| IPU | `0x10002000`、`0x10007000` 两个窗口为未实现设备；DMAC 通道 3/4 没有外设，INTC 第 8 位不置位。使用 IPU 的游戏不能播放 FMV | [10.6](/chapters/10-ipu#_10-6-qemu-模型说明) |
| i.LINK | `0x1F808400` 起为未实现区域，不模拟控制器与中断 | [14.5.1](/chapters/14-peripherals#_14-5-1-qemu-模型说明) |
| IOP 暂存存储器、缓存控制 | `0x1F800000`（1 KB）与缓存控制寄存器窗口（`0xFFFE0000` 起）都是未实现区域；不模拟 IOP 指令 / 数据缓存 | [2.4](/chapters/02-memory-map#_2-4-iop-物理地址空间)、[12.10](/chapters/12-iop#_12-10-qemu-模型说明) |
| 光盘读取 | 没有光盘映像，TYPE 恒为 0；除 NOP 外的 N 命令都以错误 0x12 结束，IOP DMA 通道 3 没有数据 | [13.3](/chapters/13-cdvd#_13-3-n-命令)、[13.11.3](/chapters/13-cdvd#_13-11-3-已模拟与未模拟) |
| 光盘解密 | KEY 寄存器读出 0，DEC_SET 只保存 | [13.11.3](/chapters/13-cdvd#_13-11-3-已模拟与未模拟) |
| PStwo 与 MagicGate S 命令 | 0x27、0x36、0x37、0x38、0x3E 与 0x80–0x97 返回 0x80 | [13.11.3](/chapters/13-cdvd#_13-11-3-已模拟与未模拟) |
| 声音输出 | SPU2 不合成、不输出声音；声部、混合、效果寄存器只保存；KON 只清除 ENDX 对应位，KOFF 被忽略（`SPU2_KOFF0/1` 未实现）；ADMA 方向的 DMA 不传数据 | [14.2.3](/chapters/14-peripherals#_14-2-3-qemu-模型说明) |
| 手柄、存储卡、多分插适配器 | SIO2 只模拟插口上没有外设的情况，DATAOUT 读出 `0xFF` | [14.1.2](/chapters/14-peripherals#_14-1-2-qemu-模型说明) |
| DEV9 DMA、SMAP、UART、闪存 | IOP DMA 通道 8 没有外设，ATA 只能用 PIO；SMAP、UART、闪存未实现 | [14.3.2](/chapters/14-peripherals#_14-3-2-qemu-模型说明) |
| SIF2 与 PS1 兼容模式 | EE 通道 7、IOP 通道 2 没有外设；不模拟 33.8688 MHz 时钟与 PS1 外设；EE 写 CTRL 第 18、19 位只记录 LOG_UNIMP | [11.8](/chapters/11-sif#_11-8-qemu-模型说明)、[12.10](/chapters/12-iop#_12-10-qemu-模型说明) |
| DMAC 的 MFIFO、停顿控制、交错模式 | D_CTRL.MFD/STD、D_RBSR、D_RBOR、D_SQWC 只保存；MOD = 2 按普通模式处理 | [6.9](/chapters/06-dmac#_6-9-qemu-模型说明) |
| DMAC 优先级与总允许 | D_PCR.CDE/PCE、DMAtag 的 PCE、D_CTRL.DMAE/RELE/RCYC 无效；D_STAT.SIM/MEIM、D_ENABLER/D_ENABLEW 只保存 | [6.9](/chapters/06-dmac#_6-9-qemu-模型说明) |
| SPR 通道 8/9 | 没有外设：toSPR 读主存后丢弃数据，fromSPR 永不完成 | [6.9](/chapters/06-dmac#_6-9-qemu-模型说明) |
| GIF PATH 仲裁与 PATH3 屏蔽 | 没有仲裁；GIF_MODE.M3R/IMT、GIF_CTRL.PSE 只保存，MSKPATH3 按空操作处理；GIF_STAT 读出 0，GIF_TAG0–3、GIF_CNT 等不解码 | [8.9](/chapters/08-gif#_8-9-qemu-模型说明) |
| VU 与 CPU 并行、VIF/VU 中断 | 微程序在启动操作中同步执行到结束；VIFcode 的 i 位、VIF 停顿、VU 中断与 VU0 看门狗不模拟；VPU_STAT 读出 0 | [7.10](/chapters/07-vpu#_7-10-qemu-模型说明) |
| GS 纹理过滤、抗锯齿、抖动 | 只有最近点采样；不支持双线性过滤、mipmap、CSM2、AA1、DTHE；没有纹理缓存与 CLUT 缓冲 | [9.12](/chapters/09-gs#_9-12-qemu-模型说明) |
| GS PCRTC 合成与视频时序 | PMODE 的 MMOD/AMOD/SLBG/ALP 与 BGCOLOR 只保存，两个电路之间不做 α 混合；SMODE1 中 CMOD 以外的位域与 SYNCH1/2、SYNCV 只保存；HSINT、EDWINT 从不产生 | [9.12](/chapters/09-gs#_9-12-qemu-模型说明) |
| EE INTC 部分中断源 | 位 4～8（VIF0、VIF1、VU0、VU1、IPU）与位 13～15 未接入 | [4.7](/chapters/04-ee-intc#_4-7-qemu-模型说明) |
| EE 定时器门控与 HOLD | GATE/GATS/GATM 只保存；HOLD 是普通存储单元；HBLNK 固定为 NTSC 行频 | [5.5](/chapters/05-ee-timer#_5-5-qemu-模型说明) |
| R5900 流水线、缓存、性能计数器、调试断点 | 不模拟双发射、周期与缓存；CP0 第 24、25 号寄存器的 R5900 功能未实现；BC2F/BC2T 未实现 | [3.12](/chapters/03-ee-core#_3-12-qemu-模型说明) |
| IOP 调试寄存器 | BPC、BDA、DCIC、BDAM、BPCM 只保存，不产生断点 | [12.10](/chapters/12-iop#_12-10-qemu-模型说明) |
| IOP DMA 全局控制与中断细分 | DMACEN、DMACINTEN 只保存；DICR 第 6:0 位、DICR2 第 12:0 位只保存 | [12.10](/chapters/12-iop#_12-10-qemu-模型说明) |
| IOP 根计数器门控 | T0、T1、T3 的消隐门控不模拟；HBLANK 固定为 NTSC | [12.5](/chapters/12-iop#_12-5-根计数器) |
| SSBUS 时序与 ICFG 缓存位 | 地址窗口与时序寄存器只保存；ICFG 第 0 位无作用，第 31 位只保存 | [12.6](/chapters/12-iop#_12-6-ssbus-与-icfg) |
| IOP 一侧的 SBUS 中断 | IOP INTC 第 1 位未接线 | [12.10](/chapters/12-iop#_12-10-qemu-模型说明) |
| EE SIO 中断与帧格式 | SIO_IER 只保存，不产生中断；SIO_LCR、SIO_BGR 只保存 | [14.6.2](/chapters/14-peripherals#_14-6-2-qemu-模型说明) |
| DVE 编码功能 | 编码器寄存器只保存，不影响 QEMU 的视频输出 | [14.8.2](/chapters/14-peripherals#_14-8-2-qemu-模型说明) |
| 时序 | DMA、GIF、GS 绘图、CDVD 命令、SIO2 传输都立即完成；N_READY.BUSY、S_STATUS.BUSY 恒为 0 | 各章“QEMU 模型说明” |

## D.2 已实现但没有测试覆盖的功能

下表各项在 QEMU 中已经实现，但没有 qtest 用例，也没有 BIOS / Linux 启动记录证明其被执行过。本手册把它们标为 <Status s="reference" />，并注明“QEMU 已实现，但没有测试覆盖”。

| 块 | 项目 | 章节 |
|---|---|---|
| R5900 | 管理模式下的 EI/DI、Status.BEV（BEV = 1 时的异常向量）与 Status.ERL、调试与 NMI 入口的地址回绕；Count/Compare 定时器与 IP7/IM7、Context、BadVAddr、Config、ErrorEPC、TLBP 失败时的 Index.P | [3.12](/chapters/03-ee-core#_3-12-qemu-模型说明) |
| EE INTC | I_STAT 第 0 位（GS 中断源） | [4.7](/chapters/04-ee-intc#_4-7-qemu-模型说明) |
| EE 定时器 | COUNT 读写；时钟源 /16、/256 与 HBLNK；ZRET、OVFE 溢出中断；EQUF、OVFF 的读出与写 1 清零 | [5.5](/chapters/05-ee-timer#_5-5-qemu-模型说明) |
| DMAC | GIF 通道 2 的数据通路；call 标签与 ASR0/ASR1、CHCR.ASP；next、ref、refs 标签；DMAtag 的 IRQ 位；cnts 标签与 D_CTRL.STS、D_STADR；D_STAT.BEIS；65536 个 DMAtag 的上限 | [6.9](/chapters/06-dmac#_6-9-qemu-模型说明) |
| VIF | VIFcode STMOD、FLUSHE、FLUSH、FLUSHA、MSCALF、MSCNT、STMASK、STCOL | [7.6](/chapters/07-vpu#_7-6-vifcode) |
| VIF | V4-32 且 CL = WL = 1 以外的 UNPACK：其他格式、USN、MASK（m 位）、MODE 与补写 | [7.5.2](/chapters/07-vpu#_7-5-2-格式)、[VIFcode_UNPACK](/chapters/07-vpu#vifcode-unpack) |
| VIF | VIFn_MODE、VIFn_NUM、VIFn_MASK、VIFn_CODE、VIFn_TOPS、VIFn_TOP、VIFn_R0–R3、VIFn_C0–C3 | [7.8](/chapters/07-vpu#_7-8-寄存器说明) |
| VIF | VIF1 双缓冲：BASE、OFST、TOPS、TOP 与 STAT.DBF | [7.4.4](/chapters/07-vpu#_7-4-4-vif1-双缓冲) |
| VU | XITOP 读 ITOPS（记录 R24：对应的变异测试未被检出） | [7.10](/chapters/07-vpu#_7-10-qemu-模型说明) |
| VU | P 寄存器与 EFU 指令 | [7.10](/chapters/07-vpu#_7-10-qemu-模型说明) |
| GIF | GIF_CTRL.RST | [GIF_CTRL](/chapters/08-gif#gif-ctrl) |
| GIF | 经 DMAC 通道 2 的 PATH3（qtest `ps2/gif` 直接写 GIF FIFO） | [8.1.1](/chapters/08-gif#_8-1-1-三条-path) |
| GS | CSR.VSINT（qtest 只检查 INTC 的场消隐位）、IMR、SIGLBLID（qtest 不读 SIGLBLID） | [9.8](/chapters/09-gs#_9-8-事件与中断)、[IMR](/chapters/09-gs#imr)、[SIGLBLID](/chapters/09-gs#siglblid) |
| GS | FOG、FOGCOL、TEXA、COLCLAMP、PRMODECONT、LABEL、HWREG；SMODE1.CMOD | [9.12](/chapters/09-gs#_9-12-qemu-模型说明)、[SMODE1](/chapters/09-gs#smode1) |
| SIF | CHANGE_SADDR 命令与 EE → IOP 方向的 WRITE_SREG（ps2-lite-bios 实现） | [11.4.2](/chapters/11-sif#_11-4-2-rpc) |
| IOP | 用户态 CU0 = 1 访问 COP0、IsC = 1 时对 ROM 的处理 | [12.2.3](/chapters/12-iop#_12-2-3-缓存隔离) |
| CDVD | S 命令 0x0F、0x13、0x14、0x16、0x18、0x1A、0x1B、0x1C、0x1E、0x20、0x22、0x24、0x29、0x31、0x32、0x44、0x45、0xEF、0xFD | [13.4](/chapters/13-cdvd#_13-4-s-命令) |
| DEV9 | 桥接窗口 `0x1F801460`（只有地址映射有 qtest）：桥接寄存器 DEV9_1462、DEV9_REV；SPD_REV_3、SPD_REV_8 | [14.3.2](/chapters/14-peripherals#_14-3-2-qemu-模型说明) |
| DEV9 | ATA 任务文件寄存器 ATA_DATA、ATA_ERROR、ATA_NSECTOR、ATA_SECTOR、ATA_LCYL、ATA_HCYL、ATA_CONTROL | [14.3.4](/chapters/14-peripherals#_14-3-4-寄存器说明) |
| EE SIO | 接收通路：SIO_ISR 的接收计数、SIO_RXFIFO、SIO_FCR 的 FIFO 复位（发送通路由启动输出验证） | [14.6.2](/chapters/14-peripherals#_14-6-2-qemu-模型说明) |
| MCH | 64 位访问拆成两次 32 位访问；应答与 `-m` 选项无关 | [14.7.2](/chapters/14-peripherals#_14-7-2-qemu-模型说明) |
| 启动 | `-initrd` 的警告；`litebios=` 与 BIOS 映像同用或不给 `-kernel` 时的警告 | [15.7.3](/chapters/15-boot#_15-7-3-机器属性) |

## D.3 资料之间的差异

下表列出 QEMU、PCSX2、ps2sdk、ps2tek 与本项目记录之间说法不一致的地方，以及本手册的取舍。

| 项目 | 资料 A | 资料 B | 本手册 |
|---|---|---|---|
| [SMODE2.FFMD](/chapters/09-gs#smode2) 的命名 | QEMU `hw/display/ps2_gs.c` 的注释把 INT = 1 且 FFMD = 1 称为 field mode | ps2sdk ee/libgs/include/libgs.h:40–43：0 = FIELD，1 = FRAME | 依 ps2sdk；QEMU 的行为与此一致，只是注释用词相反 |
| [CDVD 的 DONE 位](/chapters/13-cdvd#_13-7-中断) | PCSX2 与 QEMU：CDVD_I_STAT 第 0 位 | ps2tek §CDVD N Commands：N 命令完成为第 1 位 | 第 0 位；ps2sdk cdvdman 的中断处理程序也检查第 0 位 |
| [DEC_SET](/chapters/13-cdvd#dec-set) 第 1:0 位 | PCSX2：第 0 位为异或，第 1 位为移位 | ps2sdk sceCdDecSet：第 1 位为异或，第 0 位为移位 | 不作判断，两种分配都列出 |
| [N 命令 0x01](/chapters/13-cdvd#_13-3-n-命令) 的名称 | PCSX2 pcsx2/CDVD/CDVD_internal.h:186：Reset | ps2tek §CDVD N Commands：NOPsync | 两个名称并列；QEMU 不实现该命令 |
| [Sony BIOS 引导握手](/chapters/11-sif#_11-7-1-引导握手)中 SMFLAG 的置位顺序 | 建模记录 `ps2-model.md:19` 与 `process/acceptance.tsv:11`：SIFINIT → CMDINIT → BOOTEND | QEMU 运行 BIOS 的跟踪（`ps2-model.md:854`、`process/audit.md:785`）：SIFINIT → BOOTEND → CMDINIT | 依跟踪记录 |
| [EE INTC 第 15 位 PGPU](/chapters/04-ee-intc#_4-1-2-中断源) | QEMU `include/hw/intc/ps2_intc.h` 定义了第 15 位 PGPU | PCSX2 pcsx2/Dmac.h:204 的 `INTCIrqs` 与 ps2tek §EE Interrupt Controller (INTC) 都只到第 14 位 | 列出，标为参考级；QEMU 不接入该中断源 |
| [DMAC 通道 1 的 VIF1 → 主存方向](/chapters/06-dmac#_6-1-1-通道一览) | 本项目第 2 阶段审查意见：QEMU 只实现主存 → VIF1 | QEMU `hw/display/ps2_vu1.c:115` 的 `vif1_dma_start` 经 `ps2_gs_read_local` 读出 GS 本地 → 主机传输的数据 | 依 QEMU 源码：双向，VIF1 → 主存方向只用于 GS 读出 |
| [VIFcode OFFSET](/chapters/07-vpu#_7-4-4-vif1-双缓冲) 的作用方向 | ps2tek §VIF Commands：把 BASE 设为 TOPS | PCSX2 与 QEMU：把 TOPS 设为 BASE | 依 PCSX2 与 QEMU |
| [MSCALF](/chapters/07-vpu#_7-6-vifcode) 是否限于 VIF1 | ps2tek：VIF1 专有 | QEMU：VIF0 上也执行 | 依 ps2tek，QEMU 的差异在 7.10 节说明 |
| [GIF_CNT.VUADDR](/chapters/08-gif#gif-cnt) 的宽度 | ps2tek §GIF I/O：第 29:20 位 | PCSX2 pcsx2/Gif.h:194：第 21:20 位 | 按 ps2tek 列出，来源不确定 |
| EE 写 [SUBADDR](/chapters/11-sif#subaddr)（SMCOM） | ps2tek 与 QEMU：忽略 | PCSX2 pcsx2/HwWrite.cpp:267：保存写入值 | 依 ps2tek 与 QEMU |
| [FCR0](/chapters/03-ee-core#fcr0) 的读出值 | PCSX2：`0x00002E30` | QEMU：CFC1 读出 `0x00002E00`，经 gdbstub 读出 `0x00002E30` | 两种值都列出（记录 R7-05） |
| [MCH_RICM](/chapters/14-peripherals#mch-ricm)、[MCH_DRD](/chapters/14-peripherals#mch-drd) 的地址 | ps2tek 杂项寄存器表：`0x1000F430` 为 MCH_DRD，`0x1000F440` 为 MCH_RICM | ps2tek 正文给出的模拟逻辑、PCSX2 与 QEMU：`0x1000F430` 为 MCH_RICM，`0x1000F440` 为 MCH_DRD | 依 PCSX2 与 QEMU |
| [DVE_ADDR](/chapters/14-peripherals#dve-addr) 的读写器件地址 | PCSX2：`0x43` 写、`0x42` 读 | QEMU：按 Sony BIOS 的访问顺序，`0x42` 写、`0x43` 读 | 依 QEMU |
| [SIO2_DATAIN](/chapters/14-peripherals#sio2-datain)、[SIO2_DATAOUT](/chapters/14-peripherals#sio2-dataout) 的命名 | ps2sdk sio2regs.h 从 SIO2 一侧命名：`0x1F808260` 为 DATA_OUT，`0x1F808264` 为 DATA_IN | PCSX2 与 ps2tek：方向相反 | 依 PCSX2 与 ps2tek |
| [SIO2_SEND3](/chapters/14-peripherals#sio2-send3) 的长度位域 | ps2tek：第 8–16 位不被使用，第 18–24 位为实际命令长度 | ps2sdk：TX_SZ / RX_SZ；PCSX2 与 QEMU 使用第 17:8 位 | 依 PCSX2 与 QEMU |
| [SPD_INTR_MASK](/chapters/14-peripherals#spd-intr-mask) 的 8 位写入 | PCSX2 注释：8 位写入影响整个寄存器 | QEMU：只改变高 8 位或低 8 位 | 按 QEMU 描述；真实硬件行为未见资料 |
| SPD_REV_8 的读出值 | PCSX2：`0x0002`（插有硬盘模块） | QEMU：0 | 按 QEMU 描述，标为参考级（[14.3.2](/chapters/14-peripherals#_14-3-2-qemu-模型说明)） |
| [EE INTC](/chapters/04-ee-intc#_4-7-qemu-模型说明) 与 [IOP INTC](/chapters/12-iop#_12-10-qemu-模型说明) 的置位方式 | PCSX2：中断源每次触发都置位；USB 电平保持期间反复置位 | QEMU：按上升沿锁存，信号保持为高时不重复置位 | 按 QEMU 描述 |
| [PRMODECONT](/chapters/09-gs#prmodecont) 的复位值 | PCSX2 pcsx2/GS/GSState.cpp:115：1 | QEMU：0 | 两者都列出 |
| [MADD.S 溢出](/chapters/03-ee-core#_3-12-qemu-模型说明) | PCSX2 动态重编译器的结果 | QEMU：结果为 0 且不置 O（记录 R7-09） | 按 QEMU 描述 |
| [SIF0 启动时的内部状态](/chapters/11-sif#_11-8-qemu-模型说明) | PCSX2 的处理 | QEMU：START 清除时的状态与 PCSX2 不完全一致（记录 R19/R20） | 按 QEMU 描述，未进一步核对 |

## D.4 本手册无法确认的事实

以下内容在正文中标明来源不确定、含义不明或只有单一来源，本项目无法核实。

| 项目 | 现状 | 章节 |
|---|---|---|
| R5900 流水线各级含义 | 只列出 I、Q、R、A、D、W 各级与大致对应，没有可核对的公开资料 | [3.1.1](/chapters/03-ee-core#_3-1-1-流水线) |
| SIF CTRL 各位的硬件含义 | 读出恒为 1 的第 1 位、恒为 0xF 的第 31:28 位以及 IOP 控制位的用途都不明，只描述读写规则 | [CTRL](/chapters/11-sif#ctrl) |
| SIF BD6 的用途 | 只知引导时会被访问；复位值 `0x1D000060` 取自 PCSX2 | [BD6](/chapters/11-sif#bd6) |
| MSFLAG.CMDINIT | ps2sdk 的 IOP sifcmd 向 MSFLAG 写此位，按硬件规则效果是清除该位，用意不明 | [11.2](/chapters/11-sif#_11-2-共用寄存器) |
| IOP COP0 的 JUMPDEST、DCIC、SR | JUMPDEST 在 PCSX2、ps2sdk、ps2tek 中均无描述；DCIC 位只见于 ps2sdk；SR 的奇偶校验与缓存状态位定义不确定 | [JUMPDEST](/chapters/12-iop#jumpdest)、[DCIC](/chapters/12-iop#dcic)、[SR](/chapters/12-iop#sr) |
| IOP INTC 第 12 位（DVD）、第 18～21 位（HTR0–HTR3） | 用途不明，ps2sdk、ps2tek 均未说明 | [12.3](/chapters/12-iop#_12-3-中断控制器) |
| IOP DMA 的 i.LINK 相关位、DPCR2 第 31:28 位 | 用途不明 | [Dn_CHCR](/chapters/12-iop#dn-chcr)、[DPCR2](/chapters/12-iop#dpcr2) |
| ICFG 的缓存控制位 | 具体含义来源不确定，只知 ps2sdk 的 FlushIcache 在清除指令缓存前清零、结束后恢复 | [ICFG](/chapters/12-iop#icfg) |
| N 命令 0x0B | 用途不明（PCSX2 称 NCMD_B） | [13.3](/chapters/13-cdvd#_13-3-n-命令) |
| CDVD_I_STAT 第 4 位、N_READY 的初始化位 | BS 电源检测含义不明；N_READY 的“MechaCon 已完成初始化”只是 PCSX2 的命名 | [CDVD_I_STAT](/chapters/13-cdvd#cdvd-i-stat)、[N_READY](/chapters/13-cdvd#n-ready) |
| UNPACK 中 V2 的 z、w 与 V3 的 w | 硬件上的值不确定，程序不应依赖 | [7.5.2](/chapters/07-vpu#_7-5-2-格式) |
| VU 的 EFU 指令延迟 | 硬件上各指令不同（11～54 个周期，ps2tek §VU Pipelining），QEMU 统一按 12 个指令对处理 | [7.10](/chapters/07-vpu#_7-10-qemu-模型说明) |
| GS 块内列结构、PCRTC 合成语义 | 依据 PCSX2 归纳，未经本项目验证 | [9.3.1](/chapters/09-gs#_9-3-1-存储器组织)、[9.7](/chapters/09-gs#_9-7-pcrtc-与视频输出) |
| SMODE2.DPMS 的取值 | PCSX2 只给出位域名称，取值含义未经核实 | [SMODE2](/chapters/09-gs#smode2) |
| IPU 的全部细节 | 依据 PCSX2 源码，未经 QEMU 验证 | [10.1](/chapters/10-ipu#_10-1-概述) |
| EE SIO 的位定义 | ps2sdk 注明参考东芝 TX49/TX79 配套芯片，并非全部经过确认 | [14.6](/chapters/14-peripherals#_14-6-ee-调试串口-sio) |
| SIO2_RECV1 的应答判断、SIO2_RECV3 的取值 | RECV1 的判断方法依据 ps2tek；PCSX2 向 RECV3 写入的 0x83、0x8B、0x8C 等值用途不明 | [SIO2_RECV1](/chapters/14-peripherals#sio2-recv1)、[SIO2_RECV3](/chapters/14-peripherals#sio2-recv3) |
| SPU2 的 ATTR 低位、ADMAS 读、STATX 部分位 | 含义不明（PCSX2 中部分位已注释掉或只输出警告） | [SPU2_ATTR](/chapters/14-peripherals#spu2-attr)、[SPU2_ADMAS](/chapters/14-peripherals#spu2-admas)、[SPU2_STATX](/chapters/14-peripherals#spu2-statx) |
| MCH 命令 | 公开资料所知甚少，命令表依据 PCSX2 与 ps2tek 记载的模拟逻辑 | [14.7](/chapters/14-peripherals#_14-7-mch-rdram-初始化接口) |
| DVE 未知寄存器与 DVE_POWER | DVE_UNK04、DVE_UNK08 含义不明；PCSX2 自己注明 DVE_POWER 的含义不确定 | [DVE_POWER](/chapters/14-peripherals#dve-power) |
| i.LINK 寄存器 | 未见可靠的公开资料，本书不列出 | [14.5.1](/chapters/14-peripherals#_14-5-1-qemu-模型说明) |

## D.5 与 QEMU 行为相关的已知问题

下表只列出 QEMU 建模记录 `ps2-model.md` 中“Known gaps”与“Open bug”两节明确记载的问题，括号内为记录中的编号。

| 问题 | 记录中的说明 | 章节 |
|---|---|---|
| 迁移流无法载入（G-R3-1，未解决） | 复位后 GIF 的 NREG 计数为 0，`ps2_gs_post_load` 拒绝 `gif_reg >= gif_nreg` 的状态，空闲 GIF 的迁移流载入失败（-EINVAL） | [8.9](/chapters/08-gif#_8-9-qemu-模型说明)、[9.12](/chapters/09-gs#_9-12-qemu-模型说明) |
| 迁移测试缺失 | VIF 的 post_load、SPU2 声音存储器的脏标记、IOP 一侧都没有自动迁移测试 | [7.10](/chapters/07-vpu#_7-10-qemu-模型说明)、[12.10](/chapters/12-iop#_12-10-qemu-模型说明) |
| SIF0 启动时的状态 | START 清除时的状态与 PCSX2 不同（R19/R20） | [11.8](/chapters/11-sif#_11-8-qemu-模型说明) |
| SIF 窄访问与地址别名 | 不支持 16 位、非对齐访问与 PCSX2 的 `mem & 0x8F0` 别名（R12-03） | [11.8](/chapters/11-sif#_11-8-qemu-模型说明) |
| SIO2、SPU2 的 DMA 循环 | 长度由客户程序控制，可能长时间占住 vCPU（R25-05） | [14.1.2](/chapters/14-peripherals#_14-1-2-qemu-模型说明)、[14.2.3](/chapters/14-peripherals#_14-2-3-qemu-模型说明) |
| MTTCG | 所有 MIPS 目标都开启 `mttcg_supported`，不只是 ps2；上游曾因 Malta I6400 的偶发失败关闭过 mips64 MTTCG，该问题未复测（R25-09、R21-01） | [3.12](/chapters/03-ee-core#_3-12-qemu-模型说明) |
| gdbstub 写 PC | 任何 CPU 上都按第 0 位设置 M16（上游问题，只影响调试器，R25-11） | [3.12](/chapters/03-ee-core#_3-12-qemu-模型说明) |
| BadVAddr | 在翻译时设置，命中缓存的翻译块可能留下旧值（上游问题，R25-13） | [3.12](/chapters/03-ee-core#_3-12-qemu-模型说明) |
| DMA 地址别名 | 不支持 `0x7xxxxxxx` 形式的 SPR 别名与主存镜像（R17-04）；SPR 通道 8/9 的 MADR/SADR 语义未实现（R17-05） | [6.9](/chapters/06-dmac#_6-9-qemu-模型说明) |
| 大端主机 | VU/VIF 存储器按主机字节序保存，大端主机不受支持（R6-04）；IOP 一侧也没有在大端主机上运行过 | [7.10](/chapters/07-vpu#_7-10-qemu-模型说明) |
| R5900 指令细节 | LDC1/SDC1 按通用 MIPS 执行（R7-04）；FCR0 读出值不一致（R7-05）；不在 `0x7FFFFFFC` 处回绕（R8-04）；未对齐的 S 项 VPN2（R3-06） | [3.12](/chapters/03-ee-core#_3-12-qemu-模型说明) |
| USB 中断 | IOP INTC 按边沿锁存，与 PCSX2 在电平保持期间反复置位不同 | [12.10](/chapters/12-iop#_12-10-qemu-模型说明) |
| CDVD | NVM 写入不写回主机文件；不模拟寄存器镜像 | [13.11.3](/chapters/13-cdvd#_13-11-3-已模拟与未模拟) |
| Sony BIOS 引导 | LIBSD/OSDSND 在 100 s 内没有加载（R17）；对 `0xFFFE0130` 的写入产生 LOG_UNIMP 输出；OSDSYS 检查的固定 45 s 窗口在慢速运行时偶发失败（R18–R20） | [11.7.1](/chapters/11-sif#_11-7-1-引导握手)、[15.8](/chapters/15-boot#_15-8-qemu-模型说明) |
| ps2-lite-bios | IOP 空闲线程忙等，在 `thread=single` 下占用 EE 时间；链接后不清除指令缓存（R20-10）；超过约 58 s 的闹钟被截断（R20-08）；没有 MODLOAD 修补目标，Linux 输出的“sif: Failed to patch IOP with -2”无害；SIF 命令处理函数拿不到模块的 $gp（R20-06）；两个标签缓冲区都满时没有闹钟重试（R19） | [11.7.1](/chapters/11-sif#_11-7-1-引导握手)、[15.7.2](/chapters/15-boot#_15-7-2-ps2-lite-bios-与-linux-路径) |
