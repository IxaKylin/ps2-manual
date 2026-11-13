# 附录 B 术语表

本表按英文术语或缩写的字母顺序排列，收录正文中使用的缩写与专用术语。“中文”列为本手册采用的译名；正文中只用英文缩写、不另译的术语，该列写缩写本身，必要时括注含义。“首见章节”为该术语在正文中第一次出现的章节。

寄存器名与位域名不在本表中列出，见[附录 A 寄存器地址速查](/appendix/register-index)。

| 英文/缩写 | 中文 | 说明 | 首见章节 |
|---|---|---|---|
| A+D | A+D 描述符 | GIF PACKED 模式的寄存器描述符 `0xE`：四字的第 63:0 位为数据，第 71:64 位为 GS 一般寄存器地址，可写任意一般寄存器 | [第 8 章](/chapters/08-gif) |
| ADMA | 自动 DMA | SPU2 的流式 DMA 输入方式，数据送入声音存储器的 MEMIN 区；QEMU 未实现 | [第 14 章](/chapters/14-peripherals) |
| ADPCM | ADPCM 波形 | SPU2 声音存储器中存放的压缩波形数据 | [第 14 章](/chapters/14-peripherals) |
| ATA | ATA 硬盘接口 | 经 DEV9 扩展接口与 SPEED 芯片接入的硬盘接口 | [第 1 章](/chapters/01-overview) |
| BCD | 二进制编码的十进制数 | RTC 时间、更新日期等字段采用的编码 | [第 13 章](/chapters/13-cdvd) |
| BIOS | BIOS | ROM0 中的 Sony 系统软件，EE 与 IOP 共用；本手册以 SCPH-39001 的 BIOS 作启动验证 | [第 1 章](/chapters/01-overview) |
| Boot ROM | 引导 ROM | 存放 BIOS 的 ROM0，4 MB | [第 1 章](/chapters/01-overview) |
| BUSCLK | 总线时钟 | EE 总线时钟，147.456 MHz（CPU 时钟的 1/2），EE 定时器的基准时钟 | [第 5 章](/chapters/05-ee-timer) |
| CDVD | CDVD 子系统、光驱 | IOP 一侧的光驱子系统，由 MechaCon 与 DSP 组成，经 `0x1F402000` 起的 8 位寄存器访问 | [第 1 章](/chapters/01-overview) |
| Chain mode | 链模式 | DMA 传输模式之一，按 DMAtag 逐段决定数据块地址与长度，分源链与目的链 | [第 6 章](/chapters/06-dmac) |
| CLUT | CLUT（颜色查找表） | GS 索引色纹理使用的颜色表，存放在本地存储器中 | [第 9 章](/chapters/09-gs) |
| Context | 上下文 | GS 的两套绘图环境寄存器，由 PRIM.CTXT 选择 | [第 9 章](/chapters/09-gs) |
| COP0 | 协处理器 0 | 系统控制协处理器，含 TLB、异常、计数器等寄存器；EE 与 IOP 各有一个 | [第 1 章](/chapters/01-overview) |
| COP1 | 协处理器 1 | R5900 的单精度浮点单元（FPU） | [第 1 章](/chapters/01-overview) |
| COP2 | 协处理器 2 | 宏模式下作为 R5900 协处理器的 VU0 | [第 1 章](/chapters/01-overview) |
| CPCOND0 | CPCOND0 | DMAC 送给 R5900 的协处理器 0 条件信号，用 BC0T/BC0F 指令检测 | [第 2 章](/chapters/02-memory-map) |
| CSC | 颜色空间转换 | IPU 命令之一，把 YCbCr 数据转换为 RGB 格式 | [第 10 章](/chapters/10-ipu) |
| Cycle stealing | 周期挪用 | DMAC 每占用总线 RCYC 指定的周期数后把总线让给 CPU 的方式；QEMU 中无效 | [第 6 章](/chapters/06-dmac) |
| Data memory | 数据存储器 | VU 的数据存储器：VU0 4 KB，VU1 16 KB，以四字为单位编址 | [第 1 章](/chapters/01-overview) |
| Delay slot | 延迟槽 | 分支与跳转指令之后总被执行的一条指令 | [第 3 章](/chapters/03-ee-core) |
| Destination chain | 目的链 | 外设 → 存储器方向的链模式，DMAtag 随数据从外设送来 | [第 6 章](/chapters/06-dmac) |
| DEV9 | 扩展接口 | IOP 一侧的扩展接口，后接 SPEED 芯片 | [第 1 章](/chapters/01-overview) |
| DMA | DMA（直接存储器访问） | 不经 CPU 在存储器与外设之间搬运数据 | [第 1 章](/chapters/01-overview) |
| DMAC | DMA 控制器 | EE 的 10 通道 DMA 控制器，以四字为单位传输；IOP 一侧另有 13 通道 DMA 控制器 | [第 1 章](/chapters/01-overview) |
| DMAtag | DMAtag（DMA 标签） | 链模式中描述一段数据的标签：EE 一侧为 128 位，给出 ID、QWC 与地址；IOP 一侧为两个字 | [第 6 章](/chapters/06-dmac) |
| Double buffering | 双缓冲 | VIF1 以 BASE/OFST/TOPS/TOP 在 VU1 数据存储器中交替使用两块缓冲区；GS 中指两个帧缓冲交替显示 | [第 7 章](/chapters/07-vpu) |
| DSP | DSP | CDVD 中执行 N 命令、控制光驱机构的部分 | [第 13 章](/chapters/13-cdvd) |
| DVE | 视频编码器 | 把 GS 输出编码为复合、S 端子、色差、RGB 等视频信号，EE 经串行端口设置 | [第 1 章](/chapters/01-overview) |
| EE | Emotion Engine | PS2 主处理器芯片，集成 R5900、VPU0/VPU1、DMAC、IPU、GIF、INTC、定时器与 SIF | [第 1 章](/chapters/01-overview) |
| EECONF | EECONF | 读取 CDVD NVM 中配置的 IOP 模块 | [第 13 章](/chapters/13-cdvd) |
| EELOAD | EELOAD | BIOS 引导阶段在 EE 上运行的程序，定义见 [15.3](/chapters/15-boot#_15-3-ee-启动) | [第 11 章](/chapters/11-sif) |
| EEPROM | EEPROM | MechaCon 管理的 1 KB 非易失存储器，即 NVM | [第 13 章](/chapters/13-cdvd) |
| EFU | 初等函数单元 | VU1 独有的功能单元，计算正弦、指数、平方根等，结果写 P 寄存器 | [第 7 章](/chapters/07-vpu) |
| ELF | ELF 文件 | 可执行文件格式；以 `-kernel` 给出 Linux ELF 时 QEMU 走 lite-bios 引导路径 | [第 13 章](/chapters/13-cdvd) |
| EPC | 异常程序计数器 | COP0 寄存器，保存异常返回地址 | [第 3 章](/chapters/03-ee-core) |
| EXTINFO | EXTINFO | ROM0 中紧接 ROMDIR 的文件，保存各文件的日期、版本与注释等附加信息 | [第 15 章](/chapters/15-boot) |
| FIFO | FIFO（先进先出缓冲区） | 各外设与 DMAC 之间的数据缓冲 | [第 2 章](/chapters/02-memory-map) |
| FMAC | 浮点乘加单元 | VU 执行上部指令的浮点运算单元 | [第 7 章](/chapters/07-vpu) |
| FMV | 全动态视频 | 游戏片头与过场动画，以 MPEG 码流保存，由 IPU 解码 | [第 10 章](/chapters/10-ipu) |
| FPU | 浮点单元 | 即 COP1 | [第 1 章](/chapters/01-overview) |
| Frame buffer | 帧缓冲 | GS 本地存储器中保存绘制结果的区域，由 PCRTC 读出显示 | [第 9 章](/chapters/09-gs) |
| General register (GS) | 一般寄存器 | GS 的绘图命令寄存器，只能经 GIF 写入，没有总线地址 | [第 1 章](/chapters/01-overview) |
| GIF | 图形接口 | EE 与 GS 之间的接口，在 PATH1～PATH3 之间仲裁，把 GIF 数据包转换为 GS 寄存器写入 | [第 1 章](/chapters/01-overview) |
| GIF packet | GIF 数据包 | 由 GIFtag 与其后数据组成 | [第 1 章](/chapters/01-overview) |
| GIFtag | GIFtag（GIF 标签） | GIF 数据包的 128 位头部，给出 NLOOP、EOP、数据格式与寄存器描述符 | [第 7 章](/chapters/07-vpu) |
| Gouraud shading | Gouraud 着色 | 三角形颜色在顶点之间插值的着色方式 | [第 9 章](/chapters/09-gs) |
| GS | 图形合成器 | Graphics Synthesizer，负责光栅化、纹理映射与显示输出，带 4 MB 本地存储器 | [第 1 章](/chapters/01-overview) |
| HBLANK、HBLNK | 行消隐 | 行消隐信号；HBLNK 是 EE 定时器的计数时钟与门控源，HBLANK 是 IOP 根计数器的外部时钟 | [第 5 章](/chapters/05-ee-timer) |
| HLE | 高层模拟 | 用模拟器代码代替 IOP 软件应答的做法；当前 QEMU 不使用 | [第 11 章](/chapters/11-sif) |
| Host ↔ local transfer | 主机 ↔ 本地传输 | 主存与 GS 本地存储器之间的图像传输（主机 → 本地、本地 → 主机），以及本地 → 本地复制 | [第 7 章](/chapters/07-vpu) |
| i.LINK | i.LINK 接口 | 早期型号上的 IEEE 1394 接口，QEMU 未实现 | [第 1 章](/chapters/01-overview) |
| ICFG | ICFG | IOP 配置寄存器（`0x1F801450`），写第 1 位为 1 时向 EE 发出 SBUS 中断 | [第 2 章](/chapters/02-memory-map) |
| IDCT | 反离散余弦变换 | IPU 解码宏块的步骤之一 | [第 10 章](/chapters/10-ipu) |
| IMAGE | IMAGE 模式 | GIF 数据格式之一，数据全部写入 HWREG，用于主机 → 本地图像传输 | [第 7 章](/chapters/07-vpu) |
| Instruction pair | 指令对 | VU 的 64 位微指令，由一条上部指令和一条下部指令组成 | [第 7 章](/chapters/07-vpu) |
| INT0、INT1 | INT0、INT1 | EE INTC 与 DMAC 送给 R5900 的两路中断，分别接 Cause.IP2 与 Cause.IP3 | [第 4 章](/chapters/04-ee-intc) |
| INTC | 中断控制器 | EE 与 IOP 各有一个 | [第 1 章](/chapters/01-overview) |
| Interleave mode | 交错模式 | 仅 SPR 通道使用的 DMA 传输模式，按 D_SQWC 在主存矩形区域与 SPR 之间传输 | [第 6 章](/chapters/06-dmac) |
| Interrupt handler | 中断处理程序 | 响应中断的软件例程 | [第 3 章](/chapters/03-ee-core) |
| IOP | I/O 处理器 | Input/Output Processor，以 R3000A 为核心，管理光驱、手柄、存储卡、SPU2 等外设，也是 PS1 兼容模式的主处理器 | [第 1 章](/chapters/01-overview) |
| IOP RAM | IOP 内存 | IOP 专用的 2 MB 内存 | [第 1 章](/chapters/01-overview) |
| IOPBOOT | IOPBOOT | IOP 的引导程序，入口 `0xBFC4A000` | [第 15 章](/chapters/15-boot) |
| IOPBTCONF | IOPBTCONF | 列出 IOP 引导时要加载的模块的文本文件 | [第 11 章](/chapters/11-sif) |
| IPU | 图像处理单元 | EE 中的 MPEG 解码协处理器；QEMU 未实现 | [第 1 章](/chapters/01-overview) |
| IRX | IRX 模块 | 在 IOP 上运行的驱动模块，如 cdvdman、sifman | [第 12 章](/chapters/12-iop) |
| JST | 日本标准时间 | MechaCon RTC 采用的时间（UTC+9） | [第 13 章](/chapters/13-cdvd) |
| KON、KOFF | 键按下、键释放 | SPU2 开始与停止声部发声的寄存器 | [第 14 章](/chapters/14-peripherals) |
| KSEG0、KSEG1 | KSEG0、KSEG1 | MIPS 内核地址段，都直接映射到物理地址：KSEG0 经缓存，KSEG1 不经缓存 | [第 2 章](/chapters/02-memory-map) |
| lite-bios | 精简 BIOS | QEMU 自带的 `pc-bios/ps2-lite-bios`，在 EE 与真实 R3000A IOP 上运行，用于引导 Linux ELF | [第 1 章](/chapters/01-overview) |
| LOADCORE | LOADCORE | IOP 的 IRX 加载与链接模块 | [第 15 章](/chapters/15-boot) |
| Local memory | 本地存储器 | GS 片上 4 MB 嵌入式 DRAM，由帧缓冲、Z 缓冲、纹理与 CLUT 共用 | [第 7 章](/chapters/07-vpu) |
| Lower instruction | 下部指令 | VU 指令对的低 32 位，执行装入 / 存储、整数运算、分支等 | [第 3 章](/chapters/03-ee-core) |
| Macro mode | 宏模式 | VU0 作为 R5900 协处理器 2、由 COP2 指令驱动的工作方式 | [第 3 章](/chapters/03-ee-core) |
| Macroblock | 宏块 | MPEG 编码的基本单位，IPU 以宏块为单位解码与输出 | [第 10 章](/chapters/10-ipu) |
| MagicGate | MagicGate | 存储卡与光盘使用的认证与加密机制；QEMU 未实现 | [第 13 章](/chapters/13-cdvd) |
| Main memory | 主存 | EE 一侧的 32 MB Direct RDRAM | [第 1 章](/chapters/01-overview) |
| MCH | 存储器控制器 | EE 的 RDRAM 初始化接口 | [第 1 章](/chapters/01-overview) |
| MDEC | MDEC | PS1 的图像解码器，IOP DMA 通道 0、1 为其保留；QEMU 未实现 | [第 12 章](/chapters/12-iop) |
| MechaCon | MechaCon（机芯控制器） | CDVD 中执行 S 命令的控制器，管理 RTC、NVM、托盘与认证 | [第 1 章](/chapters/01-overview) |
| Memory card | 存储卡 | 经 SIO2 连接 | [第 1 章](/chapters/01-overview) |
| MFIFO | MFIFO | DMAC 在主存中设置的环形缓冲区，用于两个通道之间流水传递数据；QEMU 未实现 | [第 6 章](/chapters/06-dmac) |
| Micro mode | 微模式 | VU 独立运行微程序的工作方式；VU1 只有微模式 | [第 3 章](/chapters/03-ee-core) |
| Microprogram | 微程序 | 在 VU 上运行的程序 | [第 1 章](/chapters/01-overview) |
| Microprogram memory | 微程序存储器 | VU 的指令存储器：VU0 4 KB，VU1 16 KB | [第 2 章](/chapters/02-memory-map) |
| MIPS | MIPS | R5900 与 R3000A 所属的指令集体系结构 | [第 1 章](/chapters/01-overview) |
| MMI | 多媒体指令 | R5900 的 128 位整数 SIMD 指令，使用 SPECIAL2 主操作码 | [第 1 章](/chapters/01-overview) |
| MMIO | MMIO（存储器映射 I/O） | QEMU 中映射到总线地址的寄存器区 | [第 8 章](/chapters/08-gif) |
| MPEG | MPEG | 运动图像压缩标准，IPU 解码 MPEG-1/MPEG-2 码流 | [第 6 章](/chapters/06-dmac) |
| MTTCG | 多线程 TCG | QEMU 让 EE 与 IOP 在不同主机线程上运行的方式 | [第 3 章](/chapters/03-ee-core) |
| Multitap | 多分插适配器 | 扩展手柄或存储卡插口数量的适配器 | [第 14 章](/chapters/14-peripherals) |
| N command | N 命令 | CDVD 的异步命令（寻道、读扇区、读 TOC 等），由 DSP 执行 | [第 13 章](/chapters/13-cdvd) |
| Normal mode | 普通模式 | DMA 传输模式之一，按 MADR 与 QWC 传输一个数据块 | [第 6 章](/chapters/06-dmac) |
| NTSC、PAL | NTSC、PAL | 两种电视制式，场频分别为 59.94 Hz 与 50 Hz | [第 1 章](/chapters/01-overview) |
| NVM | NVM | MechaCon 管理的 1 KB EEPROM，存放系统设置、i.LINK ID、Console ID 与机器型号 | [第 1 章](/chapters/01-overview) |
| OHCI | OHCI | Open Host Controller Interface，IOP 一侧 USB 主控制器遵循的 1.0a 规范 | [第 2 章](/chapters/02-memory-map) |
| OSDSYS | OSDSYS | BIOS 中的系统主菜单程序；QEMU 运行真实 BIOS 可显示其主菜单 | [第 1 章](/chapters/01-overview) |
| PACKED | PACKED 模式 | GIF 数据格式之一，每个四字按寄存器描述符写一个 GS 寄存器 | [第 8 章](/chapters/08-gif) |
| Pad | 手柄 | 经 SIO2 连接 | [第 1 章](/chapters/01-overview) |
| PATH1、PATH2、PATH3 | PATH1、PATH2、PATH3 | 通往 GIF 的三条路径：VU1 的 XGKICK、VIF1 的 DIRECT/DIRECTHL、DMAC 通道 2 | [第 1 章](/chapters/01-overview) |
| PCRTC | PCRTC（CRT 控制器） | GS 中的两个读出电路，从帧缓冲读出显示区域并产生场同步 | [第 1 章](/chapters/01-overview) |
| PIO（IOP 外设） | 并行口 | IOP INTC 10 号中断源与 IOP DMA 通道 5 对应的外设；QEMU 未实现 | [第 12 章](/chapters/12-iop) |
| PIO（传输方式） | PIO | 由 CPU 逐个读写数据端口的传输方式，与 DMA 相对 | [第 14 章](/chapters/14-peripherals) |
| Primitive | 图元 | GS 绘制的点、线、三角形、精灵等基本图形 | [第 1 章](/chapters/01-overview) |
| Privileged register (GS) | 特权寄存器 | GS 中有总线地址的控制寄存器（PMODE、DISPLAY、CSR 等） | [第 2 章](/chapters/02-memory-map) |
| PS1 | PS1 | 第一代 PlayStation；IOP 兼作 PS1 兼容模式的主处理器 | [第 1 章](/chapters/01-overview) |
| PSM | 像素格式 | GS 帧缓冲、Z 缓冲与纹理的像素存储格式（PSMCT32、PSMZ24 等） | [第 9 章](/chapters/09-gs) |
| PStwo | PStwo | 薄型 PS2 机型，部分 S 命令只用于此类机型 | [第 13 章](/chapters/13-cdvd) |
| QEMU | QEMU | 本手册“已验证”内容所依据的模拟器，机型 `-M ps2` | [第 1 章](/chapters/01-overview) |
| qtest | qtest | QEMU 的设备测试框架；本手册以 qtest 用例与启动记录作为验证依据 | [第 1 章](/chapters/01-overview) |
| Quadword (QW) | 四字 | 128 位数据单位，DMAC、VIF、GIF 的传输单位 | [第 6 章](/chapters/06-dmac) |
| R3000A | R3000A | IOP 的 MIPS 处理器核心，36.864 MHz | [第 1 章](/chapters/01-overview) |
| R5900 | R5900 | EE 的处理器核心，294.912 MHz，实现 MIPS III 与部分 MIPS IV 指令并带 MMI | [第 1 章](/chapters/01-overview) |
| RDRAM | Direct RDRAM | 主存所用的存储器类型 | [第 1 章](/chapters/01-overview) |
| REGLIST | REGLIST 模式 | GIF 数据格式之一，按寄存器列表以 64 位为单位依次写 GS 寄存器 | [第 8 章](/chapters/08-gif) |
| ROM0、ROM1、ROM2 | ROM0、ROM1、ROM2 | ROM0 为 4 MB 引导 ROM（BIOS）；ROM1 为 DVD 播放器；ROM2 为部分型号的中文字库 | [第 1 章](/chapters/01-overview) |
| ROMDIR | ROMDIR | BIOS 映像中的文件目录，QEMU 从中查找 ROMVER；定义见 [15.1.2](/chapters/15-boot#_15-1-2-romdir) | [第 13 章](/chapters/13-cdvd) |
| ROMVER | ROMVER | ROM0 中的版本文件，前 14 个字符为版本、区域、机型类别与日期（如 `0160AC20020207`）；定义见 [15.1.3](/chapters/15-boot#_15-1-3-romver) | [第 13 章](/chapters/13-cdvd) |
| Root counter | 根计数器 | IOP 的 6 个定时器 T0～T5 | [第 1 章](/chapters/01-overview) |
| RPC | RPC（远程过程调用） | 建立在 SIF 命令之上的 EE 与 IOP 之间的软件调用约定 | [第 1 章](/chapters/01-overview) |
| RTC | 实时时钟 | 由 MechaCon 维护，经 S 命令读写 | [第 1 章](/chapters/01-overview) |
| S command | S 命令 | CDVD 的同步命令（RTC、NVM、托盘、型号等），由 MechaCon 执行 | [第 13 章](/chapters/13-cdvd) |
| SBUS | SBUS | EE 与 IOP 之间的总线；EE 经 SBUS 地址窗口访问 IOP 内存与寄存器，EE INTC 1 号中断源也称 SBUS | [第 1 章](/chapters/01-overview) |
| SCPH | SCPH | Sony 主机型号前缀，如 SCPH-39001 | [第 1 章](/chapters/01-overview) |
| Scratchpad RAM (SPR) | 暂存存储器 | R5900 片上 16 KB 存储器，经 TLB 的 S 项映射，DMAC 可直接访问 | [第 1 章](/chapters/01-overview) |
| SIF | 子系统接口 | Subsystem Interface，连接 EE 与 IOP，提供 SIF0（IOP→EE）、SIF1（EE→IOP）、SIF2 三条 DMA 通道和标志寄存器 | [第 1 章](/chapters/01-overview) |
| SIF command | SIF 命令 | 建立在 SIF DMA 之上的软件命令约定 | [第 11 章](/chapters/11-sif) |
| SIMD | SIMD（单指令多数据） | 一条指令同时处理多个数据元素 | [第 3 章](/chapters/03-ee-core) |
| SIO | SIO | EE 一侧的调试串口，Linux 用作控制台 ttyS0 | [第 1 章](/chapters/01-overview) |
| SIO2 | SIO2 | IOP 一侧手柄与存储卡使用的串行接口 | [第 1 章](/chapters/01-overview) |
| Slice mode | 切片模式 | IOP DMA 按块大小与块数分块传输的同步模式（CHCR.SYNC = 1），SPU2 与 SIO2 通道使用 | [第 12 章](/chapters/12-iop) |
| SMAP | SMAP | SPEED 芯片后的以太网接口 | [第 14 章](/chapters/14-peripherals) |
| SoC | 片上系统 | 把处理器核心与外设集成在一起的芯片；QEMU 中对应 `ps2-ee`、`ps2-iop` 容器设备 | [第 4 章](/chapters/04-ee-intc) |
| Sound memory | 声音存储器 | SPU2 的 2 MB 存储器，存放波形、效果工作区与 ADMA 缓冲 | [第 14 章](/chapters/14-peripherals) |
| Source chain | 源链 | 存储器 → 外设方向的链模式，DMAC 从存储器读取 DMAtag | [第 6 章](/chapters/06-dmac) |
| SPEED | SPEED 芯片 | DEV9 扩展接口后的芯片，提供 ATA、SMAP 等接口的寄存器窗口 | [第 2 章](/chapters/02-memory-map) |
| Sprite | 精灵 | 由两个顶点确定的矩形图元 | [第 9 章](/chapters/09-gs) |
| SPU2 | 声音处理器 | IOP 一侧的声音处理器，两个核心共 48 个声部；QEMU 不发声 | [第 1 章](/chapters/01-overview) |
| SSBUS | SSBUS | IOP 与各外设之间的总线，其控制器寄存器设定外设地址窗口与访问时序 | [第 1 章](/chapters/01-overview) |
| Stall control | 停顿控制 | DMAC 在两个通道之间经主存流水传递数据时的同步机制；QEMU 未实现 | [第 6 章](/chapters/06-dmac) |
| TLB | TLB | R5900 的虚拟地址转换表，48 项，全相联 | [第 1 章](/chapters/01-overview) |
| TOC | TOC | 光盘目录表 | [第 13 章](/chapters/13-cdvd) |
| Tray | 托盘 | 光驱托盘；QEMU 中复位后关闭且无光盘 | [第 13 章](/chapters/13-cdvd) |
| UNPACK | 解包 | VIFcode 之一，把压缩数据展开为四字写入 VU 数据存储器 | [第 1 章](/chapters/01-overview) |
| Upper instruction | 上部指令 | VU 指令对的高 32 位，执行浮点向量运算 | [第 3 章](/chapters/03-ee-core) |
| USB | USB | IOP 一侧的 USB 1.1 主控制器（OHCI），两个端口 | [第 1 章](/chapters/01-overview) |
| VBLANK、VBLNK | 场消隐 | 场消隐信号；GS 在场消隐开始与结束时向 EE INTC 与 IOP INTC 发出中断 | [第 2 章](/chapters/02-memory-map) |
| VIF | 向量单元接口 | VIF0、VIF1，解析 VIFcode 并把数据写入对应 VU | [第 1 章](/chapters/01-overview) |
| VIFcode | VIFcode | VIF 数据流中的 32 位命令字 | [第 4 章](/chapters/04-ee-intc) |
| VLC | 变长码 | MPEG 码流中的可变长度编码，由 IPU 解码 | [第 10 章](/chapters/10-ipu) |
| Voice | 声部 | SPU2 中独立发声的单元，每个核心 24 个 | [第 14 章](/chapters/14-peripherals) |
| VPU | 向量处理单元 | VPU0、VPU1，各由一个 VU 和一个 VIF 组成 | [第 1 章](/chapters/01-overview) |
| VQ | 矢量量化 | IPU 输出 4 位索引色（INDX4）时使用的量化方式 | [第 10 章](/chapters/10-ipu) |
| VU | 向量单元 | VU0、VU1，4 路单精度 SIMD 浮点处理器 | [第 1 章](/chapters/01-overview) |
| XGKICK | XGKICK | VU1 指令，把数据存储器中的 GIF 数据包经 PATH1 送往 GIF | [第 1 章](/chapters/01-overview) |
| Z buffer | Z 缓冲 | GS 本地存储器中保存深度值的区域 | [第 9 章](/chapters/09-gs) |
