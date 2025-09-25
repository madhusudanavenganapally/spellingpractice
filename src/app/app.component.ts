import { Component, NgZone } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NgIf, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  wordsInput = '';
  words: string[] = [];
  currentWordIndex = 0;
  spokenSpelling = '';
  isCorrect: boolean | null = null;
  listening = false;
  wordsSet = false;
  showCongrats = false;
  microphoneEnabled = false;

  recognition: any = null;
  recognitionStarting = false;
  silenceTimer: any = null;
  typedSpelling = ''; // Add this to the class properties


  private letterMap: Record<string, string[]> = {
    a: ['a','ay','ei'],
    b: ['b','bee','bi'],
    c: ['c','see','sea','cee'],
    d: ['d','dee','di'],
    e: ['e','ee'],
    f: ['f','ef','eff'],
    g: ['g','gee','ji'],
    h: ['h','aitch','haitch'],
    i: ['i','eye','ai'],
    j: ['j','jay'],
    k: ['k','kay'],
    l: ['l','el','ell'],
    m: ['m','em'],
    n: ['n','en'],
    o: ['o','oh','ow'],
    p: ['p','pee'],
    q: ['q','cue','queue','kyu'],
    r: ['r','ar','are'],
    s: ['s','ess'],
    t: ['t','tee'],
    u: ['u','you','yoo','yu'],
    v: ['v','vee'],
    w: ['w','doubleyou','dubya'],
    x: ['x','ex'],
    y: ['y','why'],
    z: ['z','zee','zed']
  };

  constructor(private ngZone: NgZone) {
    this.initRecognition();
  }

  private initRecognition() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('SpeechRecognition not supported in this browser.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'en-GB';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.ngZone.run(() => {
        this.listening = true;
        this.recognitionStarting = false;

        // start silence timer
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        this.silenceTimer = setTimeout(() => {
          this.ngZone.run(() => {
            if (!this.showCongrats && this.wordsSet && this.isCorrect === null) {
              this.listening = false;
              this.isCorrect = false;
              this.spokenSpelling = '';
            }
          });
          try { this.recognition.stop(); } catch(e){}
        }, 5000);
      });
    };

    this.recognition.onresult = (event: any) => {
      const transcript = (event.results[0][0].transcript || '').trim();
      this.ngZone.run(() => this.handleTranscript(transcript));
    };

    this.recognition.onend = () => {
      this.ngZone.run(() => {
        this.listening = false;
        this.recognitionStarting = false;

        if (!this.showCongrats && this.wordsSet && this.isCorrect === null) {
          // auto-restart mic
          setTimeout(() => this.startListeningSafe(), 300);
        }
      });
    };

    this.recognition.onerror = (event: any) => {
      this.ngZone.run(() => {
        this.spokenSpelling = 'Error: ' + (event?.error || 'unknown');
        this.listening = false;
        this.recognitionStarting = false;

        if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
          this.microphoneEnabled = false;
        }
      });
    };

    this.recognition.onnomatch = () => {
      this.ngZone.run(() => {
        this.isCorrect = false;
        this.spokenSpelling = '';
        this.listening = false;
      });
    };
  }

  private handleTranscript(transcript: string) {
    this.spokenSpelling = transcript;
    const expected = (this.words[this.currentWordIndex] || '').toLowerCase().replace(/[^a-z]/g, '');
    const candidates = this.interpretTranscript(transcript);

    const matched = candidates.some(c => c === expected);

    if (matched) {
      this.isCorrect = true;
      this.currentWordIndex++;

      if (this.currentWordIndex >= this.words.length) {
        this.showCongrats = true;
        this.listening = false;
        try { if (this.recognition) this.recognition.stop(); } catch(e){}
        this.speakMessage('Correct! Congratulations!');
        return;
      }

      this.speakMessage('Correct!');
      setTimeout(() => this.speakCurrentWord(() => this.startListeningSafe()), 1000);
    } else {
      this.isCorrect = false;
      this.speakMessage('Incorrect. Press Repeat to try again.');
    }
  }

  private interpretTranscript(transcript: string): string[] {
    if (!transcript) return [];
    const cleaned = transcript.toLowerCase().replace(/[^a-z\s]/g, ' ');
    const tokens = cleaned.split(/\s+/).filter(Boolean);
    const candidates: string[] = [];

    candidates.push(tokens.join(''));
    if (tokens.length) {
      const letters: string[] = [];
      let allMapped = true;
      for (const t of tokens) {
        const mapped = this.mapTokenToLetter(t);
        if (mapped) letters.push(mapped);
        else {
          if (t.length === 1 && t >= 'a' && t <= 'z') letters.push(t);
          else { allMapped = false; break; }
        }
      }
      if (allMapped && letters.length) candidates.push(letters.join(''));
    }
    return Array.from(new Set(candidates.filter(Boolean)));
  }

  private mapTokenToLetter(token: string): string | null {
    const t = token.toLowerCase();
    if (t.length === 1 && t >= 'a' && t <= 'z') return t;
    for (const [letter, variants] of Object.entries(this.letterMap)) {
      for (const v of variants) {
        if (t === v || t.startsWith(v) || v.startsWith(t)) return letter;
      }
    }
    return null;
  }

  speakCurrentWord(afterSpeak?: () => void) {
    if (!this.wordsSet || this.currentWordIndex >= this.words.length) return;
    if (!('speechSynthesis' in window)) { if (afterSpeak) afterSpeak(); return; }

    try { window.speechSynthesis.cancel(); } catch(e){}
    const utter = new SpeechSynthesisUtterance(this.words[this.currentWordIndex]);
    utter.lang = 'en-IN';
    utter.rate = 0.95;
    utter.onend = () => { setTimeout(() => { if (afterSpeak) afterSpeak(); }, 80); };
    utter.onerror = () => { setTimeout(() => { if (afterSpeak) afterSpeak(); }, 80); };
    window.speechSynthesis.speak(utter);
  }

  speakMessage(message: string) {
    if (!('speechSynthesis' in window)) return;
    try { window.speechSynthesis.cancel(); } catch(e){}
    const utter = new SpeechSynthesisUtterance(message);
    utter.lang = 'en-IN';
    utter.rate = 1;
    window.speechSynthesis.speak(utter);
  }

  startListeningSafe() {
    if (!this.recognition || this.listening || this.recognitionStarting || this.showCongrats) return;
    this.recognitionStarting = true;
    try { this.recognition.start(); } catch(err) {
      this.recognitionStarting = false;
      try { this.recognition.stop(); } catch(e){}
      setTimeout(() => { try { this.recognition.start(); } catch(e){} }, 2000);
    }
  }

  startListening() { this.startListeningSafe(); }

  async enableMic() {
    if (!navigator.mediaDevices?.getUserMedia) { alert('Microphone not supported'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      this.microphoneEnabled = true;
      this.speakMessage('Microphone enabled');
    } catch(e) { this.microphoneEnabled = false; alert('Microphone permission denied'); }
  }

  repeatWord() {
    if (!this.wordsSet) return;
    this.isCorrect = null;
    this.spokenSpelling = '';
    this.typedSpelling = '';
    this.speakCurrentWord(() => this.startListeningSafe());
  }

  addWords() {
    this.words = this.wordsInput.split(',').map(w => w.trim()).filter(Boolean);
    if (!this.words.length) return;

    this.wordsSet = true;
    this.currentWordIndex = 0;
    this.isCorrect = null;
    this.spokenSpelling = '';
    this.listening = false;
    this.showCongrats = false;

    this.speakCurrentWord(() => setTimeout(() => this.startListeningSafe(), 200));
  }

  reset() {
    this.wordsInput = '';
    this.words = [];
    this.wordsSet = false;
    this.currentWordIndex = 0;
    this.spokenSpelling = '';
    this.isCorrect = null;
    this.listening = false;
    this.showCongrats = false;
    this.microphoneEnabled = false;
  }

  playAgain() { this.reset(); }
  checkTyped() {
  if (!this.wordsSet) return;

  const typed = (this.typedSpelling || '').toLowerCase().replace(/[^a-z]/g, '');
  const expected = (this.words[this.currentWordIndex] || '').toLowerCase().replace(/[^a-z]/g, '');

  if (typed === expected) {
    this.isCorrect = true;
    this.currentWordIndex++;
    this.typedSpelling = '';

    if (this.currentWordIndex >= this.words.length) {
      this.showCongrats = true;
      this.listening = false;
      this.speakMessage('Correct! Congratulations!');
      return;
    }

    this.speakMessage('Correct!');
    setTimeout(() => this.speakCurrentWord(() => this.startListeningSafe()), 800);
  } else {
    this.isCorrect = false;
    this.speakMessage('Incorrect. Try again.');
  }
}


}
