export interface DialogueMessage {
  speakerId: string;
  speakerName: string;
  roleTitle: string;
  roleColor: string;
  targetId?: string;
  targetName?: string;
  text: string;
  tone: 'neutral' | 'work' | 'angry' | 'chill' | 'celebrate' | 'roast';
  durationMs: number;
}

export class DialogueEngine {
  private characterNames: Record<string, string> = {
    blaze: 'Blaze',
    nova: 'Nova',
    aura: 'Aura',
    rex: 'Rex',
    kael: 'Kael',
    viper: 'Viper',
    echo: 'Echo',
    rook: 'Rook',
    zero: 'Zero',
    tark: 'Tark'
  };

  private characterTitles: Record<string, string> = {
    blaze: 'Engineering PM',
    nova: 'Tech Lead & Architect',
    aura: 'UI/UX Designer',
    rex: 'Frontend Engineer',
    kael: 'Backend Engineer',
    viper: 'QA Lead',
    echo: 'QC / User Tester',
    rook: 'Security Officer',
    zero: 'R&D Specialist',
    tark: 'DevOps Specialist'
  };

  private characterColors: Record<string, string> = {
    blaze: '#FF3366',
    nova: '#00F0FF',
    aura: '#EC4899',
    rex: '#38BDF8',
    kael: '#A855F7',
    viper: '#00FF9D',
    echo: '#2DD4BF',
    rook: '#F59E0B',
    zero: '#6366F1',
    tark: '#F97316'
  };

  // Dialog percakapan berantai (Inter-jobdesk dramatic banter)
  private debateThreads = [
    // Thread 1: Perdebatan Bug Frontend vs QA vs PM
    [
      {
        speakerId: 'viper',
        targetId: 'rex',
        text: 'Rex! Gua masukin seribu karakter di input search lu langsung blank putih layarnya wkwk.',
        tone: 'roast' as const
      },
      {
        speakerId: 'rex',
        targetId: 'viper',
        text: 'Siapa juga user normal yang ngetik seribu huruf di kolom pencarian, Viper?!',
        tone: 'work' as const
      },
      {
        speakerId: 'blaze',
        targetId: 'rex',
        text: 'Rex! Tetep harus di-handle lah! Kalo bot spammer yang masuk gimana?! Benerin sekarang juga!',
        tone: 'angry' as const
      },
      {
        speakerId: 'rex',
        targetId: 'blaze',
        text: 'Iya-iya ampun bos, ini lagi gua pasang maxlength sama debounce 300 milidetik.',
        tone: 'work' as const
      }
    ],

    // Thread 2: Perdebatan Styling Designer vs Frontend Dev
    [
      {
        speakerId: 'aura',
        targetId: 'rex',
        text: 'Rex, border-radius di card dashboard kenapa lancip banget sih? Kan di Figma udah 16px!',
        tone: 'roast' as const
      },
      {
        speakerId: 'rex',
        targetId: 'aura',
        text: 'Kemaren lu yang minta gaya cyber tajem-tajem, sekarang minta bulet lagi. Bingung gue...',
        tone: 'work' as const
      },
      {
        speakerId: 'nova',
        targetId: 'aura',
        text: 'Aura, Rex, tarik dari design token theme.css aja biar konsisten seisi aplikasi.',
        tone: 'neutral' as const
      },
      {
        speakerId: 'aura',
        targetId: 'nova',
        text: 'Oke Lead, hex token barunya udah gua push ke branch design system ya.',
        tone: 'chill' as const
      }
    ],

    // Thread 3: Perdebatan Backend DB vs Security vs R&D
    [
      {
        speakerId: 'rook',
        targetId: 'kael',
        text: 'Kael, query database lu lolos tanpa parameter binding nih. Bahaya SQL injection!',
        tone: 'angry' as const
      },
      {
        speakerId: 'kael',
        targetId: 'rook',
        text: 'Itu query internal dashboard monitoring doang Rook, ga terekspos ke publik.',
        tone: 'work' as const
      },
      {
        speakerId: 'rook',
        targetId: 'kael',
        text: 'Standar Zero Trust bro! Mau internal atau eksternal wajib disanitasi!',
        tone: 'angry' as const
      },
      {
        speakerId: 'zero',
        targetId: 'kael',
        text: 'Bungkus pake prepared statement ORM aja Kael, lebih bersih dan aman.',
        tone: 'chill' as const
      },
      {
        speakerId: 'kael',
        targetId: 'rook',
        text: 'Udah beres gua bungkus prepared statement. Aman sekarang kan, Rook?',
        tone: 'chill' as const
      }
    ],

    // Thread 4: Sukses Sprint & Traktiran Kopi
    [
      {
        speakerId: 'echo',
        targetId: 'blaze',
        text: 'Bos Blaze, skenario checkout akhir lulus semua tanpa ada kendala!',
        tone: 'celebrate' as const
      },
      {
        speakerId: 'viper',
        targetId: 'blaze',
        text: 'Unit test 100 persen lulus, cakupan testing hijau semua bos!',
        tone: 'celebrate' as const
      },
      {
        speakerId: 'blaze',
        targetId: 'nova',
        text: 'Mantap jiwa! Kopi mesin synthesizer gua traktir double shot buat semua divisi!',
        tone: 'celebrate' as const
      },
      {
        speakerId: 'zero',
        targetId: 'blaze',
        text: 'Nah gitu dong bos, rileks dikit, jangan ngomel-ngomel mulu haha.',
        tone: 'chill' as const
      }
    ]
  ];

