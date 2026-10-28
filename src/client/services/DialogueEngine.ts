import { KeosEvent, KeosRole } from '../types';

export class DialogueEngine {
  private static plannerQuotes = [
    'Gua bedah dulu arsitekturnya, lu pada santai dulu!',
    'Bikin skema database & blueprint sistem dulu coy.',
    'Diagram alur udah rapi. Nih Dev tolong gas koding!',
    'Bikin perancangan matang biar gak boncos token.',
    'Gua petakan dependency antar modul bentar ya.'
  ];

  private static devCodingQuotes = [
    'Sssttt, jemari gua lagi 120 WPM di keyboard mekanik!',
    'Ngetik logic sakti... jangan diajak ngobrol dulu!',
    'Refactor dikit biar rapi, modular, dan kenceng.',
    'Satu service kelar jos, tinggal wire ke router.',
    'Keyboard gua udah mulai berasap nih, mantap!',
    'Kodingan fungsi ini kelar, syntax bersih tanpa bug.'
  ];

  private static devReadingQuotes = [
    'Lagi baca manual & source code... ketemu celahnya!',
    'Ngecek dokumentasi dependensi lama bentar.',
    'Tracing call stack... oh di baris ini masalahnya!'
  ];

  private static qaTestingQuotes = [
    'Tarik tuas test suite! Awas lu kalo merah ya Dev!',
    'Lagi stress-testing concurrency... server stabil!',
    'Semua unit test HIJAU! 0 error, build lolos!',
    'Test suite approved! Siap lanjut ke tahap deploy!',
    'Ngecek edge cases ekstrim... untung gak jebol.'
  ];

  private static managerPanicQuotes = [
    'WOY INI SIAPA YANG BIKIN TEST MERAH?! PANIK GUA!',
    'KELUAR ASAP DARI KEPALA GUA ANJIR, CEPET FIX!',
    'Manager mode: GEBRAK MEJA! Revert atau benerin!',
    'User udah nanyain nih, masa ada error ginian?!'
  ];

  private static managerHappyQuotes = [
    'Nah gitu dong, kerja yang bener! Gua traktirin kopi.',
    'Sprint selesai on-time! Good job tim!',
    'Kinerja kalian mantap hari ini, pertahankan!'
  ];

  private static subagentQuotes = [
    'Permisi bos! Kontraktor spesialis siap eksekusi!',
    'Tugas subagent beres, data gua serahin ke Dev utama.',
    'Subagent standby, siap ngerjain delegasi berikutnya.'
  ];

  private static pantryQuotes = [
    'Seduh espresso double shot dulu biar melek...',
    'Rebahan bentar di sofa, pinggang programmer encok.',
    'Air galon abis siapa yang mau ganti woy?',
    'Ngemil donat di pantry sambil nunggu prompt baru.',
    'Santai dulu sejenak, sprint tadi kelar cepet.'
  ];

  public static getSpeechText(event: KeosEvent): { badge: string; quote: string; subtext: string } {
    const role = event.role;
    const cat = event.category;
    const status = event.status;

    // 1. Error / Panic condition
    if (status === 'ERROR' || event.animation === 'RAGE') {
      return {
        badge: '[PANIC_ALERT]',
        quote: this.getRandom(this.managerPanicQuotes),
        subtext: event.detail.slice(0, 30)
      };
    }

    // 2. Planning / Brainstorming
    if (cat === 'PLAN' || cat === 'SKILL' || role === 'PLANNER') {
      return {
        badge: event.badge || '[PLANNING]',
        quote: this.getRandom(this.plannerQuotes),
        subtext: event.detail.slice(0, 30)
      };
    }

    // 3. QA Testing
    if (cat === 'TEST' || role === 'QA') {
      return {
        badge: '[TEST_QA]',
        quote: this.getRandom(this.qaTestingQuotes),
        subtext: event.detail.slice(0, 30)
      };
    }

    // 4. Subagents
    if (cat === 'SUBAGENT' || role === 'SUBAGENT_WORKER') {
      return {
        badge: '[SUBAGENT]',
        quote: this.getRandom(this.subagentQuotes),
        subtext: event.detail.slice(0, 30)
      };
    }

    // 5. Dev Coding vs Reading
    if (cat === 'CODE' || role === 'DEV') {
      if (event.animation === 'ANALYZE' || event.badge.includes('READ')) {
        return {
          badge: '[RESEARCH]',
          quote: this.getRandom(this.devReadingQuotes),
          subtext: event.detail.slice(0, 30)
        };
      }
      return {
        badge: '[CODING]',
        quote: this.getRandom(this.devCodingQuotes),
        subtext: event.detail.slice(0, 30)
      };
    }

    // 6. Idle in Pantry
    if (cat === 'IDLE' || event.animation === 'COFFEE') {
      return {
        badge: '[COFFEE_BREAK]',
        quote: this.getRandom(this.pantryQuotes),
        subtext: 'Pantry Lounge'
      };
    }

    // Fallback
    return {
      badge: event.badge || '[TASK_ACTIVE]',
      quote: 'Lagi fokus ngerjain task, gaspol!',
      subtext: event.detail.slice(0, 30)
    };
  }

  private static getRandom(arr: string[]): string {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}
