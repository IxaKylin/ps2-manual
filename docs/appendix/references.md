# 附录 C 参考资料

本附录列出本手册正文与寄存器说明中实际引用过的全部资料，按来源分组，并说明每项资料在本手册中的用途。各寄存器的具体出处（文件与行号、ps2tek 章节名）见寄存器说明中的“来源”栏以及各章末尾的“来源”或“参考资料”一节。资料的性质与使用原则见[关于本手册](/guide/about#资料来源)。

本手册未使用 Sony 在保密协议（NDA）下提供的任何文档。

引用格式约定：

- QEMU：写仓库内的相对路径，必要时在括号中注明函数名，例如 `hw/dma/ps2_dmac.c`；qtest 用例写测试路径，例如 qtest `ps2/sif-dma`。
- PCSX2：写作“PCSX2 pcsx2/<路径>:<行号>”。
- ps2sdk：写作“ps2sdk <路径>:<行号>”。
- ps2tek：写作“ps2tek §<章节名>”，内容均为转述。

## C.1 QEMU `-M ps2` 机型

QEMU 中的 `-M ps2` 机型是本项目实现的 PS2 系统模拟，也是“已验证”等级的唯一依据：寄存器行为以 QEMU 源码为准，并由 qtest 用例或真实 BIOS / Linux 启动记录证实。代码基于上游 QEMU（<https://gitlab.com/qemu-project/qemu>）加本项目的 PS2 补丁，PS2 部分尚未合入上游。

### C.1.1 设备模型

| 文件 | 内容 | 章节 |
|---|---|---|
| `hw/mips/ps2.c` | 机型主板：存储器布局、ROM 与 `-kernel` 引导、CDVD 与 ROMVER 处理、GS 显示 | [第 2 章](/chapters/02-memory-map)、[第 9 章](/chapters/09-gs)、[第 11 章](/chapters/11-sif)、[第 13 章](/chapters/13-cdvd)、[第 14 章](/chapters/14-peripherals)、[第 15 章](/chapters/15-boot) |
| `hw/mips/ps2_ee.c` | EE 片上系统：各模块的地址映射与中断连线，未实现设备（如 IPU）的占位窗口 | [第 2 章](/chapters/02-memory-map)、[第 7 章](/chapters/07-vpu)、[第 8 章](/chapters/08-gif)、[第 10 章](/chapters/10-ipu)、[第 14 章](/chapters/14-peripherals)、[第 15 章](/chapters/15-boot) |
| `hw/mips/ps2_iop.c` | IOP 子系统：IOP 内存与 IOP 外设的地址映射、中断连线 | [第 12 章](/chapters/12-iop)、[第 14 章](/chapters/14-peripherals)、[第 15 章](/chapters/15-boot) |
| `hw/intc/ps2_intc.c`、`include/hw/intc/ps2_intc.h` | EE 中断控制器 | [第 4 章](/chapters/04-ee-intc) |
| `hw/timer/ps2_timer.c`、`include/hw/timer/ps2_timer.h` | EE 定时器 | [第 5 章](/chapters/05-ee-timer) |
| `hw/dma/ps2_dmac.c`、`include/hw/dma/ps2_dmac.h` | EE DMAC 与 DMAtag 处理 | [第 6 章](/chapters/06-dmac) |
| `hw/display/ps2_vif.c`、`ps2_vu.c`、`ps2_vu0.c`、`ps2_vu1.c` 及对应头文件 | VIF0/VIF1、VU0/VU1 | [第 7 章](/chapters/07-vpu) |
| `hw/display/ps2_gs.c`、`include/hw/display/ps2_gs.h` | GIF 与 GS（特权寄存器、一般寄存器、绘图与 PCRTC 输出） | [第 8 章](/chapters/08-gif)、[第 9 章](/chapters/09-gs) |
| `hw/misc/ps2_sif.c`、`include/hw/misc/ps2_sif.h` | SIF 寄存器与 SIF0/SIF1 FIFO | [第 11 章](/chapters/11-sif) |
| `hw/intc/ps2_iop_intc.c`、`hw/dma/ps2_iop_dma.c`、`hw/timer/ps2_iop_rcnt.c`、`hw/misc/ps2_iop_ssbus.c` 及对应头文件 | IOP 中断控制器、IOP DMA、IOP 定时器、SSBUS 寄存器 | [第 12 章](/chapters/12-iop) |
| `hw/misc/ps2_cdvd.c`、`include/hw/misc/ps2_cdvd.h` | CDVD 寄存器、N 命令与 S 命令、NVM、RTC | [第 13 章](/chapters/13-cdvd) |
| `hw/misc/ps2_sio2.c`、`hw/audio/ps2_spu2.c`、`hw/misc/ps2_dev9.c`、`hw/char/ps2_sio.c`、`hw/misc/ps2_mch.c`、`hw/display/ps2_dve.c` 及对应头文件 | SIO2、SPU2、DEV9（SPEED）、EE SIO、MCH、DVE | [第 14 章](/chapters/14-peripherals) |
| `hw/ide/mmio.c` | 通用 IDE 模型，用作 DEV9 的 ATA 任务文件寄存器 | [第 14 章](/chapters/14-peripherals) |

### C.1.2 CPU 模型

| 文件 | 内容 | 章节 |
|---|---|---|
| `target/mips/cpu-defs.c.inc` | R5900 与 R3000A 的 CPU 定义：PRId、Config、Status 可写位 | [第 3 章](/chapters/03-ee-core)、[第 12 章](/chapters/12-iop)、[第 15 章](/chapters/15-boot) |
| `target/mips/cpu.c`、`cpu.h`、`internal.h` | CPU 状态、FCR31 位定义、中断允许判断 | [第 3 章](/chapters/03-ee-core) |
| `target/mips/system/cp0.c`、`cp0_timer.c` | COP0 寄存器与 Count/Compare 定时器 | [第 3 章](/chapters/03-ee-core) |
| `target/mips/tcg/translate.c`、`tx79.decode`、`tx79_translate.c` | R5900 指令译码，包括 MMI、LQ/SQ 与 COP1 控制寄存器访问 | [第 3 章](/chapters/03-ee-core) |
| `target/mips/tcg/system/cp0_helper.c`、`special_helper.c`、`tlb_helper.c`、`r5900_fpu_helper.c` | COP0 写入、EI/DI、TLB 与异常入口（包括 R3000A 的异常入口）、R5900 浮点运算 | [第 3 章](/chapters/03-ee-core)、[第 12 章](/chapters/12-iop) |

### C.1.3 精简 BIOS 与测试

| 文件 | 内容 | 章节 |
|---|---|---|
| `pc-bios/ps2-lite-bios/` | 用 `-kernel` 引导 Linux 时放入 ROM0 的精简 BIOS（本项目自写）。它在真实的 R3000A 上运行 IOP 内核，提供 SIF 命令与 RPC 服务；`sif.c` 为其中的 SIF 部分；`reset.S`、`romdir.S`、`lite-bios.lds`、`ee.S`、`iop_entry.S`、`iop_kernel.c`、`services.c`、`irx.c` 为复位分流、ROMDIR、IOP 内核与 IRX 链接器 | [第 11 章](/chapters/11-sif)、[第 15 章](/chapters/15-boot) |
| `tests/qtest/ps2-test.c` | PS2 机型的 qtest 用例，例如 `ps2/memory-map`、`ps2/scratchpad`、`ps2/sbus`、`ps2/cop0`、`ps2/fpu`、`ps2/mmi`、`ps2/irq`、`ps2/dmac/spr`、`ps2/vif0`、`ps2/cop2`、`ps2/gif`、`ps2/gs/field`、`ps2/sif-ee`、`ps2/sif-iop`、`ps2/sif-dma`、`ps2/lite-bios/sif`、`ps2/iop-intc`、`ps2/iop-dma`、`ps2/iop-rcnt`、`ps2/iop-ssbus`、`ps2/prid-split`、`ps2/cdvd/ncmd`、`ps2/cdvd/scmd`、`ps2/sio2`、`ps2/spu2`、`ps2/spu2/dma`、`ps2/dev9/intr`、`ps2/mch`、`ps2/dve`、`ps2/rom`、`ps2/boot/bios`、`ps2/boot/bios-large`、`ps2/boot/none`、`ps2/boot/bad`、`ps2/boot/no-romver`、`ps2/boot/elf`、`ps2/boot/lite-bios-wait`、`ps2/boot/lite-bios-bad`、`ps2/cdvd/files`、`ps2/cdvd/elf`、`ps2/lite-bios/irx`、`ps2/r5900-addr`、`ps2/mmi/ops`、`ps2/sio2/dma` | 第 2～15 章各“QEMU 模型说明”一节 |
| `tests/qtest/r3000a-test.c` | R3000A CPU 的 qtest 用例 `r3000a/cpu`（在 Malta 板上以 `-cpu R3000A` 运行），覆盖 COP0 与异常入口 | [第 12 章](/chapters/12-iop) |

### C.1.4 建模记录

QEMU 建模记录 `ps2-model.md`（项目内部记录，未随本手册发布）汇总各模块的实现范围、已知问题，以及真实 BIOS（SCPH-39001）引导到 OSDSYS 主菜单、精简 BIOS 引导 Linux 内核的运行记录。正文中凡写明“经真实 BIOS / Linux 启动验证”的内容，均以该记录为依据；其中的已知问题汇总在[附录 D](/appendix/known-gaps)。

## C.2 PCSX2

- 地址：<https://github.com/PCSX2/pcsx2>
- 性质：开源 PS2 模拟器，GPLv3 授权。
- 用途：本手册最主要的外部资料，用于核对寄存器地址、位域定义、复位值和硬件行为。只引用事实并注明文件与行号，不复制代码与注释。

| 文件（`pcsx2/` 下） | 内容 | 章节 |
|---|---|---|
| `Hw.h`、`Hw.cpp`、`HwRead.cpp`、`HwWrite.cpp` | EE 一侧各寄存器的地址与读写处理（INTC、定时器、DMAC、VIF、GIF、IPU、SIF、MCH） | 第 4～8、10、11、14 章 |
| `R5900.cpp`、`R5900.h`、`COP0.cpp`、`FPU.cpp` | R5900 的 COP0、COP1 初值与 TLB；CPCOND0 | [第 3 章](/chapters/03-ee-core)、[第 6 章](/chapters/06-dmac)、[第 15 章](/chapters/15-boot) |
| `Dmac.h`、`Dmac.cpp` | INTC 中断源编号、DMAC 寄存器与 DMAtag | [第 4 章](/chapters/04-ee-intc)、[第 6 章](/chapters/06-dmac) |
| `ps2/BiosTools.cpp` | ROMDIR 项、ROMDIR 遍历、ROMVER 的解析 | [第 15 章](/chapters/15-boot) |
| `R3000AInterpreter.cpp` | IOPBOOT 入口 `0xBFC4A000` 与内存大小参数 | [第 15 章](/chapters/15-boot) |
| `Counters.cpp`、`Counters.h` | EE 定时器 | [第 5 章](/chapters/05-ee-timer) |
| `Vif.h`、`Vif.cpp`、`Vif_Codes.cpp`、`VU.h`、`VU0.cpp`、`VU0micro.cpp`、`VU1micro.cpp`、`VU0microInterp.cpp`、`VU1microInterp.cpp`、`VUops.cpp` | VIF 寄存器与 VIFcode；VU 控制寄存器、微程序启动与 VPU_STAT | [第 7 章](/chapters/07-vpu) |
| `Gif.h`、`Gif_Unit.h`、`Gif_Unit.cpp` | GIF 寄存器、GIFtag、PATH 仲裁与屏蔽、SIGNAL 停顿 | [第 8 章](/chapters/08-gif)、[第 9 章](/chapters/09-gs) |
| `GS.h`、`GS.cpp`、`GS/GSRegs.h`、`GS/GSState.cpp`、`GS/GSLocalMemory.cpp`、`GS/GSClut.cpp`、`GS/GSUtil.cpp`、`GS/Renderers/SW/GSDrawScanline.cpp`、`GS/Renderers/OpenGL/GSDeviceOGL.cpp` | GS 特权寄存器与一般寄存器、PACKED 格式、局部存储器布局、CLUT、绘图与 PCRTC 合成 | [第 8 章](/chapters/08-gif)、[第 9 章](/chapters/09-gs) |
| `IPU/IPU.h`、`IPU/IPU.cpp`、`IPU/IPU_Fifo.h`、`IPU/IPU_Fifo.cpp`、`IPU/IPU_MultiISA.h`、`IPU/IPU_MultiISA.cpp`、`IPU/IPUdma.cpp`、`IPU/mpeg2_vlc.h` | IPU 寄存器、命令、FIFO 与 DMA 通道 3/4 | [第 10 章](/chapters/10-ipu) |
| `Sif.h`、`sif2.cpp`、`IopMem.cpp` | SIF FIFO 大小、IOP 一侧的 SIF 寄存器、SIF2 | [第 11 章](/chapters/11-sif) |
| `R3000A.cpp`、`IopHw.h`、`IopHw.cpp`、`IopIrq.cpp`、`IopCounters.cpp`、`ps2/Iop/IopHwRead.cpp`、`ps2/Iop/IopHwWrite.cpp` | IOP 复位与异常入口、IOP 时钟、SSBUS、IOP INTC、IOP DMA、IOP 定时器 | [第 12 章](/chapters/12-iop)、[第 14 章](/chapters/14-peripherals) |
| `CDVD/CDVD.cpp`、`CDVD/CDVD_internal.h` | CDVD 寄存器、N 命令与 S 命令、NVM 布局、RTC | [第 13 章](/chapters/13-cdvd) |
| `SIO/Sio2.cpp`、`SIO/SioTypes.h` | SIO2 寄存器 | [第 14 章](/chapters/14-peripherals) |
| `SPU2/regs.h`、`SPU2/spu2sys.cpp`、`SPU2/Dma.cpp` | SPU2 寄存器与 ADMA | [第 14 章](/chapters/14-peripherals) |
| `DEV9/DEV9.h`、`DEV9/DEV9.cpp` | DEV9（SPEED）寄存器 | [第 14 章](/chapters/14-peripherals) |
| `Memory.cpp` | DVE 区域的地址 | [第 14 章](/chapters/14-peripherals) |

## C.3 ps2tek

- 地址：<https://psi-rockin.github.io/ps2tek/>
- 性质：社区整理的 PS2 硬件文档，未声明授权。
- 用途：寄存器功能、位域含义与硬件行为的主要文字资料。本手册只转述其内容并注明章节名，不照搬原文。

| 引用的章节 | 章节 |
|---|---|
| §Memory Map、§EE Map | 第 7、9、14 章的寄存器地址 |
| §EE COP0 Registers、§EE COP0 Exception Handling、§EE COP0 Memory Management、§EE COP0 Caches、§EE COP0 Timer、§EE COP1 Registers | [第 3 章](/chapters/03-ee-core) |
| §EE Interrupt Controller (INTC)、§BIOS EE Syscalls、§BIOS | [第 4 章](/chapters/04-ee-intc) |
| §EE Timers | [第 5 章](/chapters/05-ee-timer) |
| §EE DMAC | [第 6 章](/chapters/06-dmac) |
| §VIF I/O Registers、§VIF Commands、§VIF UNPACK、§VU Architecture、§VU Registers、§VU Instruction Format and Decoding、§VU Pipelining | [第 7 章](/chapters/07-vpu) |
| §Graphics Interface (GIF)、§GIF I/O、§GIFtags、§GIF Data Formats、§GIF PATH3 Masking | [第 8 章](/chapters/08-gif) |
| §GS Register List、§GS Primitives、§GS Vertex Attributes、§GS Frame and Z Buffers、§GS Transfers、§GS Textures、§GS Fog、§GS Alpha Blending、§GS Tests and Pixel Control、§BIOS | [第 9 章](/chapters/09-gs) |
| §Subsystem Interface (SIF)、§SIF Registers | [第 11 章](/chapters/11-sif) |
| §IOP Interrupts、§IOP DMA、§IOP Timers | [第 12 章](/chapters/12-iop) |
| §BIOS File Structure、§BIOS Boot Process | [第 15 章](/chapters/15-boot) |
| §CDVD I/O Ports、§CDVD N Commands、§CDVD S Commands | [第 13 章](/chapters/13-cdvd) |
| §SIO2 Registers、§Sound Processing Unit (SPU2)、§SPU2 AutoDMA、§EE RDRAM initialization | [第 14 章](/chapters/14-peripherals) |

## C.4 ps2sdk

- 地址：<https://github.com/ps2dev/ps2sdk>
- 性质：开源 PS2 开发包，主体为 AFL 2.0 授权。
- 用途：寄存器名称、软件对寄存器的使用方式，以及 SIF 命令、RPC、CDVD 命令等固件层协议的含义。注明文件与行号，不复制代码。

| 文件 | 内容 | 章节 |
|---|---|---|
| `ee/kernel/include/kernel.h`、`ee/kernel/src/timer.c` | 内核对 EE 定时器的使用 | [第 5 章](/chapters/05-ee-timer) |
| `ee/libgs/include/libgs.h`、`ee/graph/include/graph.h`、`common/include/gs_privileged.h` | GS 特权寄存器的位域名称与常用取值 | [第 9 章](/chapters/09-gs) |
| `common/include/sifcmd-common.h`、`ee/kernel/src/sifcmd.c`、`ee/kernel/src/sifrpc.c`、`ee/kernel/src/iopcontrol.c`、`iop/system/sifman/include/sifman.h`、`iop/system/sifman/src/sifman.c`、`iop/system/sifcmd/src/sifcmd.c`、`iop/system/eesync/src/eesync.c` | SIF 命令包格式、系统命令号、引导握手标志、SIF DMA 的用法 | [第 11 章](/chapters/11-sif)、[第 12 章](/chapters/12-iop)、[第 15 章](/chapters/15-boot) |
| `common/include/iop_cop0_defs.h`、`common/include/iop_regs.h`、`iop/system/intrman/include/intrman.h`、`iop/system/loadcore/src/loadcore.c` | IOP COP0、SSBUS 与 IOP DMA 寄存器名称，IOP 中断号，指令缓存清除流程 | [第 12 章](/chapters/12-iop) |
| `iop/fs/romdrv/include/romdrv.h`、`iop/fs/romdrv/src/romdrv.c` | ROM 文件系统组织、ROMDIR 与 EXTINFO、以 RESET 识别映像 | [第 15 章](/chapters/15-boot) |
| `iop/cdvd/cdvdman/src/cdvdman.c`、`common/include/libcdvd-common.h`、`common/include/dev5_mmio_hwport.h` | CDVD 中断处理、N 命令与 S 命令的收发、RTC 与 NVM 命令、寄存器基地址 | [第 13 章](/chapters/13-cdvd) |
| `iop/sio/mx4sio_bd/src/sio2regs.h`、`iop/sio/mx4sio_bd/src/mx4sio.c` | SIO2 寄存器名称与用法 | [第 14 章](/chapters/14-peripherals) |
| `common/include/speedregs.h`、`common/include/dev9regs.h` | DEV9（SPEED）寄存器名称 | [第 14 章](/chapters/14-peripherals) |
| `ee/kernel/include/sio.h`、`ee/kernel/src/sio.c` | EE SIO 寄存器名称与用法（该文件注明其定义参考东芝 TX49/TX79 的配套芯片） | [第 14 章](/chapters/14-peripherals) |

## C.5 其他资料

| 资料 | 性质 | 用途 | 章节 |
|---|---|---|---|
| [DobieStation](https://github.com/PSI-Rockin/DobieStation) | 开源 PS2 模拟器，GPLv3 | QEMU 建模时作为 PCSX2 之外的另一个低层模拟实现，用于交叉核对；正文没有逐条引用其行号 | 全书 |
| frno7/linux（Fredrik Noring 的 PS2 Linux 移植，基于 Linux 5.4，<https://github.com/frno7/linux>） | 开源内核移植，GPLv2 | 精简 BIOS 需要提供的 SIF 握手与 RPC 服务（`sif_init` 的命令顺序、HEAP、LOADFILE）；EE SIO 作为控制台、以查询方式工作；作为“经 Linux 启动验证”的被测软件 | [第 11 章](/chapters/11-sif)、[第 14 章](/chapters/14-peripherals)、[第 15 章](/chapters/15-boot) |
| Rodrigo Copetti，[《PlayStation 2 架构》](https://www.copetti.org/zh-hans/writings/consoles/playstation-2/) | 架构科普文章 | 本手册的章节结构参照该文；插图全部重新绘制 | [第 1 章](/chapters/01-overview) |
| *Open Host Controller Interface Specification for USB*，Release 1.0a | USB 主控制器的公开规范 | IOP 一侧 USB 主控制器（OHCI）的寄存器定义，本手册不重复列出 | [第 14 章](/chapters/14-peripherals) |
| IEEE 754 | 浮点数标准 | 说明 R5900 COP1 与 VU 的浮点格式及其与标准的差异 | [第 3 章](/chapters/03-ee-core)、[第 7 章](/chapters/07-vpu) |