  public getTaskDialogue(tool: string, target?: string, isError: boolean = false): DialogueMessage {
    const filename = target ? target.split(/[\\/]/).pop() || target : '';

    if (isError) {
      return {
        speakerId: 'blaze',
        speakerName: this.characterNames.blaze,
        roleTitle: this.characterTitles.blaze,
        roleColor: this.characterColors.blaze,
        text: `Aduh! Kenapa malah error di ${filename || 'bagian ini'}?! Siapa yang tadi utak-atik logic-nya?!`,
        tone: 'angry',
        durationMs: 4500
      };
    }

    const t = tool.toLowerCase();

    if (t.includes('plan') || t.includes('brainstorm') || t.includes('think')) {
      return {
        speakerId: 'nova',
        speakerName: this.characterNames.nova,
        roleTitle: this.characterTitles.nova,
        roleColor: this.characterColors.nova,
        text: 'Semua divisi kumpul sebentar. Kita matangkan cetak biru arsitektur dulu sebelum mulai ngoding.',
        tone: 'work',
        durationMs: 4000
      };
    }

    if (t.includes('test') || t.includes('verify') || t.includes('check')) {
      return {
        speakerId: 'viper',
        speakerName: this.characterNames.viper,
        roleTitle: this.characterTitles.viper,
        roleColor: this.characterColors.viper,
        text: `Menjalankan skenario pengujian untuk ${filename || 'komponen ini'}. Mari kita lihat apa ada yang jebol...`,
        tone: 'work',
        durationMs: 3800
      };
    }

    if (t.includes('sec') || t.includes('token') || t.includes('auth') || t.includes('vuln')) {
      return {
        speakerId: 'rook',
        speakerName: this.characterNames.rook,
        roleTitle: this.characterTitles.rook,
        roleColor: this.characterColors.rook,
        text: 'Memeriksa sanitasi akses dan enkripsi data. Keamanan sistem prioritas utama!',
        tone: 'work',
        durationMs: 4000
      };
    }

    if (filename.endsWith('.css') || filename.endsWith('.tsx') || filename.endsWith('.jsx') || filename.endsWith('.html') || filename.endsWith('.vue')) {
      return {
        speakerId: 'rex',
        speakerName: this.characterNames.rex,
        roleTitle: this.characterTitles.rex,
        roleColor: this.characterColors.rex,
        text: `Merapikan tampilan visual ${filename}. Responsivitas layout dan animasi transisi sudah beres!`,
        tone: 'work',
        durationMs: 3800
      };
    }

    if (filename.endsWith('.ts') || filename.endsWith('.go') || filename.endsWith('.py') || filename.endsWith('.rs') || filename.endsWith('.sql')) {
      return {
        speakerId: 'kael',
        speakerName: this.characterNames.kael,
        roleTitle: this.characterTitles.kael,
        roleColor: this.characterColors.kael,
        text: `Optimasi query dan alur data server di ${filename}. Semua proses berjalan lancar.`,
        tone: 'work',
        durationMs: 3800
      };
    }

    if (t.includes('search') || t.includes('fetch') || t.includes('read')) {
      return {
        speakerId: 'zero',
        speakerName: this.characterNames.zero,
        roleTitle: this.characterTitles.zero,
        roleColor: this.characterColors.zero,
        text: `Lagi riset dokumentasi dan referensi arsitektur untuk ${filename || 'isu ini'}, ada temuan menarik nih...`,
        tone: 'chill',
        durationMs: 3800
      };
    }

    if (t.includes('build') || t.includes('docker') || t.includes('deploy') || t.includes('git')) {
      return {
        speakerId: 'tark',
        speakerName: this.characterNames.tark,
        roleTitle: this.characterTitles.tark,
        roleColor: this.characterColors.tark,
        text: 'Pipeline build berjalan. Mengkompilasi seluruh paket dan cek kesiapan server.',
        tone: 'work',
        durationMs: 3800
      };
    }

    return {
      speakerId: 'rex',
      speakerName: this.characterNames.rex,
      roleTitle: this.characterTitles.rex,
      roleColor: this.characterColors.rex,
      text: `Mengeksekusi tugas pada ${filename || 'modul kerja'}...`,
      tone: 'work',
      durationMs: 3500
    };
  }

  public getRandomDebateThread(): DialogueMessage[] {
    const threadIndex = Math.floor(Math.random() * this.debateThreads.length);
    const rawThread = this.debateThreads[threadIndex];

    return rawThread.map(item => ({
      speakerId: item.speakerId,
      speakerName: this.characterNames[item.speakerId] || item.speakerId,
      roleTitle: this.characterTitles[item.speakerId] || 'Specialist',
      roleColor: this.characterColors[item.speakerId] || '#38BDF8',
      targetId: item.targetId,
      targetName: item.targetId ? this.characterNames[item.targetId] : undefined,
      text: item.text,
      tone: item.tone,
      durationMs: 4000
    }));
  }

  public getRandomIdleDialogue(): DialogueMessage {
    const idleQuotes = [
      { speakerId: 'zero', text: 'Kopi hazelnut hangat ini pas banget buat nemenin mikir algoritma baru.', tone: 'chill' as const },
      { speakerId: 'aura', text: 'Perpaduan warna gelap dan aksen neon ini nyaman banget di mata ya.', tone: 'chill' as const },
      { speakerId: 'blaze', text: 'Tumben suasana tenang... Semoga ga ada laporan server meledak siang ini.', tone: 'neutral' as const },
      { speakerId: 'kael', text: 'Nyeruput kopi bentar sebelum lanjut refactor query database.', tone: 'chill' as const },
      { speakerId: 'viper', text: 'Gua lagi siapin puluhan skenario uji baru, siap-siap aja kalian haha.', tone: 'roast' as const },
      { speakerId: 'nova', text: 'Arsitektur sistem kita udah makin rapi, tinggal jaga konsistensi aja.', tone: 'neutral' as const },
      { speakerId: 'echo', text: 'Nyoba simulasi aksi user awam, seru juga nemu celah-celah unik di aplikasi.', tone: 'chill' as const },
      { speakerId: 'tark', text: 'Beban server cuma nol koma dua persen, adem bener mesin hari ini.', tone: 'chill' as const }
    ];

    const pick = idleQuotes[Math.floor(Math.random() * idleQuotes.length)];
    return {
      speakerId: pick.speakerId,
      speakerName: this.characterNames[pick.speakerId],
      roleTitle: this.characterTitles[pick.speakerId],
      roleColor: this.characterColors[pick.speakerId],
      text: pick.text,
      tone: pick.tone,
      durationMs: 4000
    };
  }
}
